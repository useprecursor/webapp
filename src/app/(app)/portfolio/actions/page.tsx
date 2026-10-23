"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { Badge, Button, EmptyState, Meter, PageBody, PageHeader, Panel, PanelHeader, Table, Td, Th } from "@/components/app/ui";
import { CallLine, CompanyMark } from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import { byId, entitlement, fmtDateTime, fmtDay, fmtPct, fmtRelative, fmtShares, fmtUsd, tally, voteWeight } from "@/lib/precursor/engine";
import type { Proposal } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

export default function Page() {
  const { s, now, viewer, claimDistribution } = useSandbox();
  const holderId = viewer.holderId;

  const dists = useMemo(
    () =>
      s.distributions
        .map((d) => ({ d, e: entitlement(s, d, holderId) }))
        .filter((x) => x.e.entitled > 0)
        .sort((a, b) => b.d.recordAt - a.d.recordAt),
    [s, holderId]
  );
  const proposals = useMemo(() => s.proposals.map((p) => ({ p, weight: voteWeight(s, p, holderId) })).filter((x) => x.weight > 0), [s, holderId]);
  const active = proposals.filter(({ p }) => p.status === "ACTIVE").sort((a, b) => a.p.endsAt - b.p.endsAt);
  const past = proposals.filter(({ p }) => p.status === "FINALIZED").sort((a, b) => b.p.endsAt - a.p.endsAt);

  const claimable = dists.reduce((a, x) => a + x.e.claimable, 0);
  const claimed = dists.reduce((a, x) => a + x.e.claimed, 0);
  const awaiting = active.filter(({ p }) => p.votes[holderId] === undefined && now < p.endsAt).length;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Distributions and votes"
        title="Distributions and votes"
        description="Distributions are paid in USDG to whoever held shares at the record date, and you claim them when you choose. Votes are weighted by your balance at the snapshot block, so buying or selling afterward does not change your weight."
        stats={[
          { label: "Claimable now", value: fmtUsd(claimable), hint: `${dists.filter((x) => x.e.claimable > 0).length} distributions`, accent: claimable > 0 ? "amber" : undefined },
          { label: "Claimed to date", value: fmtUsd(claimed), hint: "Paid to your wallet" },
          { label: "Open votes", value: String(active.length), hint: awaiting > 0 ? `${awaiting} waiting for your vote` : "Nothing waiting", accent: awaiting > 0 ? "lagoon" : undefined },
          { label: "Past votes", value: String(past.length), hint: "Where you held weight" },
        ]}
      />
      <PageBody className="space-y-6">
        <Panel>
          <PanelHeader eyebrow="Distributions" title="Your entitlements" description="Your entitlement is the distribution amount times your share of the class supply at the record date. Unclaimed amounts stay claimable until any claim deadline." />
          {dists.length === 0 ? (
            <EmptyState title="No distributions for you" body="When a company pays a distribution on a class you held at its record date, your entitlement appears here." />
          ) : (
            <Table minWidth={860}>
              <thead>
                <tr>
                  <Th>Distribution</Th>
                  <Th>Record date</Th>
                  <Th className="text-right">Entitled</Th>
                  <Th className="text-right">Claimed</Th>
                  <Th className="text-right">Claimable</Th>
                  <Th>Deadline</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {dists.map(({ d, e }) => {
                  const company = byId(s.companies, d.companyId);
                  const cls = byId(s.classes, d.classId);
                  return (
                    <tr key={d.id}>
                      <Td>
                        <span className="flex items-center gap-3">
                          <CompanyMark name={company?.name ?? "?"} size={30} />
                          <span className="min-w-0">
                            <span className="block font-medium text-navy">{d.name}</span>
                            <span className="text-[12px] text-fog">
                              {company?.name} · {cls?.symbol} · {fmtUsd(d.amount, 0)} total
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td>{fmtDay(d.recordAt)}</Td>
                      <Td className="readout text-right text-navy">{fmtUsd(e.entitled)}</Td>
                      <Td className="readout text-right">{fmtUsd(e.claimed)}</Td>
                      <Td className={cn("readout text-right", e.claimable > 0 ? "text-amber-deep" : "text-fog")}>{fmtUsd(e.claimable)}</Td>
                      <Td>{d.claimDeadline ? fmtDay(d.claimDeadline) : "None"}</Td>
                      <Td className="text-right">
                        {e.claimable > 0 ? (
                          <Button className="btn-sm" onClick={() => claimDistribution(d.id, holderId)}>
                            Claim {fmtUsd(e.claimable, 0)}
                          </Button>
                        ) : (
                          <Badge tone="leaf">Claimed</Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {dists.length > 0 && <CallLine className="mt-4">DistributionVault.claim(distributionId)</CallLine>}
        </Panel>

        <section className="space-y-4">
          <div className="section-rule">
            <span>Open votes</span>
            <span>{active.length}</span>
          </div>
          {active.length === 0 ? (
            <Panel>
              <EmptyState title="No open votes" body="Votes on classes you held at the snapshot appear here while they are open." />
            </Panel>
          ) : (
            active.map(({ p, weight }) => <ProposalCard key={p.id} p={p} weight={weight} />)
          )}
        </section>

        <Panel>
          <PanelHeader eyebrow="History" title="Past votes" description="Results are final once the proposal is finalized on-chain." />
          {past.length === 0 ? (
            <p className="text-[13.5px] text-fog">No past votes where you held weight.</p>
          ) : (
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>Proposal</Th>
                  <Th>Ended</Th>
                  <Th>Type</Th>
                  <Th>Your vote</Th>
                  <Th>Turnout</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody>
                {past.map(({ p }) => {
                  const t = tally(s, p);
                  const company = byId(s.companies, p.companyId);
                  const mine = p.votes[holderId];
                  return (
                    <tr key={p.id}>
                      <Td>
                        <span className="block font-medium text-navy">{p.title}</span>
                        <span className="text-[12px] text-fog">{company?.name}</span>
                      </Td>
                      <Td>{fmtDay(p.endsAt)}</Td>
                      <Td>{p.binding ? "Binding" : "Advisory"}</Td>
                      <Td>{mine === undefined ? <span className="text-fog">Did not vote</span> : p.options[mine]}</Td>
                      <Td className="readout">{t.eligible > 0 ? fmtPct((t.cast / t.eligible) * 100) : "0.0%"}</Td>
                      <Td>{p.result === undefined || p.result === 255 ? <Badge tone="amber">Quorum not met</Badge> : <Badge tone="leaf">{p.options[p.result]}</Badge>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      </PageBody>
    </>
  );
}

function ProposalCard({ p, weight }: { p: Proposal; weight: number }) {
  const { s, now, viewer, castVote } = useSandbox();
  const company = byId(s.companies, p.companyId);
  const classes = p.classIds.map((c) => byId(s.classes, c)?.symbol).filter(Boolean);
  const t = tally(s, p);
  const mine = p.votes[viewer.holderId];
  const ended = now >= p.endsAt;
  const turnout = t.eligible > 0 ? (t.cast / t.eligible) * 100 : 0;
  const quorum = p.quorumBps / 100;
  const leading = t.cast > 0 ? t.weights.indexOf(Math.max(...t.weights)) : -1;

  return (
    <Panel>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={p.binding ? "lagoon" : "muted"}>{p.binding ? "Binding" : "Advisory"}</Badge>
            <span className="font-mono text-[11px] text-fog">
              {company?.name} · {classes.join(", ")}
            </span>
          </div>
          <h3 className="mt-3 font-sans text-[18px] font-semibold tracking-[-0.02em] text-navy">{p.title}</h3>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tide">{p.summary}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="caption">{ended ? "Ended" : "Ends"}</p>
          <p className="readout mt-1 text-[15px] text-navy">{fmtRelative(p.endsAt, now)}</p>
          <p className="text-[12px] text-fog">{fmtDateTime(p.endsAt)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          {p.options.map((opt, i) => {
            const pct = t.cast > 0 ? (t.weights[i] / t.cast) * 100 : 0;
            const chosen = mine === i;
            return (
              <div key={opt} className={cn("rounded-2xl border px-4 py-3", chosen ? "border-lagoon-line bg-lagoon-faint" : "border-line-soft bg-haze/60")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-[14px] font-medium text-navy">
                    {chosen && <Check className="size-4 text-lagoon" aria-hidden="true" />}
                    {opt}
                    {i === leading && <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fog">Leading</span>}
                  </span>
                  <span className="readout text-[12.5px] text-tide">
                    {fmtShares(t.weights[i])} · {fmtPct(pct)}
                  </span>
                </div>
                <Meter value={pct} className="mt-2.5 h-1.5" />
              </div>
            );
          })}
        </div>

        <div className="surface flex flex-col p-4">
          <p className="caption">Quorum</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="readout font-display text-[22px] text-navy">{fmtPct(turnout)}</span>
            <span className="readout text-[12px] text-fog">needs {fmtPct(quorum, 0)}</span>
          </div>
          <div className="relative mt-2">
            <Meter value={turnout} tone={t.quorumMet ? "lagoon" : "amber"} />
            <span className="absolute -top-1 h-4 w-px bg-navy/60" style={{ left: `${Math.min(100, quorum)}%` }} aria-hidden="true" />
          </div>
          <p className="mt-2 text-[12px] text-fog">
            {t.quorumMet ? "Quorum met." : "Quorum not met yet."} {fmtShares(t.cast)} of {fmtShares(t.eligible)} votes cast.
          </p>

          <div className="mt-4 border-t border-line-soft pt-4">
            <p className="caption">Your weight</p>
            <p className="readout mt-1 text-[15px] text-navy">{fmtShares(weight)} votes</p>
            <p className="text-[12px] text-fog">Balance at snapshot, {fmtDay(p.snapshotAt)}</p>
          </div>

          <div className="mt-4 border-t border-line-soft pt-4">
            {mine !== undefined ? (
              <p className="text-[13.5px] text-navy">
                You voted <span className="font-semibold">{p.options[mine]}</span>. Each holder votes once.
              </p>
            ) : ended ? (
              <p className="text-[13.5px] text-fog">Voting has ended. The result is published when the proposal is finalized.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {p.options.map((opt, i) => (
                  <Button key={opt} variant={i === 0 ? "primary" : "secondary"} className="btn-sm w-full" onClick={() => castVote(p.id, viewer.holderId, i)}>
                    {opt}
                  </Button>
                ))}
                <CallLine className="mt-1 text-center">Governance.castVote(proposalId, support)</CallLine>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
