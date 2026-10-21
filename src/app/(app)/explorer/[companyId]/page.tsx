"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import { Address, Badge, EmptyState, Meter, PageBody, PageHeader, Panel, PanelHeader, Table, Td, Th } from "@/components/app/ui";
import { CompanyMark, KV, moduleSentence, SectionTitle } from "@/components/app/holder-kit";
import { EventFeed } from "@/components/app/explorer-feed";
import { useSandbox } from "@/lib/precursor/store";
import {
  byId,
  classesOf,
  DOCUMENT_LABEL,
  fmtCompactUsd,
  fmtDay,
  fmtPct,
  fmtShares,
  fmtUsd,
  holdersOf,
  latestValuation,
  MODULE_META,
  shortHex,
  tally,
  totalSupply,
  VALUATION_SOURCE_LABEL,
} from "@/lib/precursor/engine";
import type { ShareClass } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

export default function Page() {
  const params = useParams<{ companyId: string }>();
  const { s } = useSandbox();
  const company = byId(s.companies, params?.companyId);

  if (!company) {
    return (
      <PageBody className="pt-12">
        <EmptyState
          title="Company not found"
          body="No company with this id is registered on Precursor."
          action={
            <Link href="/explorer" className="btn btn-secondary btn-sm">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to Explorer
            </Link>
          }
        />
      </PageBody>
    );
  }

  return <CompanyView companyId={company.id} />;
}

