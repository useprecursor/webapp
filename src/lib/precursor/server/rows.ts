import type {
  ChainEvent,
  Claim,
  Company,
  Disclosure,
  Distribution,
  Grant,
  Holder,
  LiquidityWindow,
  Lot,
  ModuleConfig,
  Offering,
  Proposal,
  Sandbox,
  ShareClass,
  Valuation,
} from "../types";

/*
 * The mapping between the app's state and the tables in supabase/schema.sql.
 * Every table has a text primary key and a company_id, so the server can
 * diff state by key and authorize each changed row against a company.
 */

export type Row = Record<string, unknown> & { id: string };
export type Tables = Record<TableName, Row[]>;

/** In foreign key order: parents first. Deletes run in reverse. */
export const TABLES = [
  "companies",
  "holders",
  "claims",
  "share_classes",
  "rule_modules",
  "freezes",
  "lots",
  "grants",
  "disclosures",
  "offerings",
  "subscriptions",
  "liquidity_windows",
  "window_orders",
  "distributions",
  "distribution_claims",
  "proposals",
  "votes",
  "valuations",
  "chain_events",
] as const;

export type TableName = (typeof TABLES)[number];

const iso = (ms: number | undefined | null) => (ms === undefined || ms === null ? null : new Date(ms).toISOString());
const ms = (v: unknown) => (v === null || v === undefined ? undefined : Date.parse(String(v)));
const num = (v: unknown) => Number(v);
const str = (v: unknown) => String(v);
const opt = <T,>(v: T | null | undefined) => (v === null ? undefined : v);
const byTime = <T,>(key: (x: T) => number, dir: 1 | -1) => (a: T, b: T) => dir * (key(a) - key(b));

