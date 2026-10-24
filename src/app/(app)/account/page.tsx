"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Check, Copy, Fuel, KeyRound, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { Address, Badge, Button, EmptyState, Field, Input, Notice, PageBody, PageHeader, Panel, PanelHeader, Select, Table, Td, Th } from "@/components/app/ui";
import { KV } from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import { useAuth } from "@/lib/precursor/auth";
import { byId, CLAIM_LABEL, claimState, fmtDay, fmtRelative, identityStatus } from "@/lib/precursor/engine";
import type { Claim, Holder, Sandbox } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

const STATUS_META = {
  VERIFIED: { label: "Verified", tone: "leaf" as const, text: "Your identity and screening claims are current. Every share class can verify you without seeing personal data." },
  CLAIM_EXPIRED: { label: "Claim expired", tone: "amber" as const, text: "A required claim has expired. Transfers to and from your wallets return CLAIM_EXPIRED until it is renewed." },
  NOT_VERIFIED: { label: "Not verified", tone: "rose" as const, text: "No current identity claim is on the registry. Complete identity verification to hold or receive shares." },
};

const KIND_LABEL: Record<Holder["kind"], string> = { founder: "Founder", employee: "Employee", investor: "Investor", fund: "Fund", treasury: "Company treasury" };

function claimValue(s: Sandbox, c: Claim) {
  if (c.topic === "EMPLOYEE_OF") return byId(s.companies, c.value)?.name ?? c.value;
  return c.value;
}

