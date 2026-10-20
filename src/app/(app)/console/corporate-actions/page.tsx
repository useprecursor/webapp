"use client";

import { useState } from "react";
import { Plus, Split } from "lucide-react";
import { Badge, Button, Drawer, EmptyState, Field, Input, Meter, Notice, PageBody, PageHeader, Panel, PanelHeader, Select, Switch, Table, Td, Th } from "@/components/app/ui";
import { byId, entitlement, fmtCompactUsd, fmtDay, fmtPct, fmtRelative, fmtShares, fmtUsd, supplyAt, tally } from "@/lib/precursor/engine";
import type { Proposal } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";
import { Bar, Call, Checks, Confirm, DAY, ErrorList, FormFooter, Num, fromDateInput, num, toDateInput, useConsole } from "../_components/kit";

export default function Page() {
  const { s, now, company, classes } = useConsole();
  const [drawer, setDrawer] = useState<"fund" | "propose" | null>(null);
  const distributions = s.distributions.filter((d) => d.companyId === company.id).sort((a, b) => b.fundedAt - a.fundedAt);
  const proposals = s.proposals.filter((p) => p.companyId === company.id).sort((a, b) => (a.status === b.status ? b.snapshotAt - a.snapshotAt : a.status === "ACTIVE" ? -1 : 1));

  const funded = distributions.reduce((a, d) => a + d.amount, 0);
  const claimed = distributions.reduce((a, d) => a + Object.values(d.claimed).reduce((x, y) => x + y, 0), 0);
  const active = proposals.filter((p) => p.status === "ACTIVE");
  const nextEnd = active.map((p) => p.endsAt).sort((a, b) => a - b)[0];

  return (
    <>
      <PageHeader
        eyebrow="Console"
        title="Distributions and votes"
        description="Pay holders of record in USDG and run token-weighted votes fixed at a snapshot. Holders claim and vote from Portfolio, with gas sponsored."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="btn-sm" onClick={() => setDrawer("propose")}>
              <Plus className="size-4" aria-hidden="true" />
              New proposal
            </Button>
            <Button className="btn-sm" onClick={() => setDrawer("fund")}>
              <Plus className="size-4" aria-hidden="true" />
              Fund a distribution
            </Button>
          </div>
        }
        stats={[
          { label: "Distributed", value: fmtCompactUsd(funded), hint: `${distributions.length} ${distributions.length === 1 ? "distribution" : "distributions"} funded`, accent: "leaf" },
          { label: "Claimed", value: fmtPct(funded ? (claimed / funded) * 100 : 0), hint: `${fmtUsd(funded - claimed, 0)} unclaimed` },
          { label: "Active votes", value: String(active.length), hint: nextEnd ? `Next ends ${fmtRelative(nextEnd, now)}` : "None open", accent: active.length ? "lagoon" : undefined },
          { label: "Finalized votes", value: String(proposals.length - active.length), hint: "Results recorded on-chain" },
        ]}
      />
      <PageBody className="space-y-5">
        <Panel>
          <PanelHeader eyebrow="DistributionVault" title="Distributions" description="Entitlements are fixed at the record date. Holders pull their share; unclaimed funds stay claimable until the deadline, then return to the treasury." />
          {distributions.length === 0 ? (
            <EmptyState title="No distributions yet" body="Fund a distribution to pay holders of a class in proportion to their balance at the record date." />
          ) : (
            <Table minWidth={820}>
              <thead>
                <tr>
                  <Th>Distribution</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Record date</Th>
                  <Th className="w-[240px]">Claimed</Th>
                  <Th className="text-right">Holders</Th>
                  <Th className="text-right">Deadline</Th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => {
                  const c = Object.values(d.claimed).reduce((a, b) => a + b, 0);
                  const cls = byId(s.classes, d.classId);
                  const entitled = s.holders.map((h) => entitlement(s, d, h.id)).filter((e) => e.entitled > 0);
                  const paid = entitled.filter((e) => e.claimable === 0).length;
                  return (
                    <tr key={d.id}>
                      <Td>
                        <div className="font-medium text-navy">{d.name}</div>
                        <div className="font-mono text-[11px] text-fog">
                          {cls?.symbol} · {d.asset} · funded {fmtDay(d.fundedAt)}
                        </div>
                      </Td>
                      <Td className="text-right">
                        <Num>{fmtUsd(d.amount, 0)}</Num>
                        <div className="font-mono text-[11px] text-fog">{fmtUsd(d.amount / Math.max(1, supplyAt(s, d.classId, d.recordAt)), 4)} per share</div>
                      </Td>
                      <Td className="text-right text-[12.5px]">{fmtDay(d.recordAt)}</Td>
                      <Td>
                        <Meter value={(c / d.amount) * 100} className="h-1.5" />
                        <div className="mt-1.5 flex justify-between font-mono text-[11px]">
                          <span className="text-navy">{fmtUsd(c, 0)}</span>
                          <span className="text-fog">{fmtPct((c / d.amount) * 100)}</span>
                        </div>
                      </Td>
                      <Td className="text-right">
                        <Num>
                          {paid} <span className="text-fog">/ {entitled.length}</span>
                        </Num>
                      </Td>
                      <Td className="whitespace-nowrap text-right text-[12.5px]">{d.claimDeadline ? fmtDay(d.claimDeadline) : "None"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <Call className="mt-4">DistributionVault.claim(distributionId), called by each holder</Call>
        </Panel>

        <div>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <div>
              <p className="caption">Governance</p>
              <h2 className="mt-1 font-sans text-[18px] font-semibold tracking-[-0.02em]">Votes</h2>
            </div>
            <span className="text-[12px] text-fog">Weight is balance at the snapshot, times the multiplier.</span>
          </div>
          {proposals.length === 0 ? (
            <Panel>
              <EmptyState title="No proposals yet" body="Open a vote for one or more classes. Weights are fixed at the snapshot." />
            </Panel>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {proposals.map((p) => (
                <ProposalCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>

        <Panel>
          <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <span className="icon-tile">
              <Split className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="caption mb-1">ERC-8056 multiplier</p>
              <h2 className="font-sans text-[18px] font-semibold tracking-[-0.02em]">Stock split or reverse split</h2>
              <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tide">
                A split changes the uiMultiplier, not balances. The change is scheduled 48 hours ahead through the IssuerTimelock and emits MultiplierScheduled, so wallets and integrators see it coming. Raw balances never change, and the ValuationOracle pauses across the change.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11.5px] text-fog">
                {classes.map((c) => (
                  <span key={c.id}>
                    {c.symbol} {c.multiplier.toFixed(4)}x{c.pendingMultiplier ? `, ${c.pendingMultiplier.value}x ${fmtRelative(c.pendingMultiplier.effectiveAt, now)}` : ""}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <Button variant="secondary" className="btn-sm" disabled>
                Schedule a split
              </Button>
              <Call>PrecursorShareToken.scheduleMultiplier</Call>
            </div>
          </div>
        </Panel>
      </PageBody>

      <Drawer open={drawer === "fund"} onClose={() => setDrawer(null)} title="Fund a distribution">
        {classes.length > 0 && <FundForm onDone={() => setDrawer(null)} />}
      </Drawer>
      <Drawer open={drawer === "propose"} onClose={() => setDrawer(null)} title="New proposal">
        {classes.length > 0 && <ProposalForm onDone={() => setDrawer(null)} />}
      </Drawer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* A proposal                                                          */
/* ------------------------------------------------------------------ */

function ProposalCard({ p }: { p: Proposal }) {
  const { s, now, finalizeProposal } = useConsole();
  const t = tally(s, p);
  const turnout = t.eligible ? (t.cast / t.eligible) * 100 : 0;
  const quorum = p.quorumBps / 100;
  const ended = now >= p.endsAt;
  const leading = t.cast ? t.weights.indexOf(Math.max(...t.weights)) : -1;
  const symbols = p.classIds.map((id) => byId(s.classes, id)?.symbol).filter(Boolean).join(", ");

  return (
    <Panel className={cn(p.status === "ACTIVE" && "edge-lit")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {p.status === "ACTIVE" ? <Badge tone="lagoon">{ended ? "Ended" : "Active"}</Badge> : <Badge tone="leaf">Finalized</Badge>}
        <Badge tone={p.binding ? "amber" : "muted"}>{p.binding ? "Binding" : "Advisory"}</Badge>
        <span className="font-mono text-[11px] text-fog">{symbols}</span>
      </div>
      <h3 className="text-[16px] font-semibold leading-snug text-navy">{p.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-tide">{p.summary}</p>

      <div className="mt-5 space-y-3">
        {p.options.map((o, i) => {
          const won = p.status === "FINALIZED" && p.result === i;
          return (
            <div key={`${o}-${i}`}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn(won || (p.status === "ACTIVE" && leading === i) ? "font-medium text-navy" : "text-tide")}>
                  {o}
                  {won && <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-leaf-deep">Carried</span>}
                </span>
                <span className="readout font-mono text-[12px] text-tide">
                  {fmtShares(t.weights[i])} <span className="text-fog">· {t.cast ? fmtPct((t.weights[i] / t.cast) * 100) : "0.0%"}</span>
                </span>
              </div>
              <Bar value={t.weights[i]} max={t.cast || 1} tone={won ? "leaf" : i === leading ? "lagoon" : "muted"} />
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl bg-haze px-4 py-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
          <span className="text-tide">
            Turnout <span className="readout font-mono text-navy">{fmtPct(turnout)}</span> of {fmtShares(t.eligible)} eligible
          </span>
          {t.quorumMet ? <Badge tone="leaf">Quorum met</Badge> : <Badge tone="amber">Quorum {fmtPct(quorum, 0)}</Badge>}
        </div>
        <Bar value={turnout} max={100} marker={quorum} tone={t.quorumMet ? "leaf" : "amber"} />
        <div className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-[11px] text-fog">
          <span>{Object.keys(p.votes).length} ballots</span>
          <span>Snapshot {fmtDay(p.snapshotAt)}</span>
          <span>{ended ? `Ended ${fmtDay(p.endsAt)}` : `Ends ${fmtRelative(p.endsAt, now)}`}</span>
        </div>
      </div>

      {p.status === "ACTIVE" ? (
        <div className="mt-5">
          <Confirm
            variant={ended ? "primary" : "secondary"}
            label="Finalize"
            confirmLabel="Finalize now"
            message={
              <>
                {!ended && `Voting is open for another ${fmtRelative(p.endsAt, now).replace("in ", "")}. Finalizing now closes it early. `}
                {t.quorumMet ? `"${p.options[leading]}" carries with ${fmtPct((t.weights[leading] / t.cast) * 100)} of votes cast.` : "Quorum is not met, so the proposal finalizes with no result."} The outcome is recorded on-chain with ProposalFinalized.
              </>
            }
            onConfirm={() => finalizeProposal(p.id)}
          />
          <Call className="mt-2">Governance.finalize(proposalId)</Call>
        </div>
      ) : (
        <p className="mt-5 text-[13px] text-tide">
          Result: <span className="font-medium text-navy">{p.result === undefined || p.result === 255 ? "Quorum not met" : p.options[p.result]}</span>
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

function FundForm({ onDone }: { onDone: () => void }) {
  const { s, now, company, classes, fundDistribution } = useConsole();
  const [classId, setClassId] = useState(classes[classes.length - 1].id);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [record, setRecord] = useState(toDateInput(now));
  const [withDeadline, setWithDeadline] = useState(true);
  const [deadline, setDeadline] = useState(toDateInput(now + 366 * DAY));
  const cls = byId(classes, classId)!;

  const amt = num(amount);
  const recordAt = record === toDateInput(now) ? now : fromDateInput(record, now, "end");
  const deadlineAt = fromDateInput(deadline, now, "end");
  const supply = Number.isFinite(recordAt) ? supplyAt(s, classId, recordAt) : 0;

  const errors: string[] = [];
  if (!name.trim()) errors.push("Name the distribution.");
  if (!(amt > 0)) errors.push("Enter an amount above zero.");
  if (!(recordAt <= now + DAY)) errors.push("The record date cannot be in the future.");
  if (withDeadline && !(deadlineAt - recordAt >= 365 * DAY)) errors.push("The claim deadline must be at least 12 months after the record date.");
  if (supply === 0) errors.push(`No ${cls.symbol} was outstanding at that record date.`);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        const r = fundDistribution({ companyId: company.id, classId, name: name.trim(), asset: "USDG", amount: amt, recordAt, claimDeadline: withDeadline ? deadlineAt : undefined });
        if (r.ok) onDone();
      }}
    >
      <p className="mb-5 text-[13.5px] leading-relaxed text-tide">Funds move from the treasury into the DistributionVault. Each holder&apos;s entitlement is their balance at the record date over the supply at that date.</p>
      <div className="space-y-4">
        <Field label="Share class">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Preferred dividend, 2027" />
        </Field>
        <Field label="Amount" hint={amt > 0 && supply > 0 ? `${fmtUsd(amt / supply, 4)} per share across ${fmtShares(supply)} ${cls.symbol}.` : undefined}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" suffix="USDG" />
        </Field>
        <Field label="Record date" hint="Today snapshots balances as of now.">
          <Input type="date" value={record} max={toDateInput(now)} onChange={(e) => setRecord(e.target.value)} />
        </Field>
        <div className="rounded-2xl border border-line px-3 py-1">
          <Switch checked={withDeadline} onChange={setWithDeadline} label="Set a claim deadline" hint="After the deadline, unclaimed funds return to the treasury. The minimum is 12 months after the record date." />
        </div>
        {withDeadline && (
          <Field label="Claim deadline">
            <Input type="date" value={deadline} min={toDateInput((Number.isFinite(recordAt) ? recordAt : now) + 365 * DAY)} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        )}
      </div>
      <ErrorList errors={name || amount ? errors : []} />
      <FormFooter call="DistributionVault.fund(shareToken, asset, amount, recordBlock, claimDeadline, excluded)">
        <Button type="submit" disabled={errors.length > 0}>
          Fund {amt > 0 ? fmtUsd(amt, 0) : "distribution"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}

function ProposalForm({ onDone }: { onDone: () => void }) {
  const { s, now, company, classes, createProposal } = useConsole();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [classIds, setClassIds] = useState<string[]>(classes.map((c) => c.id));
  const [options, setOptions] = useState("For, Against, Abstain");
  const [days, setDays] = useState("7");
  const [quorum, setQuorum] = useState("50");
  const [binding, setBinding] = useState(true);

  const opts = options.split(",").map((o) => o.trim()).filter(Boolean);
  const d = num(days);
  const q = num(quorum);
  const eligible = classIds.reduce((a, id) => a + supplyAt(s, id, now), 0);

  const errors: string[] = [];
  if (!title.trim()) errors.push("Give the proposal a title.");
  if (!classIds.length) errors.push("Choose at least one voting class.");
  if (opts.length < 2) errors.push("List at least two options, separated by commas.");
  if (new Set(opts).size !== opts.length) errors.push("Each option must be different.");
  if (!(d >= 1 && d <= 60 && Number.isInteger(d))) errors.push("Voting runs 1 to 60 whole days.");
  if (!(q > 0 && q <= 100)) errors.push("Set a quorum between 1% and 100%.");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        const r = createProposal({
          companyId: company.id,
          classIds,
          title: title.trim(),
          summary: summary.trim(),
          options: opts,
          snapshotAt: now,
          endsAt: now + d * DAY,
          quorumBps: Math.round(q * 100),
          binding,
        });
        if (r.ok) onDone();
      }}
    >
      <p className="mb-5 text-[13.5px] leading-relaxed text-tide">The snapshot is taken now. Shares acquired after it carry no weight in this vote.</p>
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Approve the 2027 operating plan" />
        </Field>
        <Field label="Summary">
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="input resize-none" placeholder="What holders are voting on, in two or three sentences." />
        </Field>
        <Field label="Voting classes" hint={`${fmtShares(eligible)} shares eligible at the snapshot.`}>
          <Checks<string> value={classIds} onChange={setClassIds} options={classes.map((c) => ({ value: c.id, label: c.name, hint: c.symbol }))} />
        </Field>
        <Field label="Options" hint="Separated by commas.">
          <Input value={options} onChange={(e) => setOptions(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ends in">
            <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" suffix="days" />
          </Field>
          <Field label="Quorum" hint={q > 0 && eligible ? `${fmtShares(Math.ceil((eligible * q) / 100))} shares must vote.` : undefined}>
            <Input value={quorum} onChange={(e) => setQuorum(e.target.value)} inputMode="decimal" suffix="%" />
          </Field>
        </div>
        <div className="rounded-2xl border border-line px-3 py-1">
          <Switch checked={binding} onChange={setBinding} label="Binding" hint="A binding result commits the company. An advisory vote records holder sentiment only." />
        </div>
      </div>
      {d > 0 && <p className="mt-4 font-mono text-[11.5px] text-fog">Snapshot now · ends {fmtDay(now + d * DAY)}</p>}
      <div className="mt-4">
        <Notice tone="info">Holders vote from Portfolio with gas sponsored. Each holder votes once.</Notice>
      </div>
      <ErrorList errors={title ? errors : []} />
      <FormFooter call="Governance.propose(params)">
        <Button type="submit" disabled={errors.length > 0}>
          Open vote
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}
