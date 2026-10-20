"use client";

import { useState } from "react";
import { Anchor } from "lucide-react";
import { Badge, Button, Drawer, EmptyState, Field, Input, Notice, PageBody, PageHeader, Panel, PanelHeader, Segmented, Select, Table, Td, Th } from "@/components/app/ui";
import { DOCUMENT_LABEL, VALUATION_SOURCE_LABEL, byId, fmtDateTime, fmtDay, fmtPct, fmtRelative, fmtUsd, latestValuation } from "@/lib/precursor/engine";
import type { Disclosure, DocumentKind, Valuation } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";
import { Call, Caption, ErrorList, FormFooter, Hex, Num, num, useConsole } from "../_components/kit";

const KINDS = Object.keys(DOCUMENT_LABEL) as DocumentKind[];
const SOURCE_TONE: Record<Valuation["source"], "lagoon" | "leaf" | "muted"> = { PRICED_ROUND: "leaf", INDEPENDENT_VALUATION: "lagoon", WINDOW_CLEARING: "muted" };

/** The answer an AggregatorV3 read returns: USD with 8 decimals, as an integer. */
const toAnswer = (price: number) => BigInt(Math.round(price * 1e8)).toString();

export default function Page() {
  const { s, now, company, classes } = useConsole();
  const [anchoring, setAnchoring] = useState(false);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [kindFilter, setKindFilter] = useState<DocumentKind | "ALL">("ALL");

  const docs = s.documents.filter((d) => d.companyId === company.id).sort((a, b) => b.anchoredAt - a.anchoredAt);
  const shown = kindFilter === "ALL" ? docs : docs.filter((d) => d.kind === kindFilter);
  const cls = byId(classes, classId) ?? classes[0];
  const primary = classes[0];
  const primaryVal = primary ? latestValuation(s, primary.id) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Console"
        title="Disclosures and valuations"
        description="Anchor each document's hash on-chain so any holder can prove a copy is unchanged. Publish Reference Valuations that wallets and integrators read like a price feed."
        action={
          <Button className="btn-sm" onClick={() => setAnchoring(true)}>
            <Anchor className="size-4" aria-hidden="true" />
            Anchor a document
          </Button>
        }
        stats={[
          { label: "Documents anchored", value: String(docs.length), hint: `${docs.filter((d) => d.visibility === "public").length} public, ${docs.filter((d) => d.visibility === "holders").length} for holders`, accent: "lagoon" },
          { label: "Last anchored", value: docs[0] ? fmtRelative(docs[0].anchoredAt, now) : "Never", hint: docs[0]?.title },
          {
            label: `Reference Valuation${primary ? `, ${primary.symbol}` : ""}`,
            value: primaryVal ? fmtUsd(primaryVal.price) : "None",
            hint: primaryVal ? `${VALUATION_SOURCE_LABEL[primaryVal.source]}, ${fmtDay(primaryVal.asOf)}` : undefined,
          },
          { label: "Valuations published", value: String(s.valuations.filter((v) => classes.some((c) => c.id === v.classId)).length), hint: "Across every class" },
        ]}
      />
      <PageBody className="space-y-5">
        <Panel>
          <PanelHeader
            eyebrow="DisclosureRegistry"
            title="Documents"
            description="Holder documents are visible in Portfolio to verified holders. Public documents also appear in the Explorer."
            action={
              <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as DocumentKind | "ALL")} className="w-[220px]">
                <option value="ALL">All kinds</option>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {DOCUMENT_LABEL[k]}
                  </option>
                ))}
              </Select>
            }
          />
          {shown.length === 0 ? (
            <EmptyState title="No documents" body={kindFilter === "ALL" ? "Anchor share class terms, offering documents and updates so holders can verify every copy." : "No documents of this kind yet."} />
          ) : (
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>Document</Th>
                  <Th>Kind</Th>
                  <Th>Visibility</Th>
                  <Th className="text-right">Anchored</Th>
                  <Th>Hash</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.id}>
                    <Td>
                      <span className="font-medium text-navy">{d.title}</span>
                    </Td>
                    <Td>
                      <span className="text-[12.5px]">{DOCUMENT_LABEL[d.kind]}</span>
                      <div className="font-mono text-[10.5px] text-fog">{d.kind}</div>
                    </Td>
                    <Td>{d.visibility === "public" ? <Badge tone="lagoon">Public</Badge> : <Badge>Holders</Badge>}</Td>
                    <Td className="whitespace-nowrap text-right text-[12.5px]">{fmtDay(d.anchoredAt)}</Td>
                    <Td>
                      <Hex value={d.hash} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Call className="mt-4">DisclosureRegistry.anchor(kind, hash, uri)</Call>
        </Panel>

        {cls && (
          <div className="grid gap-5 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <PanelHeader
                eyebrow="ValuationOracle"
                title={`${cls.symbol} valuation history`}
                description="Dated and sourced. Liquidity Window clearings publish automatically; offering closes publish at the offering price."
                action={classes.length > 1 && <Segmented label="Share class" value={cls.id} onChange={setClassId} options={classes.map((c) => ({ value: c.id, label: c.symbol }))} />}
              />
              <History classId={cls.id} />
            </Panel>
            <Panel className="lg:col-span-2">
              <PublishForm key={cls.id} classId={cls.id} />
            </Panel>
          </div>
        )}
      </PageBody>

      <Drawer open={anchoring} onClose={() => setAnchoring(false)} title="Anchor a document">
        <AnchorForm onDone={() => setAnchoring(false)} />
      </Drawer>
    </>
  );
}

