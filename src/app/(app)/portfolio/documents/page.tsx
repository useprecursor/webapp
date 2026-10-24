"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Lock, ShieldCheck } from "lucide-react";
import { Address, Badge, Button, EmptyState, PageBody, PageHeader, Panel, PanelHeader, Select } from "@/components/app/ui";
import { CompanyMark, positionsOf } from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import { DOCUMENT_LABEL, fmtDay, shortHex, plural } from "@/lib/precursor/engine";
import type { Company, Disclosure, DocumentKind } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

export default function Page() {
  const { s, now, viewer } = useSandbox();
  const positions = useMemo(() => positionsOf(s, viewer.holderId, now), [s, viewer.holderId, now]);
  const held = useMemo(() => new Set(positions.map((p) => p.company.id)), [positions]);
  const [kind, setKind] = useState<DocumentKind | "ALL">("ALL");

  const visible = (d: Disclosure) => d.visibility === "public" || held.has(d.companyId);
  const docs = s.documents.filter((d) => kind === "ALL" || d.kind === kind);
  const groups = s.companies
    .map((c) => ({ company: c, docs: docs.filter((d) => d.companyId === c.id).sort((a, b) => b.anchoredAt - a.anchoredAt) }))
    .filter((g) => g.docs.length > 0)
    .sort((a, b) => Number(held.has(b.company.id)) - Number(held.has(a.company.id)));

  const available = s.documents.filter(visible);
  const locked = s.documents.length - available.length;
  const latest = available.sort((a, b) => b.anchoredAt - a.anchoredAt)[0];

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Documents"
        title="Documents"
        description="Companies anchor the hash of every disclosure in their DisclosureRegistry. You can read holder-only documents for companies you hold, and check that any copy you have matches what was anchored."
        stats={[
          { label: "Available to you", value: String(available.length), hint: `${plural(held.size, "company", "companies")} you hold`, accent: "lagoon" },
          { label: "Holder-only, locked", value: String(locked), hint: "For other companies' holders" },
          { label: "Latest anchored", value: latest ? fmtDay(latest.anchoredAt) : "None", hint: latest?.title },
          { label: "Companies publishing", value: String(new Set(s.documents.map((d) => d.companyId)).size) },
        ]}
      />
      <PageBody className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px] text-tide">Grouped by company. Companies you hold come first.</p>
          <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind | "ALL")} className="sm:w-64" aria-label="Filter by kind">
            <option value="ALL">All kinds</option>
            {(Object.keys(DOCUMENT_LABEL) as DocumentKind[]).map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>

        {groups.length === 0 ? (
          <Panel>
            <EmptyState title="No documents of this kind" body="Try another kind, or show all documents." action={<Button variant="secondary" className="btn-sm" onClick={() => setKind("ALL")}>Show all</Button>} />
          </Panel>
        ) : (
          groups.map((g) => <CompanyDocs key={g.company.id} company={g.company} docs={g.docs} holds={held.has(g.company.id)} />)
        )}

        <Panel className="card-tint">
          <div className="flex items-start gap-4">
            <span className="icon-tile size-10 shrink-0">
              <ShieldCheck className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-sans text-[15px] font-semibold text-navy">How verification works</h2>
              <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-tide">
                When a company publishes a document, DisclosureRegistry stores its kind, its keccak-256 hash and a timestamp in one transaction. Verifying hashes your copy and compares it with that record. A match proves the document is the one the company anchored, unchanged since that date. The content itself never goes on-chain, so holder-only documents stay private while their hashes stay public.
              </p>
            </div>
          </div>
        </Panel>
      </PageBody>
    </>
  );
}

function CompanyDocs({ company, docs, holds }: { company: Company; docs: Disclosure[]; holds: boolean }) {
  return (
    <Panel>
      <PanelHeader
        title={company.name}
        description={holds ? "You hold shares in this company, so its holder-only documents are open to you." : "You do not hold this company. Public documents are open; holder-only documents show their hash only."}
        action={
          <span className="flex items-center gap-3">
            {holds ? <Badge tone="leaf">Holder</Badge> : <Badge tone="muted">Public access</Badge>}
            <CompanyMark name={company.name} size={34} />
          </span>
        }
      />
      <ul className="frame grid gap-px">
        {docs.map((d) => (
          <DocRow key={d.id} d={d} company={company} open={d.visibility === "public" || holds} />
        ))}
      </ul>
    </Panel>
  );
}

function DocRow({ d, company, open }: { d: Disclosure; company: Company; open: boolean }) {
  const [verifying, setVerifying] = useState(false);
  return (
    <li className="frame-cell px-4 py-4 md:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-line", open ? "bg-haze-2 text-lagoon" : "bg-haze text-fog")}>
            {open ? <FileText className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="caption">{DOCUMENT_LABEL[d.kind]}</p>
            <p className={cn("mt-1 truncate text-[14px] font-medium", open ? "text-navy" : "text-fog")}>{open ? d.title : `Holder-only ${DOCUMENT_LABEL[d.kind].toLowerCase()}`}</p>
            <p className="mt-1 font-mono text-[11.5px] text-fog">
              Anchored {fmtDay(d.anchoredAt)} · {shortHex(d.hash)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:pl-4">
          <Badge tone={d.visibility === "public" ? "muted" : "lagoon"}>{d.visibility === "public" ? "Public" : "Holders"}</Badge>
          {open ? (
            <Button variant="secondary" className="btn-sm" onClick={() => setVerifying((v) => !v)} aria-expanded={verifying}>
              {verifying ? "Hide" : "Verify"}
            </Button>
          ) : (
            <Link href="/portfolio/invest" className="btn btn-ghost btn-sm">
              Become a holder
            </Link>
          )}
        </div>
      </div>
      {verifying && open && (
        <div className="mt-4 rounded-2xl border border-leaf/20 bg-leaf-soft/60 p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-leaf-deep">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Hash matches DisclosureRegistry
          </div>
          <dl className="mt-3 grid gap-2 text-[12px] md:grid-cols-[150px_minmax(0,1fr)]">
            <dt className="text-fog">Your copy (keccak-256)</dt>
            <dd className="break-all font-mono text-navy">{d.hash}</dd>
            <dt className="text-fog">Anchored on-chain</dt>
            <dd className="break-all font-mono text-navy">{d.hash}</dd>
            <dt className="text-fog">Registry</dt>
            <dd>{company.contracts.DisclosureRegistry ? <Address address={company.contracts.DisclosureRegistry} size={18} /> : "n/a"}</dd>
            <dt className="text-fog">Anchored</dt>
            <dd className="text-navy">
              {new Date(d.anchoredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}, event DocumentAnchored
            </dd>
          </dl>
        </div>
      )}
    </li>
  );
}
