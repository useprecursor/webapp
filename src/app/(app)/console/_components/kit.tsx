"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button, type Tone } from "@/components/app/ui";
import { useSandbox } from "@/lib/precursor/store";
import { byId, classesOf, identityStatus, isEmployeeOf, shortHex } from "@/lib/precursor/engine";
import type { Holder, HolderKind, LiquidityWindow, Offering, Sandbox } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

/*
 * Small pieces shared by the Console pages: the administered company, holder
 * cells, mono call hints, key/value rows, date helpers and confirmations.
 */

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

/** The shared state plus the company the Console administers and its share classes. */
export function useConsole() {
  const api = useSandbox();
  // The Console renders only once the signed-in user administers a company (see ConsoleGate).
  const company = byId(api.s.companies, api.viewer.companyId)!;
  const classes = classesOf(api.s, company.id);
  return { ...api, company, classes };
}

export const KIND_LABEL: Record<HolderKind, string> = {
  founder: "Founder",
  employee: "Employee",
  investor: "Investor",
  fund: "Fund",
  treasury: "Treasury",
};

export const IDENTITY_BADGE: Record<ReturnType<typeof identityStatus>, { tone: Tone; label: string }> = {
  VERIFIED: { tone: "leaf", label: "Verified" },
  CLAIM_EXPIRED: { tone: "amber", label: "Claim expired" },
  NOT_VERIFIED: { tone: "rose", label: "Not verified" },
};

export const OFFERING_TONE: Record<Offering["status"], Tone> = { OPEN: "lagoon", SCHEDULED: "muted", CLOSED: "leaf", FAILED: "rose" };
export const WINDOW_TONE: Record<LiquidityWindow["status"], Tone> = { OPEN: "lagoon", SCHEDULED: "muted", CLEARED: "leaf", CANCELLED: "rose" };

/** The contract call a control maps to, set in small mono. */
export function Call({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("break-all font-mono text-[11px] leading-relaxed text-fog", className)}>{children}</p>;
}