function CompanyView({ companyId }: { companyId: string }) {
  const { s, now } = useSandbox();
  const company = byId(s.companies, companyId)!;
  const classes = classesOf(s, companyId);
  const holderIds = new Set(classes.flatMap((c) => holdersOf(s, c.id).map((x) => x.holder.id)));
  const offerings = s.offerings.filter((o) => o.companyId === companyId).sort((a, b) => b.opensAt - a.opensAt);
  const windows = s.windows.filter((w) => w.companyId === companyId).sort((a, b) => b.opensAt - a.opensAt);
  const distributions = s.distributions.filter((d) => d.companyId === companyId);
  const proposals = s.proposals.filter((p) => p.companyId === companyId);
  const docs = s.documents.filter((d) => d.companyId === companyId).sort((a, b) => b.anchoredAt - a.anchoredAt);
  const events = useMemo(() => s.events.filter((e) => e.companyId === companyId), [s.events, companyId]);
  const capitalized = classes.reduce((sum, c) => sum + totalSupply(s, c.id) * (latestValuation(s, c.id)?.price ?? 0), 0);
  const raised = offerings.reduce((sum, o) => sum + (o.status === "CLOSED" ? (o.result?.raised ?? 0) : 0), 0);

  return (
    <>
      <PageHeader
        variant="sky"
        eyebrow={`Explorer · ${company.id}`}
        title={company.name}
        description={company.description}
        action={
          <Link href="/explorer" className="btn btn-secondary btn-sm">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All companies
          </Link>
        }
        stats={[
          { label: "Share classes", value: String(classes.length) },
          { label: "Holders", value: holderIds.size.toLocaleString("en-US"), hint: "Distinct verified identities" },
          { label: "Value at Reference Valuations", value: fmtCompactUsd(capitalized), accent: "lagoon" },
          { label: "Raised on Precursor", value: fmtCompactUsd(raised), hint: `${offerings.filter((o) => o.status === "CLOSED").length} closed offerings` },
        ]}
      />
      <PageBody className="space-y-6">
        <Panel>
          <div className="grid gap-x-10 md:grid-cols-2">
            <dl className="divide-y divide-line-soft">
              <KV label="Legal name">{company.legalName}</KV>
              <KV label="Sector">{company.sector}</KV>
              <KV label="Headquarters">{company.hq}</KV>
            </dl>
            <dl className="divide-y divide-line-soft border-t border-line-soft md:border-t-0">
              <KV label="Founded">{company.founded}</KV>
              <KV label="Onboarded">{fmtDay(company.onboardedAt)}</KV>
              <KV label="Website">
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="size-3.5 text-fog" aria-hidden="true" />
                  {company.website}
                </span>
              </KV>
            </dl>
          </div>
        </Panel>

        <div className="section-rule">
          <span>Share classes</span>
          <span>{classes.length}</span>
        </div>
        {classes.map((c) => (
          <ClassPanel key={c.id} cls={c} />
        ))}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader eyebrow="Capital" title="Offerings" description="Primary raises through the OfferingVault." />
            {offerings.length === 0 ? (
              <p className="text-[13.5px] text-fog">No offerings yet.</p>
            ) : (
              <Table minWidth={480}>
                <thead>
                  <tr>
                    <Th>Offering</Th>
                    <Th className="text-right">Price</Th>
                    <Th className="text-right">Raised</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((o) => {
                    const r = o.result?.raised ?? o.subscriptions.reduce((a, x) => a + x.amount, 0);
                    return (
                      <tr key={o.id}>
                        <Td>
                          <span className="block font-medium text-navy">{o.name}</span>
                          <span className="text-[12px] text-fog">
                            {byId(s.classes, o.classId)?.symbol} · {fmtDay(o.opensAt)} to {fmtDay(o.closesAt)}
                          </span>
                        </Td>
                        <Td className="readout text-right">{fmtUsd(o.pricePerShare)}</Td>
                        <Td className="readout text-right text-navy">{fmtCompactUsd(r)}</Td>
                        <Td>
                          <Badge tone={o.status === "OPEN" ? "leaf" : o.status === "CLOSED" ? "lagoon" : o.status === "FAILED" ? "amber" : "muted"}>{o.status}</Badge>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Panel>
          <Panel>
            <PanelHeader eyebrow="Liquidity" title="Liquidity Windows" description="Secondary sales cleared at one uniform price." />
            {windows.length === 0 ? (
              <p className="text-[13.5px] text-fog">No windows yet.</p>
            ) : (
              <Table minWidth={480}>
                <thead>
                  <tr>
                    <Th>Window</Th>
                    <Th className="text-right">Clearing</Th>
                    <Th className="text-right">Volume</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map((w) => (
                    <tr key={w.id}>
                      <Td>
                        <span className="block font-medium text-navy">{w.name}</span>
                        <span className="text-[12px] text-fog">
                          {byId(s.classes, w.classId)?.symbol} · {w.mode === "AUCTION" ? "Auction" : "Tender"} · {fmtDay(w.closesAt)}
                        </span>
                      </Td>
                      <Td className="readout text-right">{w.result && w.result.volume > 0 ? fmtUsd(w.result.clearingPrice) : w.mode === "TENDER" ? fmtUsd(w.tenderPrice ?? 0) : "Pending"}</Td>
                      <Td className="readout text-right">{w.result ? fmtShares(w.result.volume) : fmtShares(w.orders.filter((o) => !o.cancelled).length) + " orders"}</Td>
                      <Td>
                        <Badge tone={w.status === "OPEN" ? "leaf" : w.status === "CLEARED" ? "lagoon" : "muted"}>{w.status}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader eyebrow="Distributions" title="Payouts" description="Funded to the DistributionVault, claimed by holders at the record date." />
            {distributions.length === 0 ? (
              <p className="text-[13.5px] text-fog">No distributions yet.</p>
            ) : (
              <ul className="space-y-4">
                {distributions.map((d) => {
                  const claimed = Object.values(d.claimed).reduce((a, b) => a + b, 0);
                  const pct = d.amount > 0 ? (claimed / d.amount) * 100 : 0;
                  return (
                    <li key={d.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] font-medium text-navy">{d.name}</span>
                        <span className="readout text-[12.5px] text-tide">{fmtUsd(d.amount, 0)}</span>
                      </div>
                      <Meter value={pct} className="mt-2 h-1.5" />
                      <p className="mt-1.5 font-mono text-[11px] text-fog">
                        {byId(s.classes, d.classId)?.symbol} · record {fmtDay(d.recordAt)} · {fmtPct(pct)} claimed
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelHeader eyebrow="Governance" title="Votes" description="Token-weighted at the snapshot block." />
            {proposals.length === 0 ? (
              <p className="text-[13.5px] text-fog">No votes yet.</p>
            ) : (
              <ul className="space-y-4">
                {proposals.map((p) => {
                  const t = tally(s, p);
                  const turnout = t.eligible > 0 ? (t.cast / t.eligible) * 100 : 0;
                  const lead = t.weights.indexOf(Math.max(...t.weights));
                  return (
                    <li key={p.id}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[13.5px] font-medium text-navy">{p.title}</span>
                        {p.status === "ACTIVE" ? (
                          <Badge tone="leaf">Active</Badge>
                        ) : p.result === undefined || p.result === 255 ? (
                          <Badge tone="amber">No quorum</Badge>
                        ) : (
                          <Badge tone="lagoon">{p.options[p.result]}</Badge>
                        )}
                      </div>
                      <Meter value={turnout} className="mt-2 h-1.5" tone={t.quorumMet ? "lagoon" : "amber"} />
                      <p className="mt-1.5 font-mono text-[11px] text-fog">
                        {p.binding ? "Binding" : "Advisory"} · turnout {fmtPct(turnout)} of {fmtPct(p.quorumBps / 100, 0)} quorum
                        {p.status === "ACTIVE" && t.cast > 0 ? ` · ${p.options[lead]} leading` : ""} · ends {fmtDay(p.endsAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Panel>
            <PanelHeader eyebrow="Disclosures" title="Anchored documents" description="Every document's hash is public. Holder-only contents open in Portfolio for verified holders." />
            <ul className="divide-y divide-line-soft">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="caption">{DOCUMENT_LABEL[d.kind]}</p>
                    <p className={cn("mt-1 truncate text-[13.5px]", d.visibility === "public" ? "font-medium text-navy" : "text-fog")}>
                      {d.visibility === "public" ? d.title : "Holder-only document"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[11px] text-fog" title={d.hash}>
                      {shortHex(d.hash)} · {fmtDay(d.anchoredAt)}
                    </span>
                    <Badge tone={d.visibility === "public" ? "muted" : "lagoon"}>{d.visibility === "public" ? "Public" : "Holders"}</Badge>
                  </div>
                </li>
              ))}
              {docs.length === 0 && <li className="py-3 text-[13.5px] text-fog">No documents anchored yet.</li>}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader eyebrow="Contracts" title="Contract set" description="Deployed by PrecursorFactory on Robinhood Chain." />
            <dl className="divide-y divide-line-soft">
              {Object.entries(company.contracts).map(([name, a]) => (
                <div key={name} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="truncate font-mono text-[12px] text-tide">{name}</dt>
                  <dd>
                    <Address address={a} size={18} />
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="truncate font-mono text-[12px] text-tide">Treasury</dt>
                <dd>
                  <Address address={company.treasury} size={18} />
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] text-fog">Registrar: {company.registrar}</p>
          </Panel>
        </div>

        <EventFeed events={events} title={`${company.name} events`} showCompany={false} limit={12} />
        <p className="text-center text-[12px] text-fog">Explorer data as of block #{s.block.toLocaleString("en-US")}, {fmtDay(now)}.</p>
      </PageBody>
    </>
  );
}

function ClassPanel({ cls }: { cls: ShareClass }) {
  const { s } = useSandbox();
  const supply = totalSupply(s, cls.id);
  const holders = holdersOf(s, cls.id);
  const vals = s.valuations.filter((v) => v.classId === cls.id).sort((a, b) => b.asOf - a.asOf);
  const latest = vals[0];
  const enabled = cls.modules.filter((m) => m.enabled);
  const maxVal = Math.max(...vals.map((v) => v.price), 1);

  return (
    <Panel>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark name={cls.symbol.replace("-", " ")} size={44} />
          <div className="min-w-0">
            <h3 className="truncate font-sans text-[18px] font-semibold tracking-[-0.02em] text-navy">{cls.name}</h3>
            <p className="font-mono text-[12px] text-fog">{cls.symbol} · Precursor Share Token</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cls.paused ? <Badge tone="rose">Paused</Badge> : <Badge tone="leaf">Active</Badge>}
          <Badge tone={cls.rfqEnabled ? "lagoon" : "muted"}>{cls.rfqEnabled ? "RFQ on" : "RFQ off"}</Badge>
          {cls.pendingMultiplier && <Badge tone="amber">Multiplier change pending</Badge>}
        </div>
      </div>

      <div className="frame mt-5 grid grid-cols-2 gap-px md:grid-cols-4">
        {[
          { l: "Supply", v: fmtShares(supply), h: `of ${fmtShares(cls.authorized)} authorized` },
          { l: "Holders", v: holders.length.toLocaleString("en-US"), h: "Distinct identities" },
          { l: "Multiplier", v: `${cls.multiplier.toFixed(2)}x`, h: cls.pendingMultiplier ? `${cls.pendingMultiplier.value}x on ${fmtDay(cls.pendingMultiplier.effectiveAt)}` : "ERC-8056 uiMultiplier" },
          { l: "Reference Valuation", v: latest ? fmtUsd(latest.price) : "None", h: latest ? `${VALUATION_SOURCE_LABEL[latest.source]}, ${fmtDay(latest.asOf)}` : undefined },
        ].map((x) => (
          <div key={x.l} className="px-4 py-3.5">
            <p className="caption">{x.l}</p>
            <p className="readout mt-1.5 text-[17px] text-navy">{x.v}</p>
            {x.h && <p className="mt-0.5 truncate text-[11.5px] text-fog">{x.h}</p>}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
        <span className="flex items-center gap-2 text-[12px] text-fog">
          Token <Address address={cls.token} size={18} />
        </span>
        <span className="flex items-center gap-2 text-[12px] text-fog">
          RuleEngine <Address address={cls.ruleEngine} size={18} />
        </span>
      </div>

      <div className="mt-2 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle aside={<span className="font-mono text-[11px] text-fog">{enabled.length} active</span>}>Transfer rules</SectionTitle>
          {enabled.length === 0 ? (
            <p className="text-[13px] text-fog">No rule modules. Only identity checks apply.</p>
          ) : (
            <ul className="space-y-3">
              {enabled.map((m) => (
                <li key={m.config.id} className="surface px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13.5px] font-medium text-navy">{MODULE_META[m.config.id].name}</span>
                    <span className="font-mono text-[10.5px] text-fog">{MODULE_META[m.config.id].contract}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-tide">{moduleSentence(s, cls, m.config)}</p>
                  {m.pendingUntil && <p className="mt-1 font-mono text-[11px] text-amber-deep">Timelocked until {fmtDay(m.pendingUntil)}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SectionTitle>Valuation history</SectionTitle>
          {vals.length === 0 ? (
            <p className="text-[13px] text-fog">No Reference Valuations published.</p>
          ) : (
            <ul className="space-y-2.5">
              {vals.map((v) => (
                <li key={v.id}>
                  <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="text-tide">
                      {fmtDay(v.asOf)} · {VALUATION_SOURCE_LABEL[v.source]}
                    </span>
                    <span className="readout text-navy">{fmtUsd(v.price)}</span>
                  </div>
                  <Meter value={(v.price / maxVal) * 100} className="mt-1.5 h-1" />
                </li>
              ))}
            </ul>
          )}

          <SectionTitle>Top holders</SectionTitle>
          <ul className="divide-y divide-line-soft">
            {holders.slice(0, 6).map(({ holder, balance }, i) => (
              <li key={holder.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="index w-4">{i + 1}</span>
                  <Address address={holder.wallets[0]} size={18} />
                </span>
                <span className="readout text-right text-[12.5px]">
                  <span className="text-navy">{fmtShares(balance)}</span>
                  <span className="ml-2 text-fog">{supply > 0 ? fmtPct((balance / supply) * 100, 2) : "0%"}</span>
                </span>
              </li>
            ))}
            {holders.length === 0 && <li className="py-2 text-[13px] text-fog">No holders yet.</li>}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