export function toRows(s: Sandbox): Tables {
  const classCompany = new Map(s.classes.map((c) => [c.id, c.companyId]));
  const holderCompany = new Map(s.holders.map((h) => [h.id, h.companyId ?? null]));
  const co = (classId: string) => classCompany.get(classId) ?? null;

  return {
    companies: s.companies.map((c) => ({
      id: c.id,
      company_id: c.id,
      name: c.name,
      legal_name: c.legalName,
      sector: c.sector,
      hq: c.hq,
      founded: c.founded,
      description: c.description,
      website: c.website,
      treasury: c.treasury,
      registrar: c.registrar,
      contracts: c.contracts,
      onboarded_at: iso(c.onboardedAt),
    })),
    holders: s.holders.map((h) => ({
      id: h.id,
      company_id: h.companyId ?? null,
      name: h.name,
      kind: h.kind,
      identity: h.identity,
      wallets: h.wallets.map((w) => w.toLowerCase()),
      region: h.region,
      tier: h.tier,
      joined_at: iso(h.joinedAt),
    })),
    claims: s.holders.flatMap((h) =>
      h.claims.map((c) => ({
        id: `${h.id}:${c.topic}`,
        company_id: holderCompany.get(h.id) ?? null,
        holder_id: h.id,
        topic: c.topic,
        value: c.value,
        verifier: c.verifier,
        issued_at: iso(c.issuedAt),
        expires_at: iso(c.expiresAt),
      }))
    ),
    share_classes: s.classes.map((c) => ({
      id: c.id,
      company_id: c.companyId,
      name: c.name,
      symbol: c.symbol,
      token: c.token,
      rule_engine: c.ruleEngine,
      authorized: c.authorized,
      multiplier: c.multiplier,
      pending_multiplier: c.pendingMultiplier ?? null,
      paused: c.paused,
      rfq_enabled: c.rfqEnabled,
    })),
    rule_modules: s.classes.flatMap((c) =>
      c.modules.map((m, position) => ({
        id: `${c.id}:${m.config.id}`,
        company_id: c.companyId,
        class_id: c.id,
        module_id: m.config.id,
        position,
        config: m.config,
        enabled: m.enabled,
        pending_until: iso(m.pendingUntil),
      }))
    ),
    freezes: s.classes.flatMap((c) =>
      Object.entries(c.frozen).map(([holderId, amount]) => ({ id: `${c.id}:${holderId}`, company_id: c.companyId, class_id: c.id, holder_id: holderId, amount }))
    ),
    lots: s.lots.map((l) => ({
      id: l.id,
      company_id: co(l.classId),
      class_id: l.classId,
      holder_id: l.holderId,
      quantity: l.quantity,
      acquired_at: iso(l.acquiredAt),
      source: l.source,
    })),
    grants: s.grants.map((g) => ({
      id: g.id,
      company_id: co(g.classId),
      class_id: g.classId,
      holder_id: g.holderId,
      total: g.total,
      start_at: iso(g.start),
      cliff_days: g.cliffDays,
      duration_days: g.durationDays,
      accelerated: g.accelerated,
    })),
    disclosures: s.documents.map((d) => ({
      id: d.id,
      company_id: d.companyId,
      kind: d.kind,
      title: d.title,
      hash: d.hash,
      anchored_at: iso(d.anchoredAt),
      visibility: d.visibility,
    })),
    offerings: s.offerings.map((o) => ({
      id: o.id,
      company_id: o.companyId,
      class_id: o.classId,
      name: o.name,
      price_per_share: o.pricePerShare,
      min_raise: o.minRaise,
      max_raise: o.maxRaise,
      min_ticket: o.minTicket,
      opens_at: iso(o.opensAt),
      closes_at: iso(o.closesAt),
      required_claims: o.requiredClaims,
      document_id: o.documentId ?? null,
      status: o.status,
      result: o.result ?? null,
    })),
    subscriptions: s.offerings.flatMap((o) =>
      o.subscriptions.map((x, i) => ({ id: `${o.id}:${i}`, company_id: o.companyId, offering_id: o.id, holder_id: x.holderId, amount: x.amount, subscribed_at: iso(x.at) }))
    ),
    liquidity_windows: s.windows.map((w) => ({
      id: w.id,
      company_id: w.companyId,
      class_id: w.classId,
      name: w.name,
      mode: w.mode,
      opens_at: iso(w.opensAt),
      closes_at: iso(w.closesAt),
      reserve_price: w.reservePrice,
      tender_price: w.tenderPrice ?? null,
      max_volume: w.maxVolume,
      per_seller_cap: w.perSellerCap,
      seller_claims: w.sellerClaims,
      buyer_claims: w.buyerClaims,
      status: w.status,
      result: w.result ?? null,
    })),
    window_orders: s.windows.flatMap((w) =>
      w.orders.map((o) => ({
        id: o.id,
        company_id: w.companyId,
        window_id: w.id,
        holder_id: o.holderId,
        side: o.side,
        quantity: o.quantity,
        limit_price: o.limitPrice,
        placed_at: iso(o.placedAt),
        cancelled: o.cancelled ?? false,
        filled: o.filled ?? null,
      }))
    ),
    distributions: s.distributions.map((d) => ({
      id: d.id,
      company_id: d.companyId,
      class_id: d.classId,
      name: d.name,
      asset: d.asset,
      amount: d.amount,
      record_at: iso(d.recordAt),
      funded_at: iso(d.fundedAt),
      claim_deadline: iso(d.claimDeadline),
    })),
    distribution_claims: s.distributions.flatMap((d) =>
      Object.entries(d.claimed).map(([holderId, amount]) => ({ id: `${d.id}:${holderId}`, company_id: d.companyId, distribution_id: d.id, holder_id: holderId, amount }))
    ),
    proposals: s.proposals.map((p) => ({
      id: p.id,
      company_id: p.companyId,
      class_ids: p.classIds,
      title: p.title,
      summary: p.summary,
      options: p.options,
      snapshot_at: iso(p.snapshotAt),
      ends_at: iso(p.endsAt),
      quorum_bps: p.quorumBps,
      binding: p.binding,
      status: p.status,
      result: p.result ?? null,
    })),
    votes: s.proposals.flatMap((p) =>
      Object.entries(p.votes).map(([holderId, option]) => ({ id: `${p.id}:${holderId}`, company_id: p.companyId, proposal_id: p.id, holder_id: holderId, option }))
    ),
    valuations: s.valuations.map((v) => ({
      id: v.id,
      company_id: co(v.classId),
      class_id: v.classId,
      price: v.price,
      source: v.source,
      as_of: iso(v.asOf),
      document_id: v.documentId ?? null,
    })),
    chain_events: s.events.map((e) => ({
      id: e.id,
      company_id: e.companyId || null,
      class_id: e.classId ?? null,
      name: e.name,
      summary: e.summary,
      at: iso(e.at),
      block: e.block,
      tx: e.tx,
    })),
  };
}

