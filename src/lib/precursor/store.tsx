"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { emptySandbox, runAction, type ActionArgs, type ActionName, type Receipt, type ReceiptDraft } from "./actions";
import { useAuth } from "./auth";
import { uid } from "./ids";
import { NETWORK } from "./network";
import type { Sandbox } from "./types";

export type { Receipt } from "./actions";

/*
 * Shared state for the Console, Portfolio and Explorer, loaded from the
 * Precursor API (and through it, Supabase). An action runs here first, so the
 * interface answers at once, then the server runs it again against the
 * database, authorizes it and saves it. The server's state replaces the local
 * one when it answers, and a refused action rolls back.
 */

const COMPANY_KEY = "precursor.company";

export interface Viewer {
  /** The company the Console is administering. */
  companyId: string;
  /** The signed-in user's holder record, shown in Portfolio. */
  holderId: string;
}

export interface Me {
  holderId: string;
  companyIds: string[];
  email: string | null;
}

type Status = "loading" | "ready" | "error";

type Actions = {
  [N in Exclude<ActionName, "inviteHolder">]: (...args: ActionArgs[N]) => Receipt;
} & {
  /** Invites a holder to the company the Console is administering. */
  inviteHolder: (input: Omit<ActionArgs["inviteHolder"][0], "companyId">) => Receipt;
};

interface SandboxApi extends Actions {
  s: Sandbox;
  now: number;
  viewer: Viewer;
  me: Me | null;
  status: Status;
  error: string | null;
  /** True while an action is being saved. */
  saving: boolean;
  setViewer: (v: Partial<Pick<Viewer, "companyId">>) => void;
  receipts: Receipt[];
  dismiss: (id: string) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SandboxApi | null>(null);

export function useSandbox(): SandboxApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSandbox needs a SandboxProvider ancestor");
  return ctx;
}

const noopSubscribe = () => () => {};
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function readCompany(): string {
  try {
    return localStorage.getItem(COMPANY_KEY) ?? "";
  } catch {
    return "";
  }
}

interface StateResponse {
  sandbox?: Sandbox;
  me?: Me | null;
  receipt?: ReceiptDraft;
  companyId?: string;
  error?: string;
}

const ACTION_NAMES: ActionName[] = [
  "createCompany",
  "createShareClass",
  "subscribe",
  "createOffering",
  "closeOffering",
  "cancelOffering",
  "openWindow",
  "placeOrder",
  "cancelOrder",
  "clearWindow",
  "cancelWindow",
  "fundDistribution",
  "claimDistribution",
  "createProposal",
  "castVote",
  "finalizeProposal",
  "anchorDocument",
  "publishValuation",
  "setModule",
  "setPaused",
  "setRfq",
  "inviteHolder",
  "verifyIdentity",
  "issueShares",
  "transfer",
];

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [s, setS] = useState<Sandbox>(() => emptySandbox(NETWORK));
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string>(readCompany);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [pending, setPending] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const ref = useRef(s);
  const pendingRef = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  const accept = useCallback((body: StateResponse) => {
    if (body.sandbox) {
      ref.current = body.sandbox;
      setS(body.sandbox);
    }
    if (body.me !== undefined) setMe(body.me);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/precursor/state", { headers: await authRef.current.headers(), cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as StateResponse;
      if (!res.ok) throw new Error(body.error ?? `The server answered with status ${res.status}.`);
      // A save in flight will bring fresher state, so a background read never overwrites it.
      if (pendingRef.current === 0) accept(body);
      setStatus("ready");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The data could not be loaded.");
      setStatus((prev) => (prev === "ready" ? prev : "error"));
    }
  }, [accept]);

  // Load once Privy knows whether there is a session, and again whenever it changes.
  useEffect(() => {
    if (!auth.ready) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [auth.ready, auth.authenticated, refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const companyId = me?.companyIds.includes(chosen) ? chosen : (me?.companyIds[0] ?? "");
  const viewer = useMemo<Viewer>(() => ({ companyId, holderId: me?.holderId ?? "" }), [companyId, me]);
  const viewerRef = useRef(viewer);
  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);

  const setViewer = useCallback((v: Partial<Pick<Viewer, "companyId">>) => {
    if (!v.companyId) return;
    setChosen(v.companyId);
    try {
      localStorage.setItem(COMPANY_KEY, v.companyId);
    } catch {
      /* storage unavailable: the choice lasts for this visit */
    }
  }, []);

  const push = useCallback((r: ReceiptDraft): Receipt => {
    const receipt = { ...r, id: uid("rcpt") };
    setReceipts((list) => [receipt, ...list].slice(0, 4));
    return receipt;
  }, []);

  const dismiss = useCallback((id: string) => setReceipts((list) => list.filter((r) => r.id !== id)), []);

  const save = useCallback(
    (name: ActionName, args: unknown[], rollback: Sandbox) => {
      pendingRef.current += 1;
      setPending((n) => n + 1);
      queue.current = queue.current.then(async () => {
        try {
          const res = await fetch("/api/precursor/action", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await authRef.current.headers()) },
            body: JSON.stringify({ name, args }),
          });
          const body = (await res.json().catch(() => ({}))) as StateResponse;
          if (!res.ok) throw new Error(body.error ?? `The server answered with status ${res.status}.`);
          if (body.receipt && !body.receipt.ok) push({ ...body.receipt, title: `Not saved: ${body.receipt.title}` });
          if (body.companyId) setViewer({ companyId: body.companyId });
          accept(body);
        } catch (e) {
          ref.current = rollback;
          setS(rollback);
          push({ ok: false, title: "Not saved", detail: e instanceof Error ? e.message : "The change could not be saved. Try again." });
          void refresh();
        } finally {
          pendingRef.current -= 1;
          setPending((n) => n - 1);
        }
      });
    },
    [accept, push, refresh, setViewer]
  );

  const run = useCallback(
    (name: ActionName, args: unknown[]): Receipt => {
      if (!authRef.current.authenticated) {
        authRef.current.login();
        return push({ ok: false, title: "Sign in to continue", detail: "Actions are recorded against your identity, so sign in first." });
      }
      const before = ref.current;
      const out = runAction(before, name, args as ActionArgs[typeof name], { now: Date.now(), block: before.block + 1 });
      const receipt = push(out.receipt);
      if (!out.next) return receipt;
      ref.current = out.next;
      setS(out.next);
      save(name, args, before);
      return receipt;
    },
    [push, save]
  );

  const actions = useMemo(() => {
    const out = {} as Record<string, (...args: unknown[]) => Receipt>;
    for (const name of ACTION_NAMES) out[name] = (...args: unknown[]) => run(name, args);
    out.inviteHolder = (input: unknown) => run("inviteHolder", [{ ...(input as object), companyId: viewerRef.current.companyId }]);
    return out as unknown as Actions;
  }, [run]);

  const api = useMemo<SandboxApi>(
    () => ({ ...actions, s, now, viewer, me, status, error, saving: pending > 0, setViewer, receipts, dismiss, refresh }),
    [actions, s, now, viewer, me, status, error, pending, setViewer, receipts, dismiss, refresh]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