export default function Page() {
  const { s, now, viewer } = useSandbox();
  const holder = byId(s.holders, viewer.holderId);
  const [verifying, setVerifying] = useState(false);

  if (!holder) {
    return (
      <PageBody>
        <EmptyState title="Your identity is loading" body="Your holder record is created the first time you sign in. Refresh the page if it does not appear." />
      </PageBody>
    );
  }

  const status = identityStatus(holder, now);
  const meta = STATUS_META[status];
  const claims = [...holder.claims].sort((a, b) => a.expiresAt - b.expiresAt);
  const states = claims.map((c) => claimState(holder, c.topic, now));
  const nextExpiry = claims.find((c) => c.expiresAt > now);
  const showForm = verifying || status === "NOT_VERIFIED";

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Identity and account"
        description="Your identity contract links your wallets to signed claims from trusted verifiers. Share classes read those claims to decide who can hold and receive shares."
        stats={[
          { label: "Identity status", value: meta.label, accent: meta.tone },
          { label: "Claims", value: String(claims.length), hint: `${states.filter((x) => x === "valid").length} current, ${states.filter((x) => x === "expiring").length} expiring` },
          { label: "Wallets", value: String(holder.wallets.length), hint: "Linked to one identity" },
          { label: "Next expiry", value: nextExpiry ? fmtRelative(nextExpiry.expiresAt, now).replace(/^in /, "") : "None", hint: nextExpiry ? `${CLAIM_LABEL[nextExpiry.topic]}, ${fmtDay(nextExpiry.expiresAt)}` : undefined },
        ]}
      />
      <PageBody className="space-y-6">
        {showForm && <IdentityForm holder={holder} onDone={() => setVerifying(false)} canCancel={status !== "NOT_VERIFIED"} />}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <PanelHeader
              eyebrow="Identity"
              title={holder.name}
              description={meta.text}
              action={
                <div className="flex items-center gap-3">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {!showForm && (
                    <Button variant="secondary" className="btn-sm" onClick={() => setVerifying(true)}>
                      Update
                    </Button>
                  )}
                </div>
              }
            />
            <div className="grid gap-x-10 md:grid-cols-2">
              <dl className="divide-y divide-line-soft">
                <KV label="Identity contract">
                  <Address address={holder.identity} size={18} />
                </KV>
                <KV label="Holder type">{KIND_LABEL[holder.kind]}</KV>
                <KV label="Region">{holder.region || "Not set"}</KV>
              </dl>
              <dl className="divide-y divide-line-soft border-t border-line-soft md:border-t-0">
                <KV label="Eligibility tier">{holder.tier > 0 ? `Tier ${holder.tier}` : "None"}</KV>
                <KV label="Registered">{fmtDay(holder.joinedAt)}</KV>
                <KV label="Holder id">
                  <span className="font-mono text-[12.5px]">{holder.id}</span>
                </KV>
              </dl>
            </div>
            <p className="caption mb-2 mt-6">Wallets</p>
            <ul className="frame grid gap-px">
              {holder.wallets.map((w, i) => (
                <li key={w} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Address address={w} />
                  <span className="font-mono text-[11px] text-fog">{i === 0 ? "Primary, embedded" : "Linked"}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="h-fit">
            <span className="icon-tile size-10">
              <Fuel className="size-[18px]" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-sans text-[16px] font-semibold tracking-[-0.02em]">Gas is sponsored</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-tide">
              Precursor submits your transactions through its relayers and pays the gas in ETH. You need USDG to subscribe or bid, and nothing else. The relayers can submit what you sign but can never move your shares on their own.
            </p>
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            eyebrow="Claims"
            title="Signed claims on your identity"
            description="Each claim is a signed attestation from a trusted verifier, written on-chain with a topic, a value and an expiry. No personal data is written: the documents you verified with stay with the verifier."
          />
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Topic</Th>
                <Th>Value</Th>
                <Th>Verifier</Th>
                <Th>Issued</Th>
                <Th>Expires</Th>
                <Th>State</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => {
                const st = claimState(holder, c.topic, now);
                return (
                  <tr key={`${c.topic}:${c.issuedAt}`}>
                    <Td>
                      <span className="block font-medium text-navy">{CLAIM_LABEL[c.topic]}</span>
                      <span className="font-mono text-[11px] text-fog">{c.topic}</span>
                    </Td>
                    <Td className="text-navy">{claimValue(s, c)}</Td>
                    <Td>{c.verifier}</Td>
                    <Td>{fmtDay(c.issuedAt)}</Td>
                    <Td>
                      <span className="block">{fmtDay(c.expiresAt)}</span>
                      <span className="text-[11.5px] text-fog">{fmtRelative(c.expiresAt, now)}</span>
                    </Td>
                    <Td>
                      <Badge tone={st === "valid" ? "leaf" : st === "expiring" ? "amber" : "rose"}>{st === "valid" ? "Valid" : st === "expiring" ? "Expiring" : "Expired"}</Badge>
                    </Td>
                    <Td className="text-right">
                      {st === "expiring" || st === "expired" ? (
                        <Button variant="secondary" className="btn-sm" onClick={() => setVerifying(true)}>
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                          Renew
                        </Button>
                      ) : (
                        <span className="text-fog">None needed</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {claims.length === 0 && <p className="mt-4 text-[13px] text-tide">No claims yet. Verify your identity above to receive them.</p>}
          <p className="mt-4 font-mono text-[11px] text-fog">IdentityRegistry emits ClaimAdded(identity, topic, verifier, expiry) for every claim.</p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <NetworkPanel />
          <DeveloperPanel />
        </div>
      </PageBody>
    </>
  );
}

const REGIONS: [string, string][] = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["CH", "Switzerland"],
  ["IE", "Ireland"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["SE", "Sweden"],
  ["SG", "Singapore"],
  ["HK", "Hong Kong"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["AU", "Australia"],
  ["AE", "United Arab Emirates"],
  ["BR", "Brazil"],
  ["MX", "Mexico"],
  ["IN", "India"],
];

const TIERS = [
  { value: 0, label: "No eligibility claim", hint: "You can hold classes that do not require an eligibility tier." },
  { value: 1, label: "Tier 1", hint: "The base tier most offerings require." },
  { value: 2, label: "Tier 2", hint: "For investors who meet a higher financial threshold." },
  { value: 3, label: "Tier 3", hint: "For institutions and funds." },
];

function IdentityForm({ holder, onDone, canCancel }: { holder: Holder; onDone: () => void; canCancel: boolean }) {
  const { verifyIdentity } = useSandbox();
  const [name, setName] = useState(holder.name.startsWith("Holder 0x") ? "" : holder.name);
  const [kind, setKind] = useState<Holder["kind"]>(holder.kind === "treasury" ? "investor" : holder.kind);
  const [region, setRegion] = useState(holder.region || "US");
  const [tier, setTier] = useState(holder.tier);
  const tierMeta = TIERS.find((t) => t.value === tier) ?? TIERS[0];

  return (
    <Panel>
      <PanelHeader
        eyebrow="Verification"
        title="Verify your identity"
        description="Precursor Identity signs claims about you: that you are verified and screened, where you reside, and your eligibility tier. Share classes read those claims on every transfer. The details you enter stay with the verifier; only the claims are written."
        action={
          <span className="icon-tile size-10">
            <BadgeCheck className="size-[18px]" aria-hidden="true" />
          </span>
        }
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (verifyIdentity({ holderId: holder.id, name, kind, region, tier }).ok) onDone();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full legal name" hint="Shown only to companies whose shares you hold.">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="As on your identity document" autoFocus />
          </Field>
          <Field label="Holder type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as Holder["kind"])}>
              {(["investor", "fund", "employee", "founder"] as const).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Country of residence">
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map(([code, label]) => (
                <option key={code} value={code}>
                  {label} ({code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Eligibility tier" hint={tierMeta.hint}>
            <Select value={tier} onChange={(e) => setTier(Number(e.target.value))}>
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Notice tone="info">On testnet, Precursor Identity signs claims from what you enter here. Claims last two years, and screening is renewed every year.</Notice>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!name.trim()}>
            Sign my claims
          </Button>
          {canCancel && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
          <span className="font-mono text-[11px] text-fog">IdentityRegistry.addClaim(identity, topic, value, expiry)</span>
        </div>
      </form>
    </Panel>
  );
}

function NetworkPanel() {
  const { s } = useSandbox();
  const auth = useAuth();
  return (
    <Panel>
      <PanelHeader eyebrow="Session" title="Account and network" description="You are signed in through Privy. Every action you take is checked against the same rules the contracts enforce and saved to your account." />
      <dl className="divide-y divide-line-soft border-y border-line-soft">
        <KV label="Signed in as">{auth.email ?? (auth.wallet ? <Address address={auth.wallet} size={18} /> : "Wallet")}</KV>
        <KV label="Network">{s.network.name}</KV>
        <KV label="Block">
          <span className="readout">#{s.block.toLocaleString("en-US")}</span>
        </KV>
      </dl>
      <div className="mt-5">
        <Button variant="secondary" className="btn-sm" onClick={() => void auth.logout()}>
          <LogOut className="size-3.5" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </Panel>
  );
}

function CopyLine({ value, display }: { value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-canvas px-3.5 py-2.5">
      <code className="min-w-0 truncate font-mono text-[12.5px] text-navy">{display ?? value}</code>
      <button
        type="button"
        aria-label="Copy"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => undefined
          );
        }}
        className={cn("shrink-0 transition-colors", copied ? "text-leaf-deep" : "text-fog hover:text-navy")}
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

function DeveloperPanel() {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Developer access"
        title="API and SDK"
        description="Read holdings, check transfers and listen for events from your own systems. Sandbox keys work against testnet with the same endpoints."
        action={
          <span className="icon-tile size-10">
            <KeyRound className="size-[18px]" aria-hidden="true" />
          </span>
        }
      />
      <div className="space-y-4">
        <div>
          <p className="caption mb-2">Sandbox base URL</p>
          <CopyLine value="https://api.sandbox.useprecursor.xyz/v1" />
        </div>
        <div>
          <p className="caption mb-2">Live base URL</p>
          <CopyLine value="https://api.useprecursor.xyz/v1" />
        </div>
        <div>
          <p className="caption mb-2">Secret key</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-canvas px-3.5 py-2.5">
            <code className="truncate font-mono text-[12.5px] text-navy">sk_test_••••••••••••••••4f2a</code>
            <Badge tone="amber">Server only</Badge>
          </div>
          <p className="mt-1.5 text-[12px] text-fog">Send it as Authorization: Bearer. Keep secret keys on your server and use publishable keys in the browser.</p>
        </div>
        <div>
          <p className="caption mb-2">Install</p>
          <CopyLine value="npm install @precursor/sdk" display="$ npm install @precursor/sdk" />
        </div>
        <a
          href="https://docs.useprecursor.xyz/developers/quickstart"
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm w-full"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Read the quickstart
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
        <p className="text-center text-[12px] text-fog">
          Prefer the interface? Every Console action maps to an endpoint. <Link href="/explorer" className="text-tide underline decoration-line underline-offset-4 hover:text-navy">Explore public data</Link>.
        </p>
      </div>
    </Panel>
  );
}
