import type {
  Claim,
  ClaimTopic,
  Distribution,
  Grant,
  Holder,
  LiquidityWindow,
  ModuleConfig,
  ModuleId,
  Proposal,
  ReasonCode,
  Sandbox,
  ShareClass,
  Valuation,
} from "./types";

/*
 * The rules the contracts enforce, computed the same way in TypeScript so the
 * Console, Portfolio and Explorer can preview any transfer before it is sent.
 * canTransfer runs its checks in the order PrecursorShareToken does and
 * returns the same reason codes.
 */

const DAY = 86_400_000;

export const REASON_TEXT: Record<ReasonCode, string> = {
  OK: "The transfer passes every rule on this share class.",
  TOKEN_PAUSED: "Transfers are paused on this share class.",
  FROZEN: "Part of the sender's balance is frozen, or a recovery is pending.",
  INSUFFICIENT_UNLOCKED_BALANCE: "The sender does not hold enough unlocked shares.",
  SENDER_NOT_VERIFIED: "The sender has no verified identity on this company's registry.",
  RECIPIENT_NOT_VERIFIED: "The recipient has no verified identity on this company's registry.",
  CLAIM_EXPIRED: "A required claim has expired and needs to be renewed.",
  REGION_BLOCKED: "The recipient's region is not permitted for this share class.",
  NOT_ELIGIBLE: "The recipient does not meet the eligibility tier for this share class.",
  HOLDING_PERIOD_ACTIVE: "Some of these shares are still inside their holding period.",
  HOLDER_CAP_REACHED: "The share class has reached its maximum number of holders.",
  WINDOW_CLOSED: "Transfers are only allowed during scheduled windows.",
  ROFR_PENDING: "The company's right of first refusal has not been waived or expired.",
  MAX_OWNERSHIP_EXCEEDED: "The recipient would exceed the maximum ownership for this class.",
  UNVESTED: "Some of these shares have not vested yet.",
};

export const MODULE_META: Record<ModuleId, { name: string; contract: string; reason: ReasonCode; summary: string }> = {
  REGION: { name: "Region", contract: "RegionModule", reason: "REGION_BLOCKED", summary: "Allow or block holders by region." },
  ELIGIBILITY: { name: "Eligibility", contract: "EligibilityModule", reason: "NOT_ELIGIBLE", summary: "Require a minimum eligibility tier to receive shares." },
  HOLDING_PERIOD: { name: "Holding period", contract: "HoldingPeriodModule", reason: "HOLDING_PERIOD_ACTIVE", summary: "Lock each lot for a period after it is acquired." },
  HOLDER_CAP: { name: "Holder cap", contract: "HolderCapModule", reason: "HOLDER_CAP_REACHED", summary: "Limit the number of distinct holders." },
  TRANSFER_WINDOW: { name: "Transfer windows", contract: "TransferWindowModule", reason: "WINDOW_CLOSED", summary: "Only allow transfers inside scheduled windows." },
  ROFR: { name: "Right of first refusal", contract: "ROFRModule", reason: "ROFR_PENDING", summary: "Give the company first refusal on direct transfers." },
  MAX_OWNERSHIP: { name: "Maximum ownership", contract: "MaxOwnershipModule", reason: "MAX_OWNERSHIP_EXCEEDED", summary: "Cap any single holder's share of the class." },
  EMPLOYEE_VESTING: { name: "Employee vesting", contract: "EmployeeVestingModule", reason: "UNVESTED", summary: "Lock unvested employee shares until they vest." },
};

export const CLAIM_LABEL: Record<ClaimTopic, string> = {
  IDENTITY_VERIFIED: "Identity verified",
  INVESTOR_ELIGIBLE: "Investor eligibility",
  REGION: "Region",
  EMPLOYEE_OF: "Employee",
  SCREENED: "Screening",
  VENUE: "Approved venue",
};

export const DOCUMENT_LABEL = {
  SHARE_CLASS_TERMS: "Share class terms",
  OFFERING_DOCUMENT: "Offering document",
  FINANCIAL_STATEMENT: "Financial statement",
  COMPANY_UPDATE: "Company update",
  BOARD_RESOLUTION: "Board resolution",
  VALUATION_REPORT: "Valuation report",
} as const;

export const VALUATION_SOURCE_LABEL: Record<Valuation["source"], string> = {
  PRICED_ROUND: "Priced round",
  INDEPENDENT_VALUATION: "Independent valuation",
  WINDOW_CLEARING: "Window clearing",
};

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export const byId = <T extends { id: string }>(list: T[], id: string | undefined): T | undefined =>
  id ? list.find((x) => x.id === id) : undefined;

