"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
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
  Select,
  Table,
  Td,
  Th,
  StatPill,
} from "@/components/app/ui";
import {
  CallLine,
  CheckLine,
  claimableTotal,
  CompanyMark,
  DAY,
  KV,
  positionsOf,
  SectionTitle,
  SEGMENT_META,
  segmentsOf,
  StackedBar,
  type Position,
  type SegmentKey,
} from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import {
  byId,
  canTransfer,
  CLAIM_LABEL,
  claimState,
  fmtCompactUsd,
  fmtDay,
  fmtShares,
  fmtUsd,
  identityStatus,
  moduleConfig,
  shortHex,
  VALUATION_SOURCE_LABEL,
  vestedOf, plural } from "@/lib/precursor/engine";
import type { Grant, Lot } from "@/lib/precursor/types";

const SOURCE_LABEL: Record<Lot["source"], string> = {
  ISSUANCE: "Issuance",
  OFFERING: "Offering",
  WINDOW: "Liquidity Window",
  RFQ: "RFQ",
  TRANSFER: "Transfer",
  GRANT: "Grant",
};

export default function Page() {
  const { s, now, viewer } = useSandbox();
  const holder = byId(s.holders, viewer.holderId);
  const positions = useMemo(() => positionsOf(s, viewer.holderId, now), [s, viewer.holderId, now]);
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const open = positions.find((p) => p.cls.id === openId);

  const total = positions.reduce((a, p) => a + p.value, 0);
  const unlocked = positions.reduce((a, p) => a + p.unlockedValue, 0);
  const claimable = claimableTotal(s, viewer.holderId);

  if (!holder) {
    return (
      <PageBody>
        <EmptyState title="Your identity is loading" body="Your holder record is created the first time you sign in. Refresh the page if it does not appear." />
      </PageBody>
    );
  }

  return (
    <>
      <PageHeader
        variant="sky"
        eyebrow="Portfolio"
        title={holder.name}
        description="Every share you hold across companies on Precursor, valued at each class's latest Reference Valuation. Locked shares release on their own as holding periods end and grants vest."
        stats={[
          { label: "Estimated value", value: fmtCompactUsd(total), hint: "At latest Reference Valuations", accent: "lagoon" },
          { label: "Positions", value: String(positions.length), hint: plural(new Set(positions.map((p) => p.company.id)).size, "company", "companies") },
          { label: "Unlocked value", value: fmtCompactUsd(unlocked), hint: total > 0 ? `${((unlocked / total) * 100).toFixed(1)}% of holdings` : "Nothing held yet", accent: unlocked > 0 ? "leaf" : undefined },
          { label: "Claimable distributions", value: fmtUsd(claimable), hint: claimable > 0 ? "Ready to claim" : "Nothing to claim", accent: claimable > 0 ? "amber" : undefined },
        ]}
      />
      <PageBody className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel>
            <PanelHeader
              eyebrow="Holdings"
              title="Share classes you hold"
              description="Select a row for its lots, vesting and transfer rules."
              action={
                <Link href="/portfolio/invest" className="btn btn-secondary btn-sm">
                  Browse offerings
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {positions.length === 0 ? (
              <EmptyState
                title="No shares yet"
                body="When you subscribe to an offering or buy in a Liquidity Window, your shares appear here with their lots and unlock dates."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href="/portfolio/invest" className="btn btn-primary btn-sm">
                      See open offerings
                    </Link>
                    <Link href="/portfolio/liquidity" className="btn btn-secondary btn-sm">
                      Liquidity Windows
                    </Link>
                  </div>
                }
              />
            ) : (
              <Table minWidth={860}>
                <thead>
                  <tr>
                    <Th>Company</Th>
                    <Th>Class</Th>
                    <Th className="text-right">Balance</Th>
                    <Th>Reference Valuation</Th>
                    <Th className="text-right">Value</Th>
                    <Th>Unlocked vs locked</Th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.cls.id} className="cursor-pointer" onClick={() => setOpenId(p.cls.id)}>
                      <Td>
                        <button type="button" onClick={() => setOpenId(p.cls.id)} className="flex items-center gap-3 text-left">
                          <CompanyMark name={p.company.name} size={32} />
                          <span className="font-medium text-navy">{p.company.name}</span>
                        </button>
                      </Td>
                      <Td>
                        <span className="block text-navy">{p.cls.name}</span>
                        <span className="font-mono text-[11.5px] text-fog">{p.cls.symbol}</span>
                      </Td>
                      <Td className="readout text-right text-navy">{fmtShares(p.b.balance)}</Td>
                      <Td>
                        {p.valuation ? (
                          <>
                            <span className="readout block text-navy">{fmtUsd(p.price)}</span>
                            <span className="text-[11.5px] text-fog">
                              {VALUATION_SOURCE_LABEL[p.valuation.source]}, {fmtDay(p.valuation.asOf)}
                            </span>
                          </>
                        ) : (
                          <span className="text-fog">Not published</span>
                        )}
                      </Td>
                      <Td className="readout text-right font-medium text-navy">{fmtUsd(p.value, 0)}</Td>
                      <Td className="w-[200px]">
                        <StackedBar parts={segmentsOf(p.b)} total={p.b.balance} />
                        <span className="mt-1.5 block font-mono text-[11px] text-fog">
                          {fmtShares(p.b.unlocked)} unlocked · {fmtShares(p.b.balance - p.b.unlocked)} locked
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {positions.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {(Object.keys(SEGMENT_META) as SegmentKey[]).map((k) => (
                  <span key={k} className="flex items-center gap-2 text-[12px] text-fog">
                    <span className="size-2 rounded-[2px]" style={{ background: SEGMENT_META[k].color }} aria-hidden="true" />
                    {SEGMENT_META[k].label}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <IdentitySummary />
        </div>
      </PageBody>

      {open && <PositionDrawer key={open.cls.id} position={open} onClose={close} />}
    </>
  );
}

function IdentitySummary() {
  const { s, now, viewer } = useSandbox();
  const holder = byId(s.holders, viewer.holderId)!;
  const status = identityStatus(holder, now);
  const topics = [...new Set(holder.claims.map((c) => c.topic))];
  const states = topics.map((t) => ({ topic: t, state: claimState(holder, t, now) }));
  const expiring = states.filter((x) => x.state === "expiring" || x.state === "expired");

  return (
    <Panel className="h-fit">
      <div className="flex items-center justify-between gap-3">
        <span className="icon-tile size-10">
          <ShieldCheck className="size-[18px]" aria-hidden="true" />
        </span>
        <Badge tone={status === "VERIFIED" ? "leaf" : status === "CLAIM_EXPIRED" ? "amber" : "rose"}>
          {status === "VERIFIED" ? "Verified" : status === "CLAIM_EXPIRED" ? "Claim expired" : "Not verified"}
        </Badge>
      </div>
      <h2 className="mt-4 font-sans text-[16px] font-semibold tracking-[-0.02em]">Identity</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-tide">
        {status === "VERIFIED"
          ? "Your identity is registered, so every share class can check your claims without seeing personal data."
          : "Transfers to and from your wallet are blocked until your identity claims are current."}
      </p>
      <dl className="mt-4 divide-y divide-line-soft border-y border-line-soft">
        <KV label="Identity">
          <span className="font-mono text-[12.5px]">{shortHex(holder.identity)}</span>
        </KV>
        <KV label="Region">{holder.region}</KV>
        <KV label="Eligibility tier">{holder.tier > 0 ? `Tier ${holder.tier}` : "None"}</KV>
        <KV label="Claims">{`${states.filter((x) => x.state === "valid").length} of ${states.length} current`}</KV>
      </dl>
      {expiring.length > 0 && (
        <div className="mt-4">
          <Notice tone="warn">
            {expiring.map((x) => CLAIM_LABEL[x.topic]).join(", ")} {expiring.length === 1 ? "needs" : "need"} renewal soon.
          </Notice>
        </div>
      )}
      <Link href="/account" className="btn btn-secondary btn-sm mt-4 w-full">
        Identity and account
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Panel>
  );
}

function grantMilestone(g: Grant, now: number): string {
  if (g.accelerated) return "Accelerated. Fully vested.";
  const cliff = g.start + g.cliffDays * DAY;
  const end = g.start + g.durationDays * DAY;
  if (now < cliff) return `Cliff on ${fmtDay(cliff)}: ${fmtShares(Math.floor((g.total * g.cliffDays) / g.durationDays))} shares vest.`;
  if (now < end) return `Vests daily until ${fmtDay(end)}.`;
  return `Fully vested on ${fmtDay(end)}.`;
}

function PositionDrawer({ position, onClose }: { position: Position; onClose: () => void }) {
  const { s, now, viewer, transfer } = useSandbox();
  const { cls, company, b } = position;
  const seg = segmentsOf(b);
  const hp = moduleConfig(cls, "HOLDING_PERIOD");
  const vesting = moduleConfig(cls, "EMPLOYEE_VESTING");
  const rofr = moduleConfig(cls, "ROFR");
  const lots = s.lots.filter((l) => l.classId === cls.id && l.holderId === viewer.holderId).sort((a, c) => a.acquiredAt - c.acquiredAt);
  const grants = s.grants.filter((g) => g.classId === cls.id && g.holderId === viewer.holderId);

  const recipients = s.holders.filter((h) => h.id !== viewer.holderId).sort((a, c) => a.name.localeCompare(c.name));
  const [toId, setToId] = useState(recipients[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const qty = Math.floor(Number(amount));
  const valid = Number.isFinite(qty) && qty > 0;
  const check = valid && toId ? canTransfer(s, cls.id, viewer.holderId, toId, qty, now) : null;

  const send = () => {
    if (!check?.ok) return;
    const r = transfer(cls.id, viewer.holderId, toId, qty, null);
    if (r.ok) setAmount("");
  };

  return (
    <Drawer open onClose={onClose} title={`${company.name} · ${cls.symbol}`}>
      <div className="flex items-center gap-3">
        <CompanyMark name={company.name} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-navy">{cls.name}</p>
          <p className="font-mono text-[11.5px] text-fog">
            {cls.symbol} · {shortHex(cls.token)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <StatPill label="Balance" value={fmtShares(b.balance)} sub={`${fmtUsd(position.value, 0)}`} />
        <StatPill label="Unlocked" value={fmtShares(b.unlocked)} tone={b.unlocked > 0 ? "leaf" : undefined} sub={fmtUsd(position.unlockedValue, 0)} />
      </div>

      <SectionTitle>Balance breakdown</SectionTitle>
      <StackedBar parts={seg} total={b.balance} className="h-3" />
      <dl className="mt-3 divide-y divide-line-soft">
        {(Object.keys(SEGMENT_META) as SegmentKey[]).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3 py-2">
            <dt className="flex items-center gap-2.5 text-[13px] text-tide">
              <span className="size-2 rounded-[2px]" style={{ background: SEGMENT_META[k].color }} aria-hidden="true" />
              {SEGMENT_META[k].label}
            </dt>
            <dd className="readout text-[13.5px] text-navy">
              {fmtShares(k === "held" ? b.held : k === "unvested" ? b.unvested : k === "inOrders" ? b.inOrders : k === "frozen" ? b.frozen : b.unlocked)}
            </dd>
          </div>
        ))}
      </dl>
      {b.held > 0 && b.unvested > 0 && (
        <p className="mt-2 text-[12px] leading-snug text-fog">A share that is both unvested and inside its holding period is counted once in the bar.</p>
      )}

      <SectionTitle aside={<span className="font-mono text-[11px] text-fog">{hp ? `${hp.days}-day holding period` : "No holding period"}</span>}>Lots</SectionTitle>
      <div className="overflow-x-auto">
        <table className="ledger w-full min-w-[440px] text-left text-[13px]">
          <thead>
            <tr>
              <th className="pb-2 pr-3 text-[12px] font-medium text-fog">Source</th>
              <th className="pb-2 pr-3 text-[12px] font-medium text-fog">Acquired</th>
              <th className="pb-2 pr-3 text-right text-[12px] font-medium text-fog">Quantity</th>
              <th className="pb-2 text-[12px] font-medium text-fog">Holding period ends</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => {
              const end = hp ? l.acquiredAt + hp.days * DAY : null;
              return (
                <tr key={l.id}>
                  <td className="py-2.5 pr-3 text-tide">{SOURCE_LABEL[l.source]}</td>
                  <td className="py-2.5 pr-3 text-tide">{fmtDay(l.acquiredAt)}</td>
                  <td className="readout py-2.5 pr-3 text-right text-navy">{fmtShares(l.quantity)}</td>
                  <td className="py-2.5">
                    {end === null ? (
                      <span className="text-fog">None</span>
                    ) : end > now ? (
                      <span className="flex items-center gap-2">
                        <Badge tone="amber">Held</Badge>
                        <span className="text-tide">{fmtDay(end)}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Badge tone="leaf">Free</Badge>
                        <span className="text-fog">{fmtDay(end)}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-fog">Lots are consumed oldest first when you sell or transfer.</p>

      {grants.length > 0 && (
        <>
          <SectionTitle aside={!vesting && <span className="font-mono text-[11px] text-fog">Vesting not enforced on-chain</span>}>Vesting grants</SectionTitle>
          <div className="space-y-3">
            {grants.map((g) => {
              const vested = vestedOf(g, now);
              return (
                <div key={g.id} className="surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="readout text-[15px] text-navy">
                      {fmtShares(vested)} <span className="text-fog">of {fmtShares(g.total)} vested</span>
                    </span>
                    <span className="readout text-[12.5px] text-tide">{((vested / g.total) * 100).toFixed(1)}%</span>
                  </div>
                  <Meter value={(vested / g.total) * 100} className="mt-3" />
                  <p className="mt-2.5 text-[12.5px] text-tide">{grantMilestone(g, now)}</p>
                  <p className="mt-1 font-mono text-[11px] text-fog">
                    {g.cliffDays}-day cliff · {Math.round(g.durationDays / 365)}-year schedule · started {fmtDay(g.start)}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle>Send shares</SectionTitle>
      <div className="surface space-y-4 p-4">
        {rofr && (
          <Notice tone="info">
            {cls.symbol} gives {rofr.holder} a right of first refusal, so a direct transfer to another holder returns ROFR_PENDING. Sell through a Liquidity Window instead, which is exempt. Transfers to the company treasury are allowed.
          </Notice>
        )}
        <Field label="Recipient">
          <Select value={toId} onChange={(e) => setToId(e.target.value)}>
            {recipients.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({shortHex(h.wallets[0])})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount" hint={`Up to ${fmtShares(b.unlocked)} unlocked shares.`}>
          <Input inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} suffix={cls.symbol} />
        </Field>
        {check ? (
          <div>
            <CheckLine ok={check.ok} reason={check.reason} />
            <ol className="mt-3 space-y-1">
              {check.trace.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                  <span className="text-tide">{t.step}</span>
                  <span className={t.result === "OK" ? "text-leaf-deep" : "text-rose-deep"}>{t.result}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-[12.5px] text-fog">Enter an amount to preview canTransfer for this recipient.</p>
        )}
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
          <CallLine>PrecursorShareToken.transfer(to, amount)</CallLine>
          <Button onClick={send} disabled={!check?.ok} className="btn-sm">
            Send {valid ? fmtShares(qty) : ""} {cls.symbol}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
