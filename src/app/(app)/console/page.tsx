"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleDollarSign, FileText, Gavel, Layers, Repeat, UserPlus, Users } from "lucide-react";
import { Badge, EmptyState, Meter, PageBody, PageHeader, Panel, PanelHeader, Table, Td, Th, type Tone } from "@/components/app/ui";
import {
  CLAIM_LABEL,
  MODULE_META,
  claimState,
  fmtCompactUsd,
  fmtDay,
  fmtPct,
  fmtRelative,
  fmtShares,
  fmtUsd,
  holdersOf,
  identityStatus,
  latestValuation,
  previewClearing,
  tally,
  totalSupply,
  VALUATION_SOURCE_LABEL,
  byId, plural } from "@/lib/precursor/engine";
import { Bar, Caption, Hex, LinkButton, MoreLink, Num, registryOf, useConsole } from "./_components/kit";

type Attention = { key: string; tone: Tone; label: string; title: string; detail: string; href: string };

export default function Page() {
  const { s, now, company, classes } = useConsole();
  const primary = classes[0];

  const holderIds = new Set<string>();
  for (const c of classes) for (const h of holdersOf(s, c.id)) holderIds.add(h.holder.id);
  const verified = [...holderIds].filter((id) => identityStatus(byId(s.holders, id), now) === "VERIFIED").length;

  const outstanding = classes.reduce((a, c) => a + totalSupply(s, c.id), 0);
  const authorized = classes.reduce((a, c) => a + c.authorized, 0);
  const primaryVal = primary ? latestValuation(s, primary.id) : undefined;

  const offerings = s.offerings.filter((o) => o.companyId === company.id);
  const raised = offerings.filter((o) => o.status === "CLOSED").reduce((a, o) => a + (o.result?.raised ?? 0), 0);
  const closedCount = offerings.filter((o) => o.status === "CLOSED").length;
  const escrowed = offerings.filter((o) => o.status === "OPEN").reduce((a, o) => a + o.subscriptions.reduce((x, y) => x + y.amount, 0), 0);

  const openOffering = offerings.find((o) => o.status === "OPEN");
  const openWindow = s.windows.find((w) => w.companyId === company.id && w.status === "OPEN");
  const activeVote = s.proposals.find((p) => p.companyId === company.id && p.status === "ACTIVE");

  /* Attention ------------------------------------------------------- */
  const attention: Attention[] = [];
  for (const c of classes) {
    if (c.paused) attention.push({ key: `pause-${c.id}`, tone: "rose", label: "Paused", title: `${c.symbol} transfers are paused`, detail: "Every transfer returns TOKEN_PAUSED until you unpause.", href: "/console/share-classes" });
    for (const m of c.modules) {
      if (m.pendingUntil && m.pendingUntil > now)
        attention.push({ key: `tl-${c.id}-${m.config.id}`, tone: "amber", label: "Timelock", title: `${MODULE_META[m.config.id].name} change on ${c.symbol}`, detail: `Executes ${fmtRelative(m.pendingUntil, now)} through the IssuerTimelock.`, href: "/console/share-classes" });
    }
    if (c.pendingMultiplier && c.pendingMultiplier.effectiveAt > now)
      attention.push({ key: `mul-${c.id}`, tone: "amber", label: "Timelock", title: `${c.symbol} multiplier to ${c.pendingMultiplier.value}x`, detail: `Takes effect ${fmtRelative(c.pendingMultiplier.effectiveAt, now)}.`, href: "/console/corporate-actions" });
  }
  for (const h of registryOf(s, company.id, now)) {
    const due = h.claims.filter((c) => ["expiring", "expired"].includes(claimState(h, c.topic, now))).sort((a, b) => a.expiresAt - b.expiresAt);
    if (due.length) {
      const first = due[0];
      const expired = first.expiresAt <= now;
      attention.push({
        key: `claim-${h.id}`,
        tone: expired ? "rose" : "amber",
        label: expired ? "Expired" : "Expiring",
        title: `${h.name}: ${due.map((c) => CLAIM_LABEL[c.topic]).join(", ")}`,
        detail: expired
          ? `Expired ${fmtRelative(first.expiresAt, now)}. Transfers return CLAIM_EXPIRED until the verifier renews it.`
          : `${due.length === 1 ? "Expires" : "Expire"} ${fmtRelative(first.expiresAt, now)}, on ${fmtDay(first.expiresAt)}. Renew before then to keep transfers running.`,
        href: "/console/cap-table",
      });
    }
  }
  for (const o of offerings) {
    if (o.status === "OPEN" && o.closesAt <= now)
      attention.push({ key: `off-${o.id}`, tone: "lagoon", label: "Ready", title: `${o.name} has reached its close time`, detail: "Close it to mint shares or release refunds.", href: "/console/offerings" });
  }
  for (const w of s.windows) {
    if (w.companyId === company.id && w.status === "OPEN" && w.closesAt <= now)
      attention.push({ key: `win-${w.id}`, tone: "lagoon", label: "Ready", title: `${w.name} has reached its close time`, detail: "Clear it to settle every matched order.", href: "/console/liquidity" });
  }
  for (const d of s.distributions.filter((x) => x.companyId === company.id)) {
    const claimed = Object.values(d.claimed).reduce((a, b) => a + b, 0);
    const unclaimed = d.amount - claimed;
    if (unclaimed > 0)
      attention.push({
        key: `dst-${d.id}`,
        tone: "muted",
        label: "Unclaimed",
        title: `${fmtUsd(unclaimed, 0)} unclaimed in ${d.name}`,
        detail: d.claimDeadline ? `Claimable until ${fmtDay(d.claimDeadline)}, then returns to the treasury.` : "Claimable with no deadline.",
        href: "/console/corporate-actions",
      });
  }
  const order: Record<Tone, number> = { rose: 0, amber: 1, lagoon: 2, leaf: 3, muted: 4 };
  attention.sort((a, b) => order[a.tone] - order[b.tone]);

  const events = s.events.filter((e) => e.companyId === company.id).sort((a, b) => b.at - a.at).slice(0, 9);

  return (
    <>
      <PageHeader
        variant="sky"
        eyebrow="Console"
        title={company.name}
        description={`${company.sector}, ${company.hq}. ${classes.length} share ${classes.length === 1 ? "class" : "classes"} live on ${s.network.name}. Registrar: ${company.registrar}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/console/cap-table">
              <UserPlus className="size-4" aria-hidden="true" />
              Manage holders
            </LinkButton>
            <LinkButton href="/console/offerings" variant="primary">
              <CircleDollarSign className="size-4" aria-hidden="true" />
              New offering
            </LinkButton>
          </div>
        }
        stats={[
          { label: "Holders", value: fmtShares(holderIds.size), hint: `${verified} verified identities`, accent: "lagoon" },
          { label: "Shares outstanding", value: fmtShares(outstanding), hint: `${fmtPct(authorized ? (outstanding / authorized) * 100 : 0)} of ${fmtShares(authorized)} authorized` },
          {
            label: `Reference Valuation${primary ? `, ${primary.symbol}` : ""}`,
            value: primaryVal ? fmtUsd(primaryVal.price) : "None",
            hint: primaryVal ? `${VALUATION_SOURCE_LABEL[primaryVal.source]}, ${fmtDay(primaryVal.asOf)}` : "Publish one from Disclosures",
          },
          { label: "Raised through offerings", value: fmtCompactUsd(raised), hint: `${closedCount} closed${escrowed > 0 ? `, ${fmtCompactUsd(escrowed)} in escrow` : ""}`, accent: "leaf" },
        ]}
      />

      <PageBody className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Share classes */}
          <Panel className="lg:col-span-2">
            <PanelHeader eyebrow="Share classes" title="Classes and supply" description="One Precursor Share Token per class. Every transfer runs the class's rule modules." action={<MoreLink href="/console/share-classes">Rules</MoreLink>} />
            <Table minWidth={620}>
              <thead>
                <tr>
                  <Th>Class</Th>
                  <Th className="text-right">Issued</Th>
                  <Th className="text-right">Holders</Th>
                  <Th className="text-right">Valuation</Th>
                  <Th>Rules</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const supply = totalSupply(s, c.id);
                  const v = latestValuation(s, c.id);
                  return (
                    <tr key={c.id}>
                      <Td>
                        <div className="font-medium text-navy">{c.name}</div>
                        <div className="font-mono text-[11px] text-fog">{c.symbol}</div>
                      </Td>
                      <Td className="text-right">
                        <Num>{fmtShares(supply)}</Num>
                        <div className="font-mono text-[11px] text-fog">{fmtPct((supply / c.authorized) * 100)} of authorized</div>
                      </Td>
                      <Td className="text-right">
                        <Num>{holdersOf(s, c.id).length}</Num>
                      </Td>
                      <Td className="text-right">
                        <Num>{v ? fmtUsd(v.price) : "None"}</Num>
                      </Td>
                      <Td>
                        <Link href="/console/share-classes" className="font-mono text-[12px] text-tide hover:text-navy">
                          {plural(c.modules.filter((m) => m.enabled).length, "module")}
                        </Link>
                      </Td>
                      <Td>{c.paused ? <Badge tone="rose">Paused</Badge> : <Badge tone="leaf">Active</Badge>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>

          {/* Attention */}
          <Panel>
            <PanelHeader eyebrow="Attention" title={attention.length ? plural(attention.length, "item") : "Nothing needs you"} description="Expiring claims, timelocked changes and funds waiting to be claimed." />
            {attention.length === 0 ? (
              <p className="text-[13.5px] text-tide">Every claim is current and nothing is waiting on the timelock.</p>
            ) : (
              <ul className="-my-1 max-h-[420px] divide-y divide-line-soft overflow-y-auto pr-1">
                {attention.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="group flex items-start gap-3 py-3">
                      <span className="w-[86px] shrink-0 pt-0.5">
                        <Badge tone={a.tone}>{a.label}</Badge>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-navy group-hover:underline group-hover:underline-offset-4">{a.title}</span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-fog">{a.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Live activity */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel>
            <PanelHeader eyebrow="Offering" title={openOffering ? openOffering.name : "No open offering"} action={<MoreLink href="/console/offerings">Open</MoreLink>} />
            {openOffering ? (
              (() => {
                const r = openOffering.subscriptions.reduce((a, x) => a + x.amount, 0);
                const subs = new Set(openOffering.subscriptions.map((x) => x.holderId)).size;
                return (
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="readout font-display text-[26px] text-navy">{fmtCompactUsd(r)}</span>
                      <span className="font-mono text-[11.5px] text-fog">of {fmtCompactUsd(openOffering.maxRaise)}</span>
                    </div>
                    <Meter value={(r / openOffering.maxRaise) * 100} className="mt-3" />
                    <div className="mt-1.5 flex justify-between font-mono text-[11px] text-fog">
                      <span>Min {fmtCompactUsd(openOffering.minRaise)}</span>
                      <span>{r >= openOffering.minRaise ? "Minimum reached" : `${fmtPct((r / openOffering.minRaise) * 100, 0)} of minimum`}</span>
                    </div>
                    <dl className="mt-5 grid grid-cols-3 gap-3 text-[12px]">
                      <div>
                        <dt className="text-fog">Price</dt>
                        <dd className="readout mt-1 font-mono text-navy">{fmtUsd(openOffering.pricePerShare)}</dd>
                      </div>
                      <div>
                        <dt className="text-fog">Subscribers</dt>
                        <dd className="readout mt-1 font-mono text-navy">{subs}</dd>
                      </div>
                      <div>
                        <dt className="text-fog">Closes</dt>
                        <dd className="readout mt-1 font-mono text-navy">{fmtRelative(openOffering.closesAt, now)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })()
            ) : (
              <p className="text-[13.5px] text-tide">Raise from eligible investors with USDG held in escrow until close.</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Liquidity Window" title={openWindow ? openWindow.name : "No open window"} action={<MoreLink href="/console/liquidity">Open</MoreLink>} />
            {openWindow ? (
              (() => {
                const live = openWindow.orders.filter((o) => !o.cancelled);
                const asks = live.filter((o) => o.side === "SELL").reduce((a, o) => a + o.quantity, 0);
                const bids = live.filter((o) => o.side === "BUY").reduce((a, o) => a + o.quantity, 0);
                const ref = latestValuation(s, openWindow.classId)?.price;
                const p = previewClearing(openWindow, ref);
                const depth = Math.max(asks, bids, 1);
                return (
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="readout font-display text-[26px] text-navy">{p ? fmtUsd(p.price) : "No cross"}</span>
                      <span className="font-mono text-[11.5px] text-fog">indicative</span>
                    </div>
                    <p className="mt-1 text-[12px] text-fog">{p ? `${fmtShares(p.volume)} shares would clear between ${p.sellers} sellers and ${p.buyers} buyers.` : "Bids and asks do not cross yet."}</p>
                    <div className="mt-4 space-y-2.5">
                      <div>
                        <div className="mb-1 flex justify-between font-mono text-[11px]">
                          <span className="text-fog">Asks</span>
                          <span className="text-tide">{fmtShares(asks)}</span>
                        </div>
                        <Bar value={asks} max={depth} tone="rose" />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between font-mono text-[11px]">
                          <span className="text-fog">Bids</span>
                          <span className="text-tide">{fmtShares(bids)}</span>
                        </div>
                        <Bar value={bids} max={depth} tone="leaf" />
                      </div>
                    </div>
                    <p className="mt-4 font-mono text-[11px] text-fog">
                      {plural(live.length, "order")} · closes {fmtRelative(openWindow.closesAt, now)}
                    </p>
                  </div>
                );
              })()
            ) : (
              <p className="text-[13.5px] text-tide">Give holders a scheduled, uniform-price way to sell.</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Vote" title={activeVote ? activeVote.title : "No active vote"} action={<MoreLink href="/console/corporate-actions">Open</MoreLink>} />
            {activeVote ? (
              (() => {
                const t = tally(s, activeVote);
                const quorumPct = t.eligible ? (t.cast / t.eligible) * 100 : 0;
                return (
                  <div>
                    <div className="space-y-2.5">
                      {activeVote.options.map((o, i) => (
                        <div key={o}>
                          <div className="mb-1 flex justify-between text-[12px]">
                            <span className="text-tide">{o}</span>
                            <span className="readout font-mono text-[11.5px] text-navy">{t.cast ? fmtPct((t.weights[i] / t.cast) * 100) : "0.0%"}</span>
                          </div>
                          <Bar value={t.weights[i]} max={t.cast || 1} tone={i === 0 ? "lagoon" : "muted"} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-fog">
                      <span>
                        Turnout {fmtPct(quorumPct)} / quorum {fmtPct(activeVote.quorumBps / 100, 0)}
                      </span>
                      {t.quorumMet ? <Badge tone="leaf">Quorum met</Badge> : <Badge tone="amber">Below quorum</Badge>}
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-fog">Ends {fmtRelative(activeVote.endsAt, now)}</p>
                  </div>
                );
              })()
            ) : (
              <p className="text-[13.5px] text-tide">Run snapshot votes weighted by holdings at a block.</p>
            )}
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Events */}
          <Panel className="lg:col-span-2">
            <PanelHeader eyebrow="On-chain" title="Recent events" description={`Indexed from ${s.network.name}. The same events are public in the Explorer.`} action={<MoreLink href={`/explorer/${company.id}`}>Explorer</MoreLink>} />
            {events.length === 0 ? (
              <EmptyState title="No events yet" body="Events appear here as soon as a transaction lands." />
            ) : (
              <Table minWidth={680}>
                <thead>
                  <tr>
                    <Th>Event</Th>
                    <Th>Summary</Th>
                    <Th className="text-right">When</Th>
                    <Th className="text-right">Block</Th>
                    <Th>Tx</Th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <Td>
                        <span className="font-mono text-[12px] text-navy">{e.name}</span>
                      </Td>
                      <Td className="max-w-[320px]">
                        <span className="line-clamp-1 text-[13px]">{e.summary}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-right text-[12.5px]">{fmtRelative(e.at, now)}</Td>
                      <Td className="text-right">
                        <Num className="text-[12px] text-tide">{e.block.toLocaleString("en-US")}</Num>
                      </Td>
                      <Td>
                        <a href={`${s.network.explorer}/tx/${e.tx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-navy">
                          <Hex value={e.tx} />
                          <ArrowUpRight className="size-3 text-fog" aria-hidden="true" />
                        </a>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          {/* Quick actions */}
          <Panel>
            <PanelHeader eyebrow="Shortcuts" title="Quick actions" />
            <Caption>Run the company</Caption>
            <div className="frame grid gap-px">
              {[
                { href: "/console/cap-table", icon: Users, title: "Cap table", body: "Invite holders, issue shares, check a transfer." },
                { href: "/console/share-classes", icon: Layers, title: "Rules", body: "Configure modules, pause, enable RFQ." },
                { href: "/console/offerings", icon: CircleDollarSign, title: "Offerings", body: "Raise with escrow, mint at close." },
                { href: "/console/liquidity", icon: Repeat, title: "Liquidity", body: "Run a window or a tender." },
                { href: "/console/corporate-actions", icon: Gavel, title: "Distributions and votes", body: "Fund a payout, open a vote." },
                { href: "/console/disclosures", icon: FileText, title: "Disclosures", body: "Anchor a document, publish a valuation." },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="frame-cell group flex items-start gap-3 px-4 py-3.5">
                  <q.icon className="mt-0.5 size-4 shrink-0 text-tide group-hover:text-navy" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-navy">{q.title}</span>
                    <span className="block text-[12px] text-fog">{q.body}</span>
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 font-mono text-[11px] text-fog">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              Onboarded {fmtDay(company.onboardedAt)}
            </p>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