export function classesOf(s: Sandbox, companyId: string): ShareClass[] {
  return s.classes.filter((c) => c.companyId === companyId);
}

export function moduleConfig<T extends ModuleId>(cls: ShareClass, id: T): Extract<ModuleConfig, { id: T }> | undefined {
  const m = cls.modules.find((x) => x.enabled && x.config.id === id);
  return m?.config as Extract<ModuleConfig, { id: T }> | undefined;
}

export function validClaim(h: Holder, topic: ClaimTopic, now: number): Claim | undefined {
  return h.claims.find((c) => c.topic === topic && c.expiresAt > now);
}

export function claimState(h: Holder, topic: ClaimTopic, now: number): "valid" | "expiring" | "expired" | "missing" {
  const c = h.claims.find((x) => x.topic === topic);
  if (!c) return "missing";
  if (c.expiresAt <= now) return "expired";
  if (c.expiresAt - now < 60 * DAY) return "expiring";
  return "valid";
}

export type IdentityStatus = "VERIFIED" | "CLAIM_EXPIRED" | "NOT_VERIFIED";

/** IdentityRegistry.status: verified needs a live identity claim and a live screening claim. */
export function identityStatus(h: Holder | undefined, now: number): IdentityStatus {
  if (!h) return "NOT_VERIFIED";
  const id = h.claims.find((c) => c.topic === "IDENTITY_VERIFIED");
  const screened = h.claims.find((c) => c.topic === "SCREENED");
  if (!id || !screened) return "NOT_VERIFIED";
  if (id.expiresAt <= now || screened.expiresAt <= now) return "CLAIM_EXPIRED";
  return "VERIFIED";
}

export function isEmployeeOf(h: Holder, companyId: string, now: number): boolean {
  return h.claims.some((c) => c.topic === "EMPLOYEE_OF" && c.value === companyId && c.expiresAt > now);
}

/* ------------------------------------------------------------------ */
/* Balances                                                            */
/* ------------------------------------------------------------------ */

export function balanceOf(s: Sandbox, classId: string, holderId: string): number {
  return s.lots.reduce((sum, l) => (l.classId === classId && l.holderId === holderId ? sum + l.quantity : sum), 0);
}

export function totalSupply(s: Sandbox, classId: string): number {
  return s.lots.reduce((sum, l) => (l.classId === classId ? sum + l.quantity : sum), 0);
}

export function holdersOf(s: Sandbox, classId: string): { holder: Holder; balance: number }[] {
  const totals = new Map<string, number>();
  for (const l of s.lots) if (l.classId === classId) totals.set(l.holderId, (totals.get(l.holderId) ?? 0) + l.quantity);
  return [...totals.entries()]
    .filter(([, b]) => b > 0)
    .map(([id, balance]) => ({ holder: byId(s.holders, id)!, balance }))
    .filter((x) => x.holder)
    .sort((a, b) => b.balance - a.balance);
}

export function vestedOf(g: Grant, now: number): number {
  if (g.accelerated) return g.total;
  const elapsed = (now - g.start) / DAY;
  if (elapsed < g.cliffDays) return 0;
  if (elapsed >= g.durationDays) return g.total;
  return Math.floor((g.total * elapsed) / g.durationDays);
}

export function unvestedOf(s: Sandbox, classId: string, holderId: string, now: number): number {
  const cls = byId(s.classes, classId);
  if (!cls || !moduleConfig(cls, "EMPLOYEE_VESTING")) return 0;
  return s.grants
    .filter((g) => g.classId === classId && g.holderId === holderId)
    .reduce((sum, g) => sum + (g.total - vestedOf(g, now)), 0);
}

/** Shares still inside the holding period, by lot. */
export function heldOf(s: Sandbox, classId: string, holderId: string, now: number): number {
  const cls = byId(s.classes, classId);
  const hp = cls && moduleConfig(cls, "HOLDING_PERIOD");
  if (!hp) return 0;
  return s.lots
    .filter((l) => l.classId === classId && l.holderId === holderId && now - l.acquiredAt < hp.days * DAY)
    .reduce((sum, l) => sum + l.quantity, 0);
}

