"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Database, Layers, LogIn, Telescope } from "lucide-react";
import { Button, Field, Input, Notice, PageBody, PageHeader, Panel, PanelHeader } from "@/components/app/ui";
import { useAuth } from "@/lib/precursor/auth";
import { useSandbox } from "@/lib/precursor/store";
import { byId } from "@/lib/precursor/engine";

/*
 * What the app shows before a page can: signing in, a database that is not
 * set up yet, and the two steps that take a new issuer from nothing to a
 * live share class.
 */

export function Splash({ label = "Connecting to Robinhood Chain" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4" aria-busy="true">
      <Image src="/images/logo-mark-lg.png" alt="" width={64} height={64} priority className="mark-glow animate-pulse-soft" />
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fog">{label}</span>
    </div>
  );
}

const SECTION_COPY: Record<string, { title: string; body: string }> = {
  console: { title: "Sign in to the Console", body: "Issue and administer your company's share classes, offerings, Liquidity Windows and corporate actions." },
  portfolio: { title: "Sign in to Portfolio", body: "See your holdings in every company, invest in offerings, sell in Liquidity Windows, claim distributions and vote." },
  account: { title: "Sign in to your account", body: "Verify your identity once, and every share class on Precursor can check it on each transfer." },
};

export function SignIn({ section }: { section: string }) {
  const { login, ready } = useAuth();
  const copy = SECTION_COPY[section] ?? SECTION_COPY.console;
  return (
    <PageBody className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="card edge-lit w-full max-w-[440px] p-8 text-center">
        <Image src="/images/logo-mark-lg.png" alt="" width={56} height={56} className="mark-glow mx-auto" />
        <h1 className="mt-6 text-[26px] leading-tight">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-[340px] text-[14px] leading-relaxed text-tide">{copy.body}</p>
        <Button className="mt-7 w-full" onClick={login} disabled={!ready}>
          <LogIn className="size-4" aria-hidden="true" />
          Sign in or create an account
        </Button>
        <p className="mt-4 text-[12.5px] text-fog">Email or an existing wallet. New accounts get an embedded wallet with gas sponsored.</p>
        <div className="mt-6 border-t border-line-soft pt-5">
          <Link href="/explorer" className="inline-flex items-center gap-2 text-[13px] text-tide transition-colors hover:text-navy">
            <Telescope className="size-4" aria-hidden="true" />
            Browse the public Explorer without signing in
          </Link>
        </div>
      </div>
    </PageBody>
  );
}

export function LoadError({ message }: { message: string }) {
  const { refresh } = useSandbox();
  const missingTables = /tables are missing|schema\.sql/i.test(message);
  return (
    <PageBody className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="card w-full max-w-[520px] p-8">
        <span className="icon-tile size-11">
          <Database className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[24px] leading-tight">{missingTables ? "The database is not set up yet" : "The data could not be loaded"}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-tide">{message}</p>
        {missingTables && (
          <ol className="mt-5 space-y-2 font-mono text-[12.5px] leading-relaxed text-tide">
            <li>1. Open your project in Supabase, then the SQL editor.</li>
            <li>2. Paste and run supabase/schema.sql from this repository.</li>
            <li>3. Come back here and try again.</li>
          </ol>
        )}
        <Button className="mt-7" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    </PageBody>
  );
}

