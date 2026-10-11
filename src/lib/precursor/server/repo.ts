import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addr, uid } from "../ids";
import { shortHex } from "../engine";
import { CHAIN_RPC, NETWORK } from "../network";
import type { Holder, Sandbox } from "../types";
import type { Actor } from "./auth";
import { ApiError } from "./http";
import { diffTables, fromRows, TABLES, toRows, type Row, type TableName, type Tables } from "./rows";

/*
 * Reads and writes the Precursor tables with the service-role key. Row level
 * security is on for every table with no policies, so the browser can never
 * reach the data directly; everything goes through these functions, which
 * the API routes call after verifying the Privy session.
 */

let db: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.", 500);
  if (key.startsWith("sb_publishable_")) throw new ApiError("SUPABASE_SERVICE_ROLE_KEY holds a publishable key. Use the secret service-role key.", 500);
  db ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return db;
}

function fail(what: string, error: { message: string; code?: string } | null): never {
  if (error?.code === "42P01" || error?.code === "PGRST205" || /does not exist|schema cache/i.test(error?.message ?? ""))
    throw new ApiError("The Precursor tables are missing. Run supabase/schema.sql in the Supabase SQL editor.", 503);
  throw new ApiError(`Could not ${what}: ${error?.message ?? "unknown error"}`, 500);
}

const PAGE = 1000;
async function selectAll(name: TableName): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase().from(name).select("*").order("id").range(from, from + PAGE - 1);
    if (error) fail(`read ${name}`, error);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) return out;
  }
}

export interface Snapshot {
  version: number;
  sandbox: Sandbox;
}

/** Loads every table. The version is read first, so a write that lands mid-read makes the later apply fail and retry. */
export async function loadSnapshot(): Promise<Snapshot> {
  const { data, error } = await supabase().from("app_state").select("version").eq("id", 1).maybeSingle();
  if (error) fail("read the state version", error);
  const lists = await Promise.all(TABLES.map(selectAll));
  const tables = Object.fromEntries(TABLES.map((t, i) => [t, lists[i]])) as Tables;
  return { version: Number(data?.version ?? 0), sandbox: fromRows(tables, NETWORK) };
}

export class Conflict extends Error {}

export type Changes = ReturnType<typeof diffTables>;

/** The rows that turn one state into the other. */
export function planChanges(before: Sandbox, after: Sandbox): Changes {
  return diffTables(toRows(before), toRows(after));
}

/** Writes a set of changes in one transaction, if nothing else has written since `version`. */
export async function applyChanges(version: number, { upserts, deletes }: Changes) {
  const { error } = await supabase().rpc("apply_changes", {
    expected_version: version,
    upserts,
    deletes: Object.fromEntries(Object.entries(deletes).map(([t, rows]) => [t, rows.map((r) => r.id)])),
  });
  if (error) {
    if (/version conflict/i.test(error.message)) throw new Conflict();
    fail("save the change", error);
  }
}

export interface Me {
  holderId: string;
  companyIds: string[];
  email: string | null;
}

/**
 * Finds the holder record for a Privy user, creating one on first sign-in.
 * A holder a company invited by wallet address is claimed by the user who
 * owns that wallet, so their shares are waiting for them.
 */