/** Shares locked in open sell orders. */
export function inOrdersOf(s: Sandbox, classId: string, holderId: string): number {
  return s.windows
    .filter((w) => w.classId === classId && (w.status === "OPEN" || w.status === "SCHEDULED"))
    .flatMap((w) => w.orders)
    .filter((o) => o.holderId === holderId && o.side === "SELL" && !o.cancelled)
    .reduce((sum, o) => sum + o.quantity, 0);
}

export interface BalanceBreakdown {
  balance: number;
  frozen: number;
  unvested: number;
  held: number;
  inOrders: number;
  unlocked: number;
}

export function breakdown(s: Sandbox, classId: string, holderId: string, now: number): BalanceBreakdown {
  const cls = byId(s.classes, classId);
  const balance = balanceOf(s, classId, holderId);
  const frozen = cls?.frozen[holderId] ?? 0;
  const unvested = Math.min(balance, unvestedOf(s, classId, holderId, now));
  const held = Math.min(balance, heldOf(s, classId, holderId, now));
  const inOrders = inOrdersOf(s, classId, holderId);
  const locked = Math.min(balance, frozen + Math.max(unvested, held) + inOrders);
  return { balance, frozen, unvested, held, inOrders, unlocked: Math.max(0, balance - locked) };
}

/* ------------------------------------------------------------------ */
/* canTransfer                                                         */
/* ------------------------------------------------------------------ */

export interface TransferCheck {
  ok: boolean;
  reason: ReasonCode;
  /** The module that returned the reason, when one did. */
  module?: ModuleId;
  /** Each step that ran, in order. */
  trace: { step: string; result: ReasonCode }[];
}

/**
 * Previews PrecursorShareToken.canTransfer. `from` empty means a mint, as an
 * offering close or a registrar issuance would perform. `venue` marks a
 * transfer through an approved venue (a Liquidity Window or RFQ settlement),
 * which the ROFR and transfer-window modules treat as exempt.
 */
export function canTransfer(
  s: Sandbox,
  classId: string,
  fromId: string | null,
  toId: string,
  amount: number,
  now: number,
  venue: "window" | "rfq" | null = null
): TransferCheck {
  const trace: TransferCheck["trace"] = [];
  const fail = (reason: ReasonCode, step: string, module?: ModuleId): TransferCheck => {
    trace.push({ step, result: reason });
    return { ok: false, reason, module, trace };
  };
  const pass = (step: string) => trace.push({ step, result: "OK" });

  const cls = byId(s.classes, classId);
  if (!cls) return fail("TOKEN_PAUSED", "Share class");
  const from = fromId ? byId(s.holders, fromId) : undefined;
  const to = byId(s.holders, toId);

  if (cls.paused) return fail("TOKEN_PAUSED", "Token not paused");
  pass("Token not paused");

  if (from) {
    const b = breakdown(s, classId, from.id, now);
    if (b.balance < amount) return fail("INSUFFICIENT_UNLOCKED_BALANCE", "Sender balance");
    if (b.balance - b.frozen < amount) return fail("FROZEN", "Frozen balance");
    pass("Sender balance");

    const fromStatus = identityStatus(from, now);
    if (fromStatus !== "VERIFIED") return fail(fromStatus === "CLAIM_EXPIRED" ? "CLAIM_EXPIRED" : "SENDER_NOT_VERIFIED", "Sender identity");
    pass("Sender identity");
  }

  const toStatus = identityStatus(to, now);
  if (toStatus !== "VERIFIED") return fail(toStatus === "CLAIM_EXPIRED" ? "CLAIM_EXPIRED" : "RECIPIENT_NOT_VERIFIED", "Recipient identity");
  pass("Recipient identity");

  for (const m of cls.modules) {
    if (!m.enabled) continue;
    const c = m.config;
    const label = MODULE_META[c.id].contract;
    switch (c.id) {
      case "REGION": {
        const listed = c.regions.includes(to!.region);
        if (c.mode === "allow" ? !listed : listed) return fail("REGION_BLOCKED", label, c.id);
        break;
      }
      case "ELIGIBILITY": {
        if (c.exemptEmployees && isEmployeeOf(to!, cls.companyId, now)) break;
        const tierClaim = validClaim(to!, "INVESTOR_ELIGIBLE", now);
        if (!tierClaim || to!.tier < c.minimumTier) return fail("NOT_ELIGIBLE", label, c.id);
        break;
      }
      case "HOLDING_PERIOD": {
        if (!from) break;
        const b = breakdown(s, classId, from.id, now);
        if (amount > b.balance - b.held - b.frozen) return fail("HOLDING_PERIOD_ACTIVE", label, c.id);
        break;
      }
      case "HOLDER_CAP": {
        const existing = balanceOf(s, classId, to!.id) > 0;
        if (!existing && holdersOf(s, classId).length >= c.maxHolders) return fail("HOLDER_CAP_REACHED", label, c.id);
        break;
      }
      case "TRANSFER_WINDOW": {
        if (!from) break;
        if (venue === "window" && c.allowDuringLiquidityWindows) break;
        const open = c.windows.some((w) => now >= w.opensAt && now < w.closesAt);
        if (!open) return fail("WINDOW_CLOSED", label, c.id);
        break;
      }
      case "ROFR": {
        if (!from || venue) break;
        if (from.kind === "treasury" || to!.kind === "treasury") break;
        return fail("ROFR_PENDING", label, c.id);
      }
      case "MAX_OWNERSHIP": {
        const supply = totalSupply(s, classId) + (from ? 0 : amount);
        const after = balanceOf(s, classId, to!.id) + amount;
        if (supply > 0 && (after * 10_000) / supply > c.maxBps) return fail("MAX_OWNERSHIP_EXCEEDED", label, c.id);
        break;
      }
      case "EMPLOYEE_VESTING": {
        if (!from) break;
        const b = breakdown(s, classId, from.id, now);
        if (b.unvested > 0 && amount + b.unvested > b.balance) return fail("UNVESTED", label, c.id);
        break;
      }
    }
    pass(label);
  }

  return { ok: true, reason: "OK", trace };
}

