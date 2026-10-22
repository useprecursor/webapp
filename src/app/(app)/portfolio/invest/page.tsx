"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText } from "lucide-react";
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Field,
  Input,
  Meter,
  Notice,
  PageBody,
  PageHeader,
  Panel,
  PanelHeader,
  StatPill,
  Table,
  Td,
  Th,
} from "@/components/app/ui";
import { CallLine, CheckLine, CompanyMark, KV, SectionTitle } from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import {
  byId,
  canTransfer,
  CLAIM_LABEL,
  fmtCompactUsd,
  fmtDateTime,
  fmtDay,
  fmtRelative,
  fmtShares,
  fmtUsd,
  latestValuation,
  shortHex, plural } from "@/lib/precursor/engine";
import type { Offering, Sandbox } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

type Eligibility = { ok: boolean; code: string; text: string };

function eligibility(s: Sandbox, o: Offering, holderId: string, now: number, shares?: number): Eligibility {
  const h = byId(s.holders, holderId);
  const missing = o.requiredClaims.filter((topic) => !h?.claims.some((c) => c.topic === topic && c.expiresAt > now));
  if (missing.length) {
    return { ok: false, code: "Missing claim", text: `This offering requires ${missing.map((t) => CLAIM_LABEL[t].toLowerCase()).join(" and ")}. Renew or add it from your account.` };
  }
  const qty = shares ?? Math.max(1, Math.floor(o.minTicket / o.pricePerShare));
  const check = canTransfer(s, o.classId, null, holderId, qty, now);
  if (!check.ok) return { ok: false, code: check.reason, text: "" };
  return { ok: true, code: "OK", text: "You hold every required claim and pass the transfer rules on this class." };
}

const raisedOf = (o: Offering) => o.subscriptions.reduce((a, x) => a + x.amount, 0);
const mineOf = (o: Offering, holderId: string) => o.subscriptions.filter((x) => x.holderId === holderId).reduce((a, x) => a + x.amount, 0);