export async function ensureMe(actor: Actor, s: Sandbox): Promise<Me> {
  const sb = supabase();
  const [{ data: account, error: e1 }, { data: members, error: e2 }] = await Promise.all([
    sb.from("accounts").select("holder_id").eq("user_id", actor.userId).maybeSingle(),
    sb.from("company_members").select("company_id").eq("user_id", actor.userId),
  ]);
  if (e1) fail("read your account", e1);
  if (e2) fail("read your companies", e2);
  const companyIds = (members ?? []).map((m) => String(m.company_id));

  if (account?.holder_id) return { holderId: String(account.holder_id), companyIds, email: actor.email };

  const { data: taken } = await sb.from("accounts").select("holder_id");
  const claimed = new Set((taken ?? []).map((r) => String(r.holder_id)));
  const invited = s.holders.find((h) => h.kind !== "treasury" && !claimed.has(h.id) && h.wallets.some((w) => actor.wallets.includes(w.toLowerCase())));

  let holderId = invited?.id;
  if (!holderId) {
    holderId = uid("hld");
    const now = Date.now();
    const holder: Holder = {
      id: holderId,
      name: actor.email?.split("@")[0] ?? `Holder ${shortHex(actor.wallets[0] ?? holderId)}`,
      kind: "investor",
      identity: addr(`identity:${holderId}`),
      wallets: (actor.wallets.length ? actor.wallets : [addr(`wallet:${holderId}`)]) as Holder["wallets"],
      region: "",
      tier: 0,
      joinedAt: now,
      claims: [],
    };
    const row = toRows({ ...s, holders: [holder] }).holders[0];
    const { error } = await sb.from("holders").insert(row);
    if (error) fail("create your identity", error);
    s.holders.push(holder);
  }
  const { error } = await sb.from("accounts").insert({ user_id: actor.userId, holder_id: holderId, email: actor.email });
  if (error && error.code !== "23505") fail("link your account", error);
  if (error) {
    const { data } = await sb.from("accounts").select("holder_id").eq("user_id", actor.userId).single();
    holderId = String(data?.holder_id ?? holderId);
  }
  return { holderId, companyIds, email: actor.email };
}

export async function addMember(companyId: string, userId: string) {
  const { error } = await supabase().from("company_members").insert({ company_id: companyId, user_id: userId, role: "owner" });
  if (error) fail("make you the company's admin", error);
}

/**
 * The state as a given viewer may see it. Everything on-chain stays public,
 * but holder names are visible only to the holder themselves and to the
 * companies they hold or were invited by. Everyone else sees a wallet.
 */
export function visibleTo(s: Sandbox, me: Me | null): Sandbox {
  const admin = new Set(me?.companyIds ?? []);
  const classCompany = new Map(s.classes.map((c) => [c.id, c.companyId]));
  const related = new Set<string>();
  for (const l of s.lots) if (admin.has(classCompany.get(l.classId) ?? "")) related.add(l.holderId);
  for (const o of s.offerings) if (admin.has(o.companyId)) o.subscriptions.forEach((x) => related.add(x.holderId));
  for (const w of s.windows) if (admin.has(w.companyId)) w.orders.forEach((o) => related.add(o.holderId));

  const hidden: { name: string; label: string }[] = [];
  const holders = s.holders.map((h) => {
    const self = h.id === me?.holderId;
    const visible = self || h.kind === "treasury" || (h.companyId && admin.has(h.companyId)) || related.has(h.id);
    if (visible) return self ? { ...h, self: true } : h;
    const label = `Holder ${shortHex(h.wallets[0] ?? h.identity)}`;
    if (h.name) hidden.push({ name: h.name, label });
    return { ...h, name: label };
  });
  hidden.sort((a, b) => b.name.length - a.name.length);
  const scrub = (text: string) => hidden.reduce((t, x) => (t.includes(x.name) ? t.split(x.name).join(x.label) : t), text);
  return { ...s, holders, events: s.events.map((e) => ({ ...e, summary: scrub(e.summary) })) };
}

let lastBlock = { value: 0, at: 0 };

/** The latest block on the configured chain, so recorded events line up with it. Cached for ten seconds. */
export async function latestBlock(fallback: number): Promise<number> {
  if (!CHAIN_RPC) return fallback;
  if (Date.now() - lastBlock.at < 10_000) return Math.max(lastBlock.value, fallback);
  try {
    const res = await fetch(CHAIN_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: string };
    const n = body.result ? Number.parseInt(body.result, 16) : NaN;
    if (!Number.isFinite(n)) return fallback;
    lastBlock = { value: n, at: Date.now() };
    return Math.max(n, fallback);
  } catch {
    return fallback;
  }
}
