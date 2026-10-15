"use client";

/*
 * Shared pieces for the Portfolio, Explorer and Account pages: company marks,
 * position maths, plain-language rule summaries, and the public scrubbing the
 * Explorer applies to event text.
 */

import { CheckCircle2, XCircle } from "lucide-react";
import {
  breakdown,
  byId,
  entitlement,
  holdersOf,
  latestValuation,
  shortHex,
  type BalanceBreakdown,
  REASON_TEXT,
} from "@/lib/precursor/engine";
import type { Company, ModuleConfig, ReasonCode, Sandbox, ShareClass, Valuation } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

export const DAY = 86_400_000;

/* ------------------------------------------------------------------ */
/* Positions                                                           */
/* ------------------------------------------------------------------ */

export interface Position {
  cls: ShareClass;
  company: Company;
  b: BalanceBreakdown;
  valuation?: Valuation;
  price: number;
  value: number;
  unlockedValue: number;
}

/** Every share class a holder has a balance in, valued at the latest Reference Valuation. */
export function positionsOf(s: Sandbox, holderId: string, now: number): Position[] {
  const out: Position[] = [];
  for (const cls of s.classes) {
    const b = breakdown(s, cls.id, holderId, now);
    if (b.balance <= 0) continue;
    const company = byId(s.companies, cls.companyId);
    if (!company) continue;
    const valuation = latestValuation(s, cls.id);
    const price = valuation?.price ?? 0;
    out.push({ cls, company, b, valuation, price, value: b.balance * price, unlockedValue: b.unlocked * price });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function claimableTotal(s: Sandbox, holderId: string): number {
  return s.distributions.reduce((sum, d) => sum + entitlement(s, d, holderId).claimable, 0);
}

/** Splits a balance into segments that sum to the balance, for a stacked bar. */
export function segmentsOf(b: BalanceBreakdown) {
  const frozen = Math.min(b.frozen, b.balance);
  const inOrders = Math.min(b.inOrders, b.balance - frozen);
  const timeLocked = Math.max(0, b.balance - b.unlocked - frozen - inOrders);
  const unvested = Math.min(b.unvested, timeLocked);
  const held = timeLocked - unvested;
  return { unlocked: b.unlocked, held, unvested, inOrders, frozen };
}

export const SEGMENT_META = {
  unlocked: { label: "Unlocked", color: "#f4f5f7" },
  held: { label: "Holding period", color: "#f2a93b" },
  unvested: { label: "Unvested", color: "#8e94a0" },
  inOrders: { label: "In open orders", color: "#b8c2d3" },
  frozen: { label: "Frozen", color: "#f0596b" },
} as const;

export type SegmentKey = keyof typeof SEGMENT_META;

export function StackedBar({ parts, total, className }: { parts: Partial<Record<SegmentKey, number>>; total: number; className?: string }) {
  const keys = Object.keys(SEGMENT_META) as SegmentKey[];
  return (
    <div className={cn("flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-haze-2", className)} aria-hidden="true">
      {total > 0 &&
        keys.map((k) => {
          const v = parts[k] ?? 0;
          if (v <= 0) return null;
          return <span key={k} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(v / total) * 100}%`, background: SEGMENT_META[k].color }} />;
        })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marks and small pieces                                              */
/* ------------------------------------------------------------------ */

export function CompanyMark({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] border border-line bg-[linear-gradient(180deg,rgb(255_255_255/0.09),rgb(255_255_255/0.02))] font-display font-semibold text-navy shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** The contract call a control maps to, set small in mono. */
export function CallLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("truncate font-mono text-[11px] text-fog", className)}>{children}</p>;
}

/** A label and value pair for definition lists inside cards and drawers. */
export function KV({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2", className)}>
      <dt className="shrink-0 text-[13px] text-fog">{label}</dt>
      <dd className="min-w-0 text-right text-[13.5px] text-navy">{children}</dd>
    </div>
  );
}

/** A check result line: a pass in green, a block in rose, with the reason code. */
export function CheckLine({ ok, reason, text, className }: { ok: boolean; reason: ReasonCode | string; text?: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl px-3 py-2.5", ok ? "bg-leaf-soft" : "bg-rose-soft", className)}>
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-deep" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-deep" aria-hidden="true" />}
      <div className="min-w-0">
        <p className={cn("font-mono text-[11.5px] font-medium tracking-[0.04em]", ok ? "text-leaf-deep" : "text-rose-deep")}>{reason}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-navy">{text ?? REASON_TEXT[reason as ReasonCode] ?? ""}</p>
      </div>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-3 first:mt-0">
      <p className="caption">{children}</p>
      {aside}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rules in plain language                                             */
/* ------------------------------------------------------------------ */

export function moduleSentence(s: Sandbox, cls: ShareClass, c: ModuleConfig): string {
  switch (c.id) {
    case "REGION":
      return c.mode === "allow"
        ? `Holders must be in one of ${c.regions.length} regions: ${c.regions.join(", ")}.`
        : `Holders in ${c.regions.join(", ")} cannot receive shares.`;
    case "ELIGIBILITY":
      return `Recipients need eligibility tier ${c.minimumTier} or higher${c.exemptEmployees ? ". Employees of the company are exempt" : ""}.`;
    case "HOLDING_PERIOD":
      return `Each lot is held for ${c.days} days after it is acquired before it can move.`;
    case "HOLDER_CAP":
      return `At most ${c.maxHolders.toLocaleString("en-US")} holders. ${holdersOf(s, cls.id).length.toLocaleString("en-US")} hold shares today.`;
    case "TRANSFER_WINDOW":
      return `Direct transfers settle only inside scheduled windows${c.allowDuringLiquidityWindows ? ". Liquidity Windows count as open" : ""}.`;
    case "ROFR":
      return `${c.holder} has first refusal on direct transfers, with ${c.noticeDays} days of notice. Liquidity Windows and RFQ are exempt.`;
    case "MAX_OWNERSHIP":
      return `No single holder may own more than ${(c.maxBps / 100).toFixed(c.maxBps % 100 ? 2 : 0)}% of the class.`;
    case "EMPLOYEE_VESTING":
      return `Unvested employee shares stay locked until they vest${c.accelerationEnabled ? ". The company can accelerate a grant" : ""}.`;
  }
}

/* ------------------------------------------------------------------ */
/* Public scrubbing                                                    */
/* ------------------------------------------------------------------ */

/** Replaces holder names in event text with shortened wallet addresses, for public views. */
export function publicText(s: Sandbox, text: string): string {
  let out = text;
  const list = [...s.holders].filter((h) => h.kind !== "treasury").sort((a, b) => b.name.length - a.name.length);
  for (const h of list) {
    if (out.includes(h.name)) out = out.split(h.name).join(shortHex(h.wallets[0]));
  }
  return out;
}

export function isoDate(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}