/** A square initial tile, for companies and holders. */
export function Initial({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[9px] border border-line bg-haze-2 font-semibold text-navy", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

export function HolderCell({ holder, sub }: { holder: Holder | undefined; sub?: React.ReactNode }) {
  if (!holder) return <span className="text-fog">Unknown holder</span>;
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Initial name={holder.name} size={28} />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium text-navy">{holder.name}</span>
        <span className="block truncate font-mono text-[11px] text-fog">{sub ?? `${KIND_LABEL[holder.kind]} · ${shortHex(holder.wallets[0])}`}</span>
      </span>
    </span>
  );
}

/** A hash or address, shortened, with the full value on hover. */
export function Hex({ value, className }: { value: string; className?: string }) {
  return (
    <span title={value} className={cn("readout font-mono text-[12px] text-tide", className)}>
      {shortHex(value)}
    </span>
  );
}

/** A definition list of label and value rows. */
export function KV({ rows, className }: { rows: { label: string; value: React.ReactNode; mono?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line-soft", className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-[13px] text-fog">{r.label}</dt>
          <dd className={cn("min-w-0 text-right text-[13.5px] text-navy", r.mono && "readout font-mono text-[12.5px]")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A mono uppercase label above a group. */
export function Caption({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("caption mb-2.5", className)}>{children}</p>;
}

export function Num({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("readout font-mono text-[13px] text-navy", className)}>{children}</span>;
}

/** A link styled as a quiet button. */
export function LinkButton({ href, children, variant = "secondary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Link href={href} className={cn("btn btn-sm", variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : "btn-secondary")}>
      {children}
    </Link>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-tide transition-colors hover:text-navy">
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

/** Parses a typed number, ignoring thousands separators. NaN when empty. */
export function num(v: string): number {
  const t = v.replace(/,/g, "").trim();
  return t === "" ? NaN : Number(t);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A timestamp as the value of a date input, in local time. */
export function toDateInput(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A date input as a timestamp. A start on today's date means now, so the
 * action opens immediately; an end means the close of that day.
 */
export function fromDateInput(v: string, now: number, edge: "start" | "end"): number {
  if (!v) return NaN;
  if (edge === "start" && v === toDateInput(now)) return now;
  return new Date(`${v}T${edge === "start" ? "00:00:00" : "23:59:00"}`).getTime();
}

/**
 * The holders on this company's registry: anyone it invited, anyone holding
 * its shares, its employees, anyone who has subscribed or placed an order,
 * and the signed-in admin.
 */
export function registryOf(s: Sandbox, companyId: string, now: number): Holder[] {
  const own = new Set(classesOf(s, companyId).map((c) => c.id));
  const affiliated = new Map<string, Set<string>>();
  const tie = (holderId: string, cmp: string) => {
    if (!affiliated.has(holderId)) affiliated.set(holderId, new Set());
    affiliated.get(holderId)!.add(cmp);
  };
  for (const l of s.lots) {
    const cls = byId(s.classes, l.classId);
    if (cls) tie(l.holderId, cls.companyId);
  }
  for (const o of s.offerings) for (const x of o.subscriptions) tie(x.holderId, o.companyId);
  for (const w of s.windows) for (const x of w.orders) tie(x.holderId, w.companyId);
  return s.holders.filter((h) => {
    if (isEmployeeOf(h, companyId, now)) return true;
    if (h.kind === "treasury") return h.companyId === companyId || s.lots.some((l) => l.holderId === h.id && own.has(l.classId));
    // The company's own invitees and affiliates, plus the signed-in admin so they can issue to themselves.
    return h.companyId === companyId || h.self === true || !!affiliated.get(h.id)?.has(companyId);
  });
}

/** A button that asks once before running a consequential action. */
export function Confirm({
  label,
  confirmLabel,
  message,
  onConfirm,
  variant = "secondary",
  disabled,
  icon,
}: {
  label: string;
  confirmLabel?: string;
  message: React.ReactNode;
  onConfirm: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant={variant} className="btn-sm" disabled={disabled} onClick={() => setAsking(true)}>
        {icon}
        {label}
      </Button>
    );
  }
  return (
    <div className="w-full rounded-2xl border border-line bg-haze/70 p-4">
      <div className="text-[13px] leading-relaxed text-tide">{message}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          className="btn-sm"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel ?? label}
        </Button>
        <Button variant="ghost" className="btn-sm" onClick={() => setAsking(false)}>
          Keep as is
        </Button>
      </div>
    </div>
  );
}

/** A horizontal bar for weights and depth, with an optional marker. */
export function Bar({ value, max, tone = "lagoon", marker, className }: { value: number; max: number; tone?: "lagoon" | "leaf" | "amber" | "rose" | "muted"; marker?: number; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = {
    lagoon: "bg-[linear-gradient(90deg,#8d97aa,#ffffff)]",
    leaf: "bg-leaf/80",
    amber: "bg-amber/80",
    rose: "bg-rose/80",
    muted: "bg-pale",
  }[tone];
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-haze-2", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${pct}%` }} />
      {marker !== undefined && max > 0 && (
        <span aria-hidden="true" className="absolute inset-y-[-2px] w-px bg-navy/70" style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} />
      )}
    </div>
  );
}

/** A stack of form fields with a footer for the submit row. */
export function FormFooter({ children, call }: { children: React.ReactNode; call?: string }) {
  return (
    <div className="mt-6 border-t border-line-soft pt-5">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {call && <Call className="mt-3">{call}</Call>}
    </div>
  );
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <ul className="mt-4 space-y-1 text-[12.5px] text-amber-deep">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

/** A row of small checkboxes for claim topics or classes. */
export function Checks<T extends string>({ options, value, onChange }: { options: { value: T; label: string; hint?: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <label key={o.value} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors", on ? "border-lagoon-line bg-lagoon-faint" : "border-line hover:border-[rgb(255_255_255/0.16)]")}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className="mt-0.5 size-4 accent-[#e6ebf4]"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-navy">{o.label}</span>
              {o.hint && <span className="mt-0.5 block font-mono text-[11px] text-fog">{o.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