function History({ classId }: { classId: string }) {
  const { s, now } = useConsole();
  const list = s.valuations.filter((v) => v.classId === classId).sort((a, b) => b.asOf - a.asOf);
  if (!list.length) return <EmptyState title="No valuations yet" body="Publish a Reference Valuation from an independent valuation or a priced round." />;
  return (
    <Table minWidth={560}>
      <thead>
        <tr>
          <Th>As of</Th>
          <Th>Source</Th>
          <Th className="text-right">Price</Th>
          <Th className="text-right">Change</Th>
          <Th>Report</Th>
        </tr>
      </thead>
      <tbody>
        {list.map((v, i) => {
          const prev = list[i + 1];
          const change = prev ? ((v.price - prev.price) / prev.price) * 100 : null;
          const doc = byId(s.documents, v.documentId);
          return (
            <tr key={v.id} className={cn(i === 0 && "[&>td]:bg-lagoon-faint")}>
              <Td>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-navy">{fmtDay(v.asOf)}</span>
                  {i === 0 && <Badge tone="lagoon">Latest</Badge>}
                </div>
                <div className="font-mono text-[11px] text-fog">{fmtRelative(v.asOf, now)}</div>
              </Td>
              <Td>
                <Badge tone={SOURCE_TONE[v.source]}>{VALUATION_SOURCE_LABEL[v.source]}</Badge>
              </Td>
              <Td className="text-right">
                <Num className={i === 0 ? "text-[14px]" : undefined}>{fmtUsd(v.price)}</Num>
              </Td>
              <Td className="text-right">
                {change === null ? <span className="font-mono text-[12px] text-fog">First</span> : <Num className={change >= 0 ? "text-leaf-deep" : "text-rose-deep"}>{`${change >= 0 ? "+" : ""}${fmtPct(change)}`}</Num>}
              </Td>
              <Td className="max-w-[180px]">
                <span className="line-clamp-1 text-[12.5px]">{doc ? doc.title : "None"}</span>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function PublishForm({ classId }: { classId: string }) {
  const { s, publishValuation } = useConsole();
  const cls = byId(s.classes, classId)!;
  const latest = latestValuation(s, classId);
  const [price, setPrice] = useState("");
  const [source, setSource] = useState<"INDEPENDENT_VALUATION" | "PRICED_ROUND">("INDEPENDENT_VALUATION");
  const p = num(price);
  const valid = p > 0 && Number.isFinite(p);
  const errors: string[] = [];
  if (price && !valid) errors.push("Enter a price above zero.");
  if (cls.paused) errors.push(`${cls.symbol} is paused. Valuations cannot be published while transfers are paused.`);
  const change = valid && latest ? ((p - latest.price) / latest.price) * 100 : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || cls.paused) return;
        if (publishValuation(classId, p, source).ok) setPrice("");
      }}
    >
      <PanelHeader eyebrow="Publish" title="Publish a Reference Valuation" description={`A new price for ${cls.symbol}, effective now.`} />
      <div className="space-y-4">
        <Field label="Price per share" hint={latest ? `Current: ${fmtUsd(latest.price)} (${VALUATION_SOURCE_LABEL[latest.source].toLowerCase()}, ${fmtDay(latest.asOf)}).${change !== null ? ` Change: ${change >= 0 ? "+" : ""}${fmtPct(change)}.` : ""}` : undefined}>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" suffix="USDG" />
        </Field>
        <Field label="Source">
          <Segmented
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              { value: "INDEPENDENT_VALUATION", label: "Independent valuation" },
              { value: "PRICED_ROUND", label: "Priced round" },
            ]}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-canvas/60 p-4">
        <Caption className="mb-2">AggregatorV3 read</Caption>
        <p className="text-[12.5px] leading-relaxed text-tide">The oracle is AggregatorV3-compatible with 8 decimals, so integrators read it like a Chainlink feed.</p>
        <pre className="scrollbar-none mt-3 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-navy">
          {`latestRoundData()\n  answer    ${toAnswer(valid ? p : latest?.price ?? 0)}\n  decimals  8\n  updatedAt ${valid ? "now" : latest ? fmtDateTime(latest.asOf) : "n/a"}`}
        </pre>
      </div>

      <div className="mt-4">
        <Notice tone="info">Window clearings publish their own valuation with source WINDOW_CLEARING. Attach the valuation report by anchoring it as a document.</Notice>
      </div>
      <ErrorList errors={errors} />
      <FormFooter call="ValuationOracle.publish(price, source, asOf, documentHash)">
        <Button type="submit" disabled={!valid || cls.paused}>
          Publish {valid ? fmtUsd(p) : ""}
        </Button>
      </FormFooter>
    </form>
  );
}

function AnchorForm({ onDone }: { onDone: () => void }) {
  const { company, anchorDocument } = useConsole();
  const [kind, setKind] = useState<DocumentKind>("COMPANY_UPDATE");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Disclosure["visibility"]>("holders");
  const errors = title.trim() ? [] : ["Give the document a title."];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        if (anchorDocument({ companyId: company.id, kind, title: title.trim(), visibility }).ok) onDone();
      }}
    >
      <p className="mb-5 text-[13.5px] leading-relaxed text-tide">The document&apos;s hash is written to the DisclosureRegistry with its kind and a timestamp. The content itself stays off-chain.</p>
      <div className="space-y-4">
        <Field label="Kind">
          <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q4 2026 shareholder update" autoFocus />
        </Field>
        <Field label="Visibility" hint={visibility === "public" ? "Anyone can read it in the Explorer." : "Verified holders read it in Portfolio. The hash is public either way."}>
          <Segmented
            label="Visibility"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: "holders", label: "Holders only" },
              { value: "public", label: "Public" },
            ]}
          />
        </Field>
      </div>
      <FormFooter call="DisclosureRegistry.anchor(kind, hash, uri)">
        <Button type="submit" disabled={errors.length > 0}>
          Anchor document
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}