/* ------------------------------------------------------------------ */
/* Liquidity Windows                                                   */
/* ------------------------------------------------------------------ */

export interface ClearingPreview {
  price: number;
  volume: number;
  /** Order id to filled quantity. */
  fills: Record<string, number>;
  buyers: number;
  sellers: number;
}

/**
 * The uniform clearing price the LiquidityWindow contract computes: the price
 * that matches the most volume, ties broken toward the reference price, then
 * held at or above the reserve. Fills are by price priority, pro-rata at the
 * marginal level, and capped by the window's maximum volume.
 */
/**
 * Splits `total` across orders in proportion to their size, in whole shares.
 * The shares lost to rounding go one each to the largest remainders, earliest
 * order first on ties, so the fills always add up to exactly `total`.
 */
function proRata(orders: { id: string; quantity: number }[], total: number, fills: Record<string, number>) {
  const size = orders.reduce((a, o) => a + o.quantity, 0);
  if (size <= 0) return;
  const shares = orders.map((o, i) => {
    const exact = (o.quantity * total) / size;
    return { id: o.id, i, base: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = total - shares.reduce((a, x) => a + x.base, 0);
  for (const x of [...shares].sort((a, b) => b.rest - a.rest || a.i - b.i)) {
    if (left <= 0) break;
    x.base += 1;
    left -= 1;
  }
  for (const x of shares) fills[x.id] = x.base;
}

export function previewClearing(w: LiquidityWindow, reference: number | undefined): ClearingPreview | null {
  const live = w.orders.filter((o) => !o.cancelled);
  const sells = live.filter((o) => o.side === "SELL");
  const buys = live.filter((o) => o.side === "BUY");

  if (w.mode === "TENDER") {
    const price = w.tenderPrice ?? 0;
    const supply = sells.reduce((a, o) => a + o.quantity, 0);
    const volume = Math.min(supply, w.maxVolume);
    const fills: Record<string, number> = {};
    proRata(sells, volume, fills);
    return volume > 0 ? { price, volume, fills, buyers: 1, sellers: sells.length } : null;
  }

  if (!sells.length || !buys.length) return null;
  const prices = [...new Set(live.map((o) => o.limitPrice))].sort((a, b) => a - b);
  const supplyAt = (p: number) => sells.filter((o) => o.limitPrice <= p).reduce((a, o) => a + o.quantity, 0);
  const demandAt = (p: number) => buys.filter((o) => o.limitPrice >= p).reduce((a, o) => a + o.quantity, 0);

  const ref = reference ?? (Math.min(...sells.map((o) => o.limitPrice)) + Math.max(...buys.map((o) => o.limitPrice))) / 2;
  let best: { price: number; volume: number } | null = null;
  for (const p of prices) {
    const volume = Math.min(supplyAt(p), demandAt(p), w.maxVolume);
    if (volume <= 0) continue;
    if (!best || volume > best.volume || (volume === best.volume && Math.abs(p - ref) < Math.abs(best.price - ref))) best = { price: p, volume };
  }
  if (!best) return null;
  if (best.price < w.reservePrice) {
    const volume = Math.min(supplyAt(w.reservePrice), demandAt(w.reservePrice), w.maxVolume);
    if (volume <= 0) return null;
    best = { price: w.reservePrice, volume };
  }

  const allocate = (orders: typeof live, better: (a: number, b: number) => number, eligible: (p: number) => boolean) => {
    const fills: Record<string, number> = {};
    let remaining = best!.volume;
    const levels = [...new Set(orders.filter((o) => eligible(o.limitPrice)).map((o) => o.limitPrice))].sort(better);
    for (const level of levels) {
      const at = orders.filter((o) => o.limitPrice === level);
      const size = at.reduce((a, o) => a + o.quantity, 0);
      if (size <= remaining) {
        for (const o of at) fills[o.id] = o.quantity;
        remaining -= size;
      } else {
        proRata(at, remaining, fills);
        remaining = 0;
      }
      if (remaining <= 0) break;
    }
    return fills;
  };

  const sellFills = allocate(sells, (a, b) => a - b, (p) => p <= best!.price);
  const buyFills = allocate(buys, (a, b) => b - a, (p) => p >= best!.price);
  const fills = { ...sellFills, ...buyFills };
  return {
    price: best.price,
    volume: best.volume,
    fills,
    buyers: Object.keys(buyFills).filter((k) => buyFills[k] > 0).length,
    sellers: Object.keys(sellFills).filter((k) => sellFills[k] > 0).length,
  };
}

/* ------------------------------------------------------------------ */
/* Valuations, distributions, votes                                    */
/* ------------------------------------------------------------------ */

export function latestValuation(s: Sandbox, classId: string): Valuation | undefined {
  return s.valuations.filter((v) => v.classId === classId).sort((a, b) => b.asOf - a.asOf)[0];
}

/** Balance at a past moment: lots acquired on or before it. */
export function balanceAt(s: Sandbox, classId: string, holderId: string, at: number): number {
  return s.lots.reduce((sum, l) => (l.classId === classId && l.holderId === holderId && l.acquiredAt <= at ? sum + l.quantity : sum), 0);
}

export function supplyAt(s: Sandbox, classId: string, at: number): number {
  return s.lots.reduce((sum, l) => (l.classId === classId && l.acquiredAt <= at ? sum + l.quantity : sum), 0);
}

export function entitlement(s: Sandbox, d: Distribution, holderId: string): { entitled: number; claimed: number; claimable: number } {
  const supply = supplyAt(s, d.classId, d.recordAt);
  const entitled = supply > 0 ? Math.floor((d.amount * balanceAt(s, d.classId, holderId, d.recordAt)) / supply) : 0;
  const claimed = d.claimed[holderId] ?? 0;
  return { entitled, claimed, claimable: Math.max(0, entitled - claimed) };
}

export function voteWeight(s: Sandbox, p: Proposal, holderId: string): number {
  return p.classIds.reduce((sum, c) => sum + balanceAt(s, c, holderId, p.snapshotAt), 0);
}

export function tally(s: Sandbox, p: Proposal): { weights: number[]; cast: number; eligible: number; quorumMet: boolean } {
  const weights = p.options.map(() => 0);
  for (const [holderId, option] of Object.entries(p.votes)) weights[option] += voteWeight(s, p, holderId);
  const cast = weights.reduce((a, b) => a + b, 0);
  const eligible = p.classIds.reduce((sum, c) => sum + supplyAt(s, c, p.snapshotAt), 0);
  return { weights, cast, eligible, quorumMet: eligible > 0 && (cast * 10_000) / eligible >= p.quorumBps };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const fmtShares = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtUsd = (n: number, digits = 2) =>
  `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} USDG`;
export const fmtCompactUsd = (n: number) => `${n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })} USDG`;
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
export const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function fmtRelative(t: number, now: number): string {
  const diff = t - now;
  const abs = Math.abs(diff);
  const unit = abs >= DAY ? [Math.round(abs / DAY), "day"] : abs >= 3_600_000 ? [Math.round(abs / 3_600_000), "hour"] : [Math.max(1, Math.round(abs / 60_000)), "minute"];
  const label = `${unit[0]} ${unit[1]}${unit[0] === 1 ? "" : "s"}`;
  return diff >= 0 ? `in ${label}` : `${label} ago`;
}

export const shortHex = (h: string) => (h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h);

/** "1 company", "2 companies". Pass the plural when it is not the singular plus "s". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
