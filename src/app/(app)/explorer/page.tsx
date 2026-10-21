"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Field, Input, PageBody, PageHeader, Panel, PanelHeader, Select, Table, Td, Th } from "@/components/app/ui";
import { CheckLine, CompanyMark } from "@/components/app/holder-kit";
import { EventFeed } from "@/components/app/explorer-feed";
import { useSandbox } from "@/lib/precursor/store";
import { byId, canTransfer, classesOf, fmtShares, fmtUsd, holdersOf, identityStatus, latestValuation, shortHex } from "@/lib/precursor/engine";
import { cn } from "@/lib/utils";

export default function Page() {
  const { s, now } = useSandbox();
  const verified = s.holders.filter((h) => identityStatus(h, now) === "VERIFIED").length;

  const companies = useMemo(
    () =>
      s.companies.map((c) => {
        const classes = classesOf(s, c.id);
        const holders = new Set(classes.flatMap((cls) => holdersOf(s, cls.id).map((x) => x.holder.id)));
        const vals = classes.map((cls) => ({ cls, v: latestValuation(s, cls.id) })).filter((x) => x.v);
        const latest = vals.sort((a, b) => b.v!.asOf - a.v!.asOf)[0];
        return { c, classes, holders: holders.size, latest };
      }),
    [s]
  );

  return (
    <>
      <PageHeader
        variant="sky"
        eyebrow="Explorer"
        title="Every company on Precursor, on-chain"
        description="Share classes, supply, rules, offerings, windows, valuations and events, read from Robinhood Chain. Wallets appear as addresses. Identity data never leaves the verifier."
        stats={[
          { label: "Companies", value: String(s.companies.length) },
          { label: "Share classes", value: String(s.classes.length), hint: "One Precursor Share Token each" },
          { label: "Verified holders", value: verified.toLocaleString("en-US"), hint: "Identities with current claims", accent: "leaf" },
          { label: "Events indexed", value: s.events.length.toLocaleString("en-US"), hint: `Block #${s.block.toLocaleString("en-US")}`, accent: "lagoon" },
        ]}
      />
      <PageBody className="space-y-6">
        <Panel>
          <PanelHeader eyebrow="Companies" title="Issuers" description="Each company has its own contract set, deployed by PrecursorFactory." />
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Sector</Th>
                <Th>HQ</Th>
                <Th className="text-right">Classes</Th>
                <Th className="text-right">Holders</Th>
                <Th className="text-right">Latest valuation</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {companies.map(({ c, classes, holders, latest }) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/explorer/${c.id}`} className="flex items-center gap-3">
                      <CompanyMark name={c.name} size={32} />
                      <span>
                        <span className="block font-medium text-navy">{c.name}</span>
                        <span className="font-mono text-[11px] text-fog">{c.id}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td>{c.sector}</Td>
                  <Td>{c.hq}</Td>
                  <Td className="readout text-right">{classes.length}</Td>
                  <Td className="readout text-right">{holders.toLocaleString("en-US")}</Td>
                  <Td className="text-right">
                    {latest?.v ? (
                      <>
                        <span className="readout block text-navy">{fmtUsd(latest.v.price)}</span>
                        <span className="font-mono text-[11px] text-fog">{latest.cls.symbol}</span>
                      </>
                    ) : (
                      <span className="text-fog">None</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link href={`/explorer/${c.id}`} className="btn btn-ghost btn-sm">
                      Open
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <EventFeed events={s.events} />
          <div className="space-y-6">
            <TransferCheck />
            <PublicPrivate />
          </div>
        </div>
      </PageBody>
    </>
  );
}

function TransferCheck() {
  const { s, now } = useSandbox();
  const [classId, setClassId] = useState(s.classes[0]?.id ?? "");
  const wallets = useMemo(() => [...s.holders].map((h) => ({ id: h.id, wallet: h.wallets[0] })).sort((a, b) => a.wallet.localeCompare(b.wallet)), [s.holders]);
  const firstHolder = holdersOf(s, classId)[0]?.holder.id ?? wallets[0]?.id ?? "";
  const [fromId, setFromId] = useState(firstHolder);
  const [toId, setToId] = useState(wallets.find((w) => w.id !== firstHolder)?.id ?? "");
  const [amount, setAmount] = useState("1000");
  const qty = Math.floor(Number(amount));
  const cls = byId(s.classes, classId);
  const fromBalance = holdersOf(s, classId).find((x) => x.holder.id === fromId)?.balance ?? 0;
  const result = qty > 0 && fromId && toId && fromId !== toId ? canTransfer(s, classId, fromId, toId, qty, now) : null;

  return (
    <Panel>
      <PanelHeader eyebrow="Public tool" title="Check a transfer" description="Runs canTransfer exactly as the share token would. Anyone can call it; it reads only public state." />
      <div className="space-y-3.5">
        <Field label="Share class">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {s.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol} · {byId(s.companies, c.companyId)?.name} {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Select value={fromId} onChange={(e) => setFromId(e.target.value)} className="font-mono">
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {shortHex(w.wallet)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="To">
            <Select value={toId} onChange={(e) => setToId(e.target.value)} className="font-mono">
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {shortHex(w.wallet)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Amount" hint={`Sender balance: ${fmtShares(fromBalance)} ${cls?.symbol ?? ""}`}>
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} suffix={cls?.symbol} />
        </Field>
        {fromId === toId ? (
          <p className="text-[12.5px] text-fog">Pick two different wallets.</p>
        ) : result ? (
          <>
            <CheckLine ok={result.ok} reason={result.reason} />
            <ol className="space-y-1 pt-1">
              {result.trace.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                  <span className="text-tide">{t.step}</span>
                  <span className={t.result === "OK" ? "text-leaf-deep" : "text-rose-deep"}>{t.result}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-[12.5px] text-fog">Enter an amount above zero.</p>
        )}
        <p className="border-t border-line-soft pt-3 font-mono text-[11px] text-fog">canTransfer(from, to, amount) returns (bool ok, bytes32 reasonCode)</p>
      </div>
    </Panel>
  );
}

function PublicPrivate() {
  const rows = [
    { pub: true, t: "Balances by wallet address, supply and holder counts" },
    { pub: true, t: "Rule modules and their settings on every share class" },
    { pub: true, t: "Offerings, windows, clearing prices and Reference Valuations" },
    { pub: true, t: "Document hashes and the time each was anchored" },
    { pub: false, t: "Names, dates of birth, addresses and verification documents" },
    { pub: false, t: "Holder-only document contents" },
  ];
  return (
    <Panel>
      <PanelHeader eyebrow="Transparency" title="What is public, what is private" />
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.t} className="flex items-start gap-3 text-[13px] leading-snug">
            {r.pub ? <Eye className="mt-0.5 size-4 shrink-0 text-lagoon" aria-hidden="true" /> : <EyeOff className="mt-0.5 size-4 shrink-0 text-fog" aria-hidden="true" />}
            <span className={cn(r.pub ? "text-navy" : "text-tide")}>
              <span className="mr-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fog">{r.pub ? "Public" : "Private"}</span>
              {r.t}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-fog">
        Identity contracts hold signed claims such as a region code or an eligibility tier. The personal data behind each claim stays with the verifier and is never written on-chain.
      </p>
    </Panel>
  );
}