export default function Page() {
  const { s, now, viewer } = useSandbox();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const close = useCallback(() => setOpenId(null), []);

  const live = useMemo(
    () => s.offerings.filter((o) => o.status === "OPEN" || o.status === "SCHEDULED").sort((a, b) => (a.status === b.status ? a.closesAt - b.closesAt : a.status === "OPEN" ? -1 : 1)),
    [s.offerings]
  );
  const closed = useMemo(
    () => s.offerings.filter((o) => o.status === "CLOSED" || o.status === "FAILED").sort((a, b) => (b.result?.closedAt ?? b.closesAt) - (a.result?.closedAt ?? a.closesAt)),
    [s.offerings]
  );
  const mine = s.offerings.filter((o) => mineOf(o, viewer.holderId) > 0);
  const escrowed = mine.filter((o) => o.status === "OPEN" || o.status === "SCHEDULED").reduce((a, o) => a + mineOf(o, viewer.holderId), 0);
  const eligibleCount = live.filter((o) => eligibility(s, o, viewer.holderId, now).ok).length;
  const nextClose = live.filter((o) => o.status === "OPEN").sort((a, b) => a.closesAt - b.closesAt)[0];
  const current = byId(s.offerings, openId ?? undefined);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Offerings"
        title="Invest in primary offerings"
        description="Companies raise directly on Precursor. Your USDG is held in escrow in the OfferingVault until the offering closes: shares are minted to you if it reaches its minimum, and your subscription is refunded in full if it does not."
        stats={[
          { label: "Open and scheduled", value: String(live.length), hint: `${live.filter((o) => o.status === "OPEN").length} accepting subscriptions` },
          { label: "You are eligible for", value: String(eligibleCount), hint: `of ${plural(live.length, "offering")}`, accent: eligibleCount > 0 ? "leaf" : undefined },
          { label: "Your escrowed USDG", value: fmtUsd(escrowed, 0), hint: "In open offerings", accent: escrowed > 0 ? "lagoon" : undefined },
          { label: "Next close", value: nextClose ? fmtRelative(nextClose.closesAt, now) : "None", hint: nextClose?.name },
        ]}
      />
      <PageBody className="space-y-6">
        {live.length === 0 ? (
          <Panel>
            <EmptyState title="No offerings are open" body="New offerings appear here as soon as a company schedules one. Past offerings are listed below." />
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {live.map((o) => (
              <OfferingCard key={o.id} offering={o} onSubscribe={() => setOpenId(o.id)} />
            ))}
          </div>
        )}

        <Panel>
          <PanelHeader eyebrow="Your subscriptions" title="What you have committed" description="Subscriptions stay in escrow until the close. You pay the offering price for every share allocated to you." />
          {mine.length === 0 ? (
            <p className="text-[13.5px] text-fog">You have no subscriptions yet.</p>
          ) : (
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>Offering</Th>
                  <Th className="text-right">Subscribed</Th>
                  <Th className="text-right">Shares at price</Th>
                  <Th>Last subscribed</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {mine.map((o) => {
                  const amt = mineOf(o, viewer.holderId);
                  const last = Math.max(...o.subscriptions.filter((x) => x.holderId === viewer.holderId).map((x) => x.at));
                  const company = byId(s.companies, o.companyId);
                  const cls = byId(s.classes, o.classId);
                  return (
                    <tr key={o.id}>
                      <Td>
                        <span className="block font-medium text-navy">{o.name}</span>
                        <span className="text-[12px] text-fog">
                          {company?.name} · {cls?.symbol}
                        </span>
                      </Td>
                      <Td className="readout text-right text-navy">{fmtUsd(amt, 0)}</Td>
                      <Td className="readout text-right">{fmtShares(Math.floor(amt / o.pricePerShare))}</Td>
                      <Td>{fmtDateTime(last)}</Td>
                      <Td>
                        {o.status === "OPEN" || o.status === "SCHEDULED" ? (
                          <Badge tone="lagoon">In escrow</Badge>
                        ) : o.status === "CLOSED" ? (
                          <Badge tone="leaf">Settled</Badge>
                        ) : (
                          <Badge tone="amber">Refundable</Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <button type="button" onClick={() => setShowClosed((v) => !v)} aria-expanded={showClosed} className="flex w-full items-center justify-between gap-3 text-left">
            <div>
              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fog">History</p>
              <h2 className="font-sans text-[18px] font-semibold tracking-[-0.02em]">Recently closed</h2>
              <p className="mt-1 text-[13.5px] text-tide">{plural(closed.length, "offering")} {closed.length === 1 ? "has" : "have"} closed or been refunded.</p>
            </div>
            <ChevronDown className={cn("size-5 shrink-0 text-fog transition-transform", showClosed && "rotate-180")} aria-hidden="true" />
          </button>
          {showClosed && (
            <div className="mt-5">
              <Table minWidth={720}>
                <thead>
                  <tr>
                    <Th>Offering</Th>
                    <Th className="text-right">Price</Th>
                    <Th className="text-right">Raised</Th>
                    <Th className="text-right">Shares issued</Th>
                    <Th>Closed</Th>
                    <Th>Outcome</Th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((o) => {
                    const company = byId(s.companies, o.companyId);
                    const cls = byId(s.classes, o.classId);
                    return (
                      <tr key={o.id}>
                        <Td>
                          <span className="block font-medium text-navy">{o.name}</span>
                          <span className="text-[12px] text-fog">
                            {company?.name} · {cls?.symbol}
                          </span>
                        </Td>
                        <Td className="readout text-right">{fmtUsd(o.pricePerShare)}</Td>
                        <Td className="readout text-right text-navy">{fmtUsd(o.result?.raised ?? 0, 0)}</Td>
                        <Td className="readout text-right">{fmtShares(o.result?.sharesIssued ?? 0)}</Td>
                        <Td>{fmtDay(o.result?.closedAt ?? o.closesAt)}</Td>
                        <Td>{o.status === "CLOSED" ? <Badge tone="leaf">Closed</Badge> : <Badge tone="amber">Refunded</Badge>}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Panel>
      </PageBody>

      {current && <SubscribeDrawer key={current.id} offering={current} onClose={close} />}
    </>
  );
}

function OfferingCard({ offering: o, onSubscribe }: { offering: Offering; onSubscribe: () => void }) {
  const { s, now, viewer } = useSandbox();
  const company = byId(s.companies, o.companyId);
  const cls = byId(s.classes, o.classId);
  const raised = raisedOf(o);
  const mine = mineOf(o, viewer.holderId);
  const el = eligibility(s, o, viewer.holderId, now);
  const ref = latestValuation(s, o.classId);
  const isOpen = o.status === "OPEN" && now >= o.opensAt && now < o.closesAt;

  return (
    <article className="card card-hover flex flex-col p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark name={company?.name ?? "?"} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-tide">{company?.name}</p>
            <h3 className="truncate font-sans text-[17px] font-semibold tracking-[-0.02em] text-navy">{o.name}</h3>
          </div>
        </div>
        <Badge tone={isOpen ? "leaf" : "muted"}>{isOpen ? "Open" : "Scheduled"}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <StatPill label="Price per share" value={o.pricePerShare.toFixed(2)} sub="USDG" />
        <StatPill label="Minimum ticket" value={fmtCompactUsd(o.minTicket).replace(" USDG", "")} sub="USDG" />
        <StatPill label={isOpen ? "Closes" : "Opens"} value={fmtRelative(isOpen ? o.closesAt : o.opensAt, now).replace(/^in /, "")} sub={fmtDay(isOpen ? o.closesAt : o.opensAt)} />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="readout text-navy">{fmtUsd(raised, 0)} raised</span>
          <span className="readout text-fog">of {fmtUsd(o.maxRaise, 0)} maximum</span>
        </div>
        <div className="relative mt-2">
          <Meter value={(raised / o.maxRaise) * 100} />
          <span className="absolute -top-1 h-4 w-px bg-amber" style={{ left: `${(o.minRaise / o.maxRaise) * 100}%` }} title="Minimum raise" aria-hidden="true" />
        </div>
        <p className="mt-2 text-[12px] text-fog">
          Minimum raise {fmtUsd(o.minRaise, 0)} {raised >= o.minRaise ? "reached" : "not yet reached"}. {cls?.name} ({cls?.symbol})
          {ref ? `, last Reference Valuation ${fmtUsd(ref.price)}` : ""}.
        </p>
      </div>

      <div className="mt-4">
        <CheckLine ok={el.ok} reason={el.ok ? "Eligible" : el.code} text={el.text || undefined} />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <span className="text-[12.5px] text-tide">{mine > 0 ? `You have ${fmtUsd(mine, 0)} in escrow` : "No subscription yet"}</span>
        <Button onClick={onSubscribe} variant={isOpen && el.ok ? "primary" : "secondary"} className="btn-sm">
          {isOpen ? (mine > 0 ? "Add to subscription" : "Subscribe") : "View terms"}
        </Button>
      </div>
    </article>
  );
}

function SubscribeDrawer({ offering: o, onClose }: { offering: Offering; onClose: () => void }) {
  const { s, now, viewer, subscribe } = useSandbox();
  const company = byId(s.companies, o.companyId);
  const cls = byId(s.classes, o.classId);
  const doc = byId(s.documents, o.documentId);
  const raised = raisedOf(o);
  const existing = mineOf(o, viewer.holderId);
  const isOpen = o.status === "OPEN" && now >= o.opensAt && now < o.closesAt;

  const [amount, setAmount] = useState("");
  const amt = Number(amount);
  const valid = Number.isFinite(amt) && amt > 0;
  const totalMine = existing + (valid ? amt : 0);
  const shares = valid ? Math.floor(amt / o.pricePerShare) : 0;

  const el = eligibility(s, o, viewer.holderId, now, Math.max(1, Math.floor(totalMine / o.pricePerShare)));
  const belowMin = valid && totalMine < o.minTicket;

  // Allocation if the offering closed now with this subscription included.
  const raisedAfter = raised + (valid ? amt : 0);
  const over = raisedAfter > o.maxRaise;
  const allocation = over ? (totalMine * o.maxRaise) / raisedAfter : totalMine;
  const allocShares = Math.floor(allocation / o.pricePerShare);
  const refund = Math.max(0, totalMine - allocShares * o.pricePerShare);

  const error = !valid ? null : belowMin ? `The minimum ticket is ${fmtUsd(o.minTicket, 0)}${existing > 0 ? ` including your existing ${fmtUsd(existing, 0)}` : ""}.` : null;
  const canSubmit = isOpen && valid && !belowMin && el.ok;

  const submit = () => {
    if (!canSubmit) return;
    const r = subscribe(o.id, viewer.holderId, amt);
    if (r.ok) onClose();
  };

  return (
    <Drawer open onClose={onClose} title={`Subscribe · ${o.name}`}>
      <div className="flex items-center gap-3">
        <CompanyMark name={company?.name ?? "?"} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-navy">{o.name}</p>
          <p className="text-[12.5px] text-tide">
            {company?.name} · {cls?.name} ({cls?.symbol})
          </p>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-line-soft border-y border-line-soft">
        <KV label="Price per share">
          <span className="readout">{fmtUsd(o.pricePerShare)}</span>
        </KV>
        <KV label="Minimum ticket">
          <span className="readout">{fmtUsd(o.minTicket, 0)}</span>
        </KV>
        <KV label="Raised">
          <span className="readout">
            {fmtUsd(raised, 0)} of {fmtUsd(o.maxRaise, 0)}
          </span>
        </KV>
        <KV label={isOpen ? "Closes" : "Opens"}>
          {fmtDateTime(isOpen ? o.closesAt : o.opensAt)} ({fmtRelative(isOpen ? o.closesAt : o.opensAt, now)})
        </KV>
        <KV label="Required claims">{o.requiredClaims.map((t) => CLAIM_LABEL[t]).join(", ")}</KV>
      </dl>

      {doc && (
        <Link href="/portfolio/documents" className="surface mt-4 flex items-center gap-3 p-3.5 transition-colors hover:bg-haze-2">
          <FileText className="size-4 shrink-0 text-lagoon" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-navy">{doc.title}</span>
            <span className="font-mono text-[11px] text-fog">Anchored {fmtDay(doc.anchoredAt)} · {shortHex(doc.hash)}</span>
          </span>
          <span className="text-[12px] text-tide">Read</span>
        </Link>
      )}

      <SectionTitle>Your subscription</SectionTitle>
      {!isOpen && <Notice tone="info">This offering opens {fmtRelative(o.opensAt, now)}. You can subscribe once it opens.</Notice>}
      <div className="space-y-4">
        <Field label="Amount" hint={existing > 0 ? `Adds to your existing ${fmtUsd(existing, 0)}.` : `At least ${fmtUsd(o.minTicket, 0)}.`}>
          <Input inputMode="decimal" placeholder={String(o.minTicket)} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} suffix="USDG" disabled={!isOpen} />
        </Field>
        {error && <p className="text-[12.5px] text-rose-deep">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <StatPill label="Shares at offering price" value={fmtShares(shares)} sub={cls?.symbol} />
          <StatPill label="If it closed now" value={fmtShares(allocShares)} sub={refund > 0.005 ? `${fmtUsd(refund)} refunded` : "Fully allocated"} tone={over ? "amber" : undefined} />
        </div>
        <p className="text-[12.5px] leading-relaxed text-tide">
          {over
            ? `Subscriptions exceed the ${fmtUsd(o.maxRaise, 0)} maximum, so allocation is pro-rata: each subscriber receives the same fraction of their subscription, and the excess is refunded at close.`
            : `If subscriptions go above the ${fmtUsd(o.maxRaise, 0)} maximum, allocation becomes pro-rata and the excess is refunded at close. If the minimum is not reached, every subscription is refunded in full.`}
        </p>

        <CheckLine ok={el.ok} reason={el.ok ? "OK" : el.code} text={el.text || undefined} />
      </div>

      <SectionTitle>Steps</SectionTitle>
      <ol className="frame grid gap-px">
        {[
          { n: "1", t: "Approve USDG", d: `Allow the OfferingVault to take ${valid ? fmtUsd(amt) : "your amount"} from your wallet.` },
          { n: "2", t: "Subscribe", d: "The vault escrows your USDG and records your subscription." },
        ].map((x) => (
          <li key={x.n} className="flex items-start gap-3 px-4 py-3.5">
            <span className="index mt-0.5">0{x.n}</span>
            <span>
              <span className="block text-[13.5px] font-medium text-navy">{x.t}</span>
              <span className="text-[12.5px] text-tide">{x.d}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12.5px] leading-relaxed text-fog">Both are sent together in one transaction. Gas is sponsored, so you only need USDG.</p>

      <div className="mt-5 flex flex-col gap-3 border-t border-line-soft pt-5">
        <Button onClick={submit} disabled={!canSubmit} className="w-full">
          {valid ? `Approve and subscribe ${fmtUsd(amt, 0)}` : "Approve and subscribe"}
        </Button>
        <CallLine className="text-center">OfferingVault.subscribe(offeringId, amount)</CallLine>
      </div>
    </Drawer>
  );
}