export function CreateCompanyForm({ onDone }: { onDone?: () => void }) {
  const { createCompany } = useSandbox();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [sector, setSector] = useState("");
  const [hq, setHq] = useState("");
  const [founded, setFounded] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const year = Number(founded);
  const errors: string[] = [];
  if (!name.trim()) errors.push("Add the company's name.");
  if (founded && (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear())) errors.push("Enter the year the company was founded.");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        const r = createCompany({ name, legalName, sector, hq, founded: founded ? year : 0, description, website });
        if (r.ok) onDone?.();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The name holders know" autoFocus />
        </Field>
        <Field label="Legal name" hint="Defaults to the company name">
          <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="As registered" />
        </Field>
        <Field label="Sector">
          <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Logistics software" />
        </Field>
        <Field label="Headquarters">
          <Input value={hq} onChange={(e) => setHq(e.target.value)} placeholder="US, San Francisco" />
        </Field>
        <Field label="Founded">
          <Input value={founded} onChange={(e) => setFounded(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2019" />
        </Field>
        <Field label="Website">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </Field>
      </div>
      <Field label="Description" hint="Shown on your public Explorer page.">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input min-h-[88px] py-3" placeholder="What the company does, in a sentence or two." />
      </Field>
      {name && errors.length > 0 && <Notice tone="warn">{errors.join(" ")}</Notice>}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={errors.length > 0}>
          Deploy company
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <span className="font-mono text-[11px] text-fog">PrecursorFactory.deployCompany(params)</span>
      </div>
    </form>
  );
}

export function CreateShareClassForm({ companyId, onDone }: { companyId: string; onDone?: () => void }) {
  const { createShareClass } = useSandbox();
  const [name, setName] = useState("Common");
  const [symbol, setSymbol] = useState("");
  const [authorized, setAuthorized] = useState("10000000");
  const [multiplier, setMultiplier] = useState("1");

  const qty = Number(authorized);
  const mult = Number(multiplier);
  const errors: string[] = [];
  if (!name.trim()) errors.push("Name the class, such as Common or Series A Preferred.");
  if (!/^[A-Z0-9-]{2,12}$/.test(symbol)) errors.push("Use a symbol of 2 to 12 letters, digits or hyphens.");
  if (!(qty > 0)) errors.push("Authorized shares must be above zero.");
  if (!(mult > 0)) errors.push("The multiplier must be above zero.");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        if (createShareClass({ companyId, name, symbol, authorized: qty, multiplier: mult }).ok) onDone?.();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Symbol" hint="The token symbol, unique on Precursor">
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="ACME-C" maxLength={12} className="font-mono uppercase" />
        </Field>
        <Field label="Authorized shares">
          <Input value={authorized} onChange={(e) => setAuthorized(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" />
        </Field>
        <Field label="Multiplier" hint="Tokens per share. 1 for most classes.">
          <Input value={multiplier} onChange={(e) => setMultiplier(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" />
        </Field>
      </div>
      {symbol && errors.length > 0 && <Notice tone="warn">{errors.join(" ")}</Notice>}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={errors.length > 0}>
          Deploy share class
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <span className="font-mono text-[11px] text-fog">PrecursorFactory.deployShareClass(name, symbol, authorized)</span>
      </div>
    </form>
  );
}

function Step({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) {
  return (
    <div className={active ? "text-navy" : done ? "text-tide" : "text-fog"}>
      <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{done ? "Done" : `Step ${n}`}</span>
      <p className="mt-1 text-[14px] font-medium">{title}</p>
    </div>
  );
}

/** Takes a signed-in user with no company, or a company with no share class, to a working Console. */
export function ConsoleOnboarding() {
  const { s, viewer, me } = useSandbox();
  const company = byId(s.companies, viewer.companyId);
  const stage = !me?.companyIds.length || !company ? 1 : 2;

  return (
    <>
      <PageHeader
        eyebrow="Console"
        title={stage === 1 ? "Set up your company" : `Deploy ${company?.name}'s first share class`}
        description={
          stage === 1
            ? "Precursor deploys your company's contracts in one transaction: an identity registry, a rule engine, the offering and distribution vaults, and a timelock for every rule change. You become its first admin."
            : "Each share class is one Precursor Share Token. Deploy one, then configure its transfer rules and issue shares to your cap table."
        }
      />
      <PageBody className="space-y-6">
        <div className="frame grid gap-px sm:grid-cols-3">
          <div className="frame-cell px-5 py-4">
            <Step n={1} title="Deploy the company" done={stage > 1} active={stage === 1} />
          </div>
          <div className="frame-cell px-5 py-4">
            <Step n={2} title="Deploy a share class" done={false} active={stage === 2} />
          </div>
          <div className="frame-cell px-5 py-4">
            <Step n={3} title="Set rules and issue shares" done={false} active={false} />
          </div>
        </div>
        <Panel>
          <PanelHeader
            eyebrow={stage === 1 ? "Company" : "Share class"}
            title={stage === 1 ? "Company details" : "Share class terms"}
            description={stage === 1 ? "You can edit the public details later. The name must be unique on Precursor." : "Authorized shares cap how many can ever be issued. The symbol is permanent."}
            action={
              <span className="icon-tile size-10">
                {stage === 1 ? <Building2 className="size-[18px]" aria-hidden="true" /> : <Layers className="size-[18px]" aria-hidden="true" />}
              </span>
            }
          />
          {stage === 1 ? <CreateCompanyForm /> : <CreateShareClassForm companyId={company!.id} />}
        </Panel>
      </PageBody>
    </>
  );
}