/** Rebuilds the app's state from table rows, as returned by PostgREST. */
export function fromRows(t: Tables, network: Sandbox["network"]): Sandbox {
  const group = <T extends Row>(rows: T[], key: string) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = str(r[key]);
      const list = m.get(k);
      if (list) list.push(r);
      else m.set(k, [r]);
    }
    return m;
  };
  const claimsBy = group(t.claims, "holder_id");
  const modulesBy = group(t.rule_modules, "class_id");
  const freezesBy = group(t.freezes, "class_id");
  const subsBy = group(t.subscriptions, "offering_id");
  const ordersBy = group(t.window_orders, "window_id");
  const dclaimsBy = group(t.distribution_claims, "distribution_id");
  const votesBy = group(t.votes, "proposal_id");

  const companies: Company[] = t.companies.map((r) => ({
    id: r.id,
    name: str(r.name),
    legalName: str(r.legal_name),
    sector: str(r.sector ?? ""),
    hq: str(r.hq ?? ""),
    founded: num(r.founded ?? 0),
    description: str(r.description ?? ""),
    website: str(r.website ?? ""),
    treasury: str(r.treasury) as Company["treasury"],
    registrar: str(r.registrar),
    contracts: (r.contracts ?? {}) as Company["contracts"],
    onboardedAt: ms(r.onboarded_at)!,
  }));

  const holders: Holder[] = t.holders.map((r) => ({
    id: r.id,
    name: str(r.name),
    kind: r.kind as Holder["kind"],
    identity: str(r.identity) as Holder["identity"],
    wallets: (r.wallets as string[]) as Holder["wallets"],
    region: str(r.region),
    tier: num(r.tier),
    joinedAt: ms(r.joined_at)!,
    companyId: opt(r.company_id as string | null),
    claims: (claimsBy.get(r.id) ?? []).map(
      (c): Claim => ({ topic: c.topic as Claim["topic"], value: str(c.value), verifier: str(c.verifier), issuedAt: ms(c.issued_at)!, expiresAt: ms(c.expires_at)! })
    ),
  }));

  const classes: ShareClass[] = t.share_classes.map((r) => ({
    id: r.id,
    companyId: str(r.company_id),
    name: str(r.name),
    symbol: str(r.symbol),
    token: str(r.token) as ShareClass["token"],
    ruleEngine: str(r.rule_engine) as ShareClass["ruleEngine"],
    authorized: num(r.authorized),
    multiplier: num(r.multiplier),
    pendingMultiplier: opt(r.pending_multiplier as ShareClass["pendingMultiplier"] | null),
    paused: Boolean(r.paused),
    rfqEnabled: Boolean(r.rfq_enabled),
    modules: (modulesBy.get(r.id) ?? [])
      .sort((a, b) => num(a.position) - num(b.position))
      .map((m) => ({ config: m.config as ModuleConfig, enabled: Boolean(m.enabled), pendingUntil: ms(m.pending_until) })),
    frozen: Object.fromEntries((freezesBy.get(r.id) ?? []).map((f) => [str(f.holder_id), num(f.amount)])),
  }));

  const lots: Lot[] = t.lots
    .map((r) => ({ id: r.id, holderId: str(r.holder_id), classId: str(r.class_id), quantity: num(r.quantity), acquiredAt: ms(r.acquired_at)!, source: r.source as Lot["source"] }))
    .sort(byTime((l) => l.acquiredAt, 1));

  const grants: Grant[] = t.grants.map((r) => ({
    id: r.id,
    holderId: str(r.holder_id),
    classId: str(r.class_id),
    total: num(r.total),
    start: ms(r.start_at)!,
    cliffDays: num(r.cliff_days),
    durationDays: num(r.duration_days),
    accelerated: Boolean(r.accelerated),
  }));

  const documents: Disclosure[] = t.disclosures
    .map((r) => ({
      id: r.id,
      companyId: str(r.company_id),
      kind: r.kind as Disclosure["kind"],
      title: str(r.title),
      hash: str(r.hash) as Disclosure["hash"],
      anchoredAt: ms(r.anchored_at)!,
      visibility: r.visibility as Disclosure["visibility"],
    }))
    .sort(byTime((d) => d.anchoredAt, -1));

  const offerings: Offering[] = t.offerings
    .map((r) => ({
      id: r.id,
      companyId: str(r.company_id),
      classId: str(r.class_id),
      name: str(r.name),
      pricePerShare: num(r.price_per_share),
      minRaise: num(r.min_raise),
      maxRaise: num(r.max_raise),
      minTicket: num(r.min_ticket),
      opensAt: ms(r.opens_at)!,
      closesAt: ms(r.closes_at)!,
      requiredClaims: (r.required_claims ?? []) as Offering["requiredClaims"],
      documentId: opt(r.document_id as string | null),
      status: r.status as Offering["status"],
      result: opt(r.result as Offering["result"] | null),
      subscriptions: (subsBy.get(r.id) ?? [])
        .sort((a, b) => num(a.id.split(":").pop()) - num(b.id.split(":").pop()))
        .map((x) => ({ holderId: str(x.holder_id), amount: num(x.amount), at: ms(x.subscribed_at)! })),
    }))
    .sort(byTime((o) => o.opensAt, -1));

  const windows: LiquidityWindow[] = t.liquidity_windows
    .map((r) => ({
      id: r.id,
      companyId: str(r.company_id),
      classId: str(r.class_id),
      name: str(r.name),
      mode: r.mode as LiquidityWindow["mode"],
      opensAt: ms(r.opens_at)!,
      closesAt: ms(r.closes_at)!,
      reservePrice: num(r.reserve_price),
      tenderPrice: r.tender_price === null || r.tender_price === undefined ? undefined : num(r.tender_price),
      maxVolume: num(r.max_volume),
      perSellerCap: num(r.per_seller_cap),
      sellerClaims: (r.seller_claims ?? []) as LiquidityWindow["sellerClaims"],
      buyerClaims: (r.buyer_claims ?? []) as LiquidityWindow["buyerClaims"],
      status: r.status as LiquidityWindow["status"],
      result: opt(r.result as LiquidityWindow["result"] | null),
      orders: (ordersBy.get(r.id) ?? [])
        .map((o) => ({
          id: o.id,
          holderId: str(o.holder_id),
          side: o.side as "SELL" | "BUY",
          quantity: num(o.quantity),
          limitPrice: num(o.limit_price),
          placedAt: ms(o.placed_at)!,
          cancelled: o.cancelled ? true : undefined,
          filled: o.filled === null || o.filled === undefined ? undefined : num(o.filled),
        }))
        .sort(byTime((o) => o.placedAt, 1)),
    }))
    .sort(byTime((w) => w.opensAt, -1));

  const distributions: Distribution[] = t.distributions
    .map((r) => ({
      id: r.id,
      companyId: str(r.company_id),
      classId: str(r.class_id),
      name: str(r.name),
      asset: "USDG" as const,
      amount: num(r.amount),
      recordAt: ms(r.record_at)!,
      fundedAt: ms(r.funded_at)!,
      claimDeadline: ms(r.claim_deadline),
      claimed: Object.fromEntries((dclaimsBy.get(r.id) ?? []).map((c) => [str(c.holder_id), num(c.amount)])),
    }))
    .sort(byTime((d) => d.fundedAt, -1));

  const proposals: Proposal[] = t.proposals
    .map((r) => ({
      id: r.id,
      companyId: str(r.company_id),
      classIds: (r.class_ids ?? []) as string[],
      title: str(r.title),
      summary: str(r.summary ?? ""),
      options: (r.options ?? []) as string[],
      snapshotAt: ms(r.snapshot_at)!,
      endsAt: ms(r.ends_at)!,
      quorumBps: num(r.quorum_bps),
      binding: Boolean(r.binding),
      status: r.status as Proposal["status"],
      result: r.result === null || r.result === undefined ? undefined : num(r.result),
      votes: Object.fromEntries((votesBy.get(r.id) ?? []).map((v) => [str(v.holder_id), num(v.option)])),
    }))
    .sort(byTime((p) => p.snapshotAt, -1));

  const valuations: Valuation[] = t.valuations
    .map((r) => ({ id: r.id, classId: str(r.class_id), price: num(r.price), source: r.source as Valuation["source"], asOf: ms(r.as_of)!, documentId: opt(r.document_id as string | null) }))
    .sort(byTime((v) => v.asOf, 1));

  const events: ChainEvent[] = t.chain_events
    .map((r) => ({
      id: r.id,
      companyId: str(r.company_id ?? ""),
      classId: opt(r.class_id as string | null),
      name: str(r.name),
      summary: str(r.summary),
      at: ms(r.at)!,
      block: num(r.block),
      tx: str(r.tx) as ChainEvent["tx"],
    }))
    .sort((a, b) => b.block - a.block || b.at - a.at);

  return {
    network,
    companies,
    classes,
    holders,
    lots,
    grants,
    offerings,
    windows,
    distributions,
    proposals,
    documents,
    valuations,
    events,
    block: events.reduce((m, e) => Math.max(m, e.block), 0),
  };
}

/** JSON with object keys sorted, since jsonb columns come back from Postgres in their own key order. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Rows to upsert and ids to delete, per table, to turn `before` into `after`. */
export function diffTables(before: Tables, after: Tables) {
  const upserts: Partial<Record<TableName, Row[]>> = {};
  const deletes: Partial<Record<TableName, Row[]>> = {};
  for (const name of TABLES) {
    const old = new Map(before[name].map((r) => [r.id, stable(r)]));
    const nextIds = new Set(after[name].map((r) => r.id));
    const changed = after[name].filter((r) => old.get(r.id) !== stable(r));
    const removed = before[name].filter((r) => !nextIds.has(r.id));
    if (changed.length) upserts[name] = changed;
    if (removed.length) deletes[name] = removed;
  }
  return { upserts, deletes };
}
