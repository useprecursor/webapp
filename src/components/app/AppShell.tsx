"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronsUpDown,
  CircleDollarSign,
  FileText,
  Gavel,
  Layers,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Repeat,
  ShieldCheck,
  Telescope,
  UserRound,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Blockie } from "@/components/Blockie";
import { useSandbox } from "@/lib/precursor/store";
import { useAuth } from "@/lib/precursor/auth";
import { byId, classesOf, shortHex } from "@/lib/precursor/engine";
import { Drawer } from "@/components/app/ui";
import { ConsoleOnboarding, CreateCompanyForm, LoadError, SignIn, Splash } from "@/components/app/Onboarding";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const SECTIONS: { id: "console" | "portfolio" | "explorer"; label: string; caption: string; items: NavItem[] }[] = [
  {
    id: "console",
    label: "Console",
    caption: "For issuers",
    items: [
      { href: "/console", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/console/cap-table", label: "Cap table", icon: Users },
      { href: "/console/share-classes", label: "Share classes and rules", icon: Layers },
      { href: "/console/offerings", label: "Offerings", icon: CircleDollarSign },
      { href: "/console/liquidity", label: "Liquidity", icon: Repeat },
      { href: "/console/corporate-actions", label: "Distributions and votes", icon: Gavel },
      { href: "/console/disclosures", label: "Disclosures and valuations", icon: FileText },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    caption: "For holders",
    items: [
      { href: "/portfolio", label: "Holdings", icon: Wallet, exact: true },
      { href: "/portfolio/invest", label: "Offerings", icon: CircleDollarSign },
      { href: "/portfolio/liquidity", label: "Liquidity Windows", icon: CalendarClock },
      { href: "/portfolio/actions", label: "Distributions and votes", icon: Gavel },
      { href: "/portfolio/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    id: "explorer",
    label: "Explorer",
    caption: "Public",
    items: [{ href: "/explorer", label: "Companies and activity", icon: Telescope }],
  },
];

function activeSection(pathname: string) {
  return SECTIONS.find((s) => pathname.startsWith(`/${s.id}`))?.id ?? "console";
}

function NetworkStatus() {
  const { s } = useSandbox();
  return (
    <div className="rounded-2xl border border-line-soft bg-haze/60 px-3.5 py-3">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fog">{s.network.name}</div>
      <div className="mt-2 flex items-baseline justify-between font-mono text-[11.5px]">
        <span className="text-fog">Latest block</span>
        <span className="readout text-tide">#{s.block.toLocaleString("en-US")}</span>
      </div>
    </div>
  );
}

/** The signed-in account: the company the Console administers, the holder identity, and sign-out. */
function AccountSwitcher({ section }: { section: "console" | "portfolio" | "explorer" }) {
  const { s, viewer, setViewer, me } = useSandbox();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!auth.authenticated) {
    return (
      <button type="button" onClick={auth.login} disabled={!auth.ready} className="btn btn-primary btn-sm w-full">
        <LogIn className="size-3.5" aria-hidden="true" />
        Sign in
      </button>
    );
  }

  const company = byId(s.companies, viewer.companyId);
  const holder = byId(s.holders, viewer.holderId);
  const companies = (me?.companyIds ?? []).map((id) => byId(s.companies, id)).filter((c) => !!c);
  const isConsole = section === "console" && !!company;
  const title = isConsole ? company.name : (holder?.name ?? auth.email ?? "Your account");
  const sub = isConsole ? "Issuer admin" : holder ? shortHex(holder.wallets[0]) : (auth.email ?? "");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-[rgb(255_255_255/0.16)]"
      >
        {isConsole ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-line bg-haze-2 text-[12px] font-semibold text-navy">
            {company.name.slice(0, 1)}
          </span>
        ) : (
          <span className="size-8 shrink-0 overflow-hidden rounded-[10px] bg-haze-2">{holder && <Blockie address={holder.wallets[0]} className="block size-full" />}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-navy">{title}</span>
          <span className="block truncate font-mono text-[11px] text-fog">{sub}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-fog" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute inset-x-0 bottom-full z-50 mb-2 max-h-[420px] overflow-y-auto rounded-2xl border border-line bg-haze p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]">
          {section === "console" && (
            <>
              <p className="px-2.5 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">Companies you administer</p>
              {companies.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setViewer({ companyId: x.id });
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-haze-2",
                    x.id === viewer.companyId ? "text-navy" : "text-tide"
                  )}
                >
                  <span className="truncate">{x.name}</span>
                  {x.id === viewer.companyId && <CheckCircle2 className="size-3.5 shrink-0 text-lagoon" aria-hidden="true" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCreating(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-tide transition-colors hover:bg-haze-2 hover:text-navy"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                New company
              </button>
              <div className="my-1.5 border-t border-line-soft" />
            </>
          )}
          <p className="px-2.5 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fog">Signed in as</p>
          <p className="truncate px-2.5 pb-2 text-[13px] text-navy">{auth.email ?? (auth.wallet ? shortHex(auth.wallet) : holder?.name)}</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void auth.logout();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-tide transition-colors hover:bg-haze-2 hover:text-navy"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}

      <Drawer open={creating} onClose={() => setCreating(false)} title="New company">
        <CreateCompanyForm onDone={() => setCreating(false)} />
      </Drawer>
    </div>
  );
}

/** Shows sign-in, setup or onboarding in place of a page until the page can render. */
function Gate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { s, status, error, me, viewer } = useSandbox();
  const auth = useAuth();
  const section = pathname.split("/")[1] ?? "";

  if (!auth.ready || status === "loading") return <Splash />;
  if (status === "error") return <LoadError message={error ?? "The data could not be loaded."} />;
  if (section === "explorer") return <>{children}</>;
  if (!auth.authenticated) return <SignIn section={section} />;
  if (!me) return <Splash label="Loading your account" />;
  if (section === "console" && (!me.companyIds.length || !byId(s.companies, viewer.companyId) || classesOf(s, viewer.companyId).length === 0)) return <ConsoleOnboarding />;
  return <>{children}</>;
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeSection(pathname);
  const section = SECTIONS.find((s) => s.id === active)!;
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="px-1.5">
        <Logo size={26} href="/" />
      </div>

      {/* Product switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line-soft bg-haze/60 p-1">
        {SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={`/${s.id}`}
            onClick={onNavigate}
            className={cn(
              "rounded-xl px-2 py-2 text-center text-[12.5px] font-semibold transition-all",
              s.id === active ? "bg-surface text-navy shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(255_255_255/0.1)]" : "text-fog hover:text-navy"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <nav aria-label={section.label} className="flex-1">
        <p className="px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-pale">{section.caption}</p>
        <ul className="mt-2.5 space-y-0.5">
          {section.items.map((item) => {
            const on = isActive(item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                    on ? "bg-[rgb(255_255_255/0.05)] text-navy" : "text-tide hover:bg-[rgb(255_255_255/0.03)] hover:text-navy"
                  )}
                >
                  {on && <span aria-hidden="true" className="absolute -left-4 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-white shadow-[0_0_10px_rgb(230_235_244/0.8)]" />}
                  <Icon className={cn("size-4", on ? "text-lagoon" : "text-fog group-hover:text-tide")} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/account"
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                pathname.startsWith("/account") ? "bg-[rgb(255_255_255/0.05)] text-navy" : "text-tide hover:bg-[rgb(255_255_255/0.03)] hover:text-navy"
              )}
            >
              <UserRound className="size-4 text-fog group-hover:text-tide" aria-hidden="true" />
              Identity and account
            </Link>
          </li>
        </ul>

        <div className="mt-6 border-t border-line-soft pt-4">
          <a
            href={SITE.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] text-fog transition-colors hover:text-navy"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            Documentation
            <ArrowUpRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </a>
          <Link href="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] text-fog transition-colors hover:text-navy">
            <Building2 className="size-4" aria-hidden="true" />
            {SITE.domain}
          </Link>
        </div>
      </nav>

      <div className="space-y-2.5">
        <NetworkStatus />
        <AccountSwitcher section={active} />
      </div>
    </div>
  );
}

function StatusStrip() {
  const { s, saving } = useSandbox();
  return (
    <div className="flex items-center justify-end gap-4 border-b border-line-soft px-4 py-2.5 md:px-6">
      {saving && (
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-tide">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Saving
        </span>
      )}
      <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fog">
        <ShieldCheck className="size-3.5 text-lagoon" aria-hidden="true" />
        {s.network.name} · every action runs the contract rules
      </span>
    </div>
  );
}

/** Transaction receipts, stacked in the corner and dismissed after a few seconds. */
function Receipts() {
  const { receipts, dismiss, s } = useSandbox();
  useEffect(() => {
    if (!receipts.length) return;
    const t = setTimeout(() => dismiss(receipts[receipts.length - 1].id), 7000);
    return () => clearTimeout(t);
  }, [receipts, dismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(400px,calc(100vw-32px))] flex-col gap-2">
      {receipts.map((r) => (
        <div key={r.id} className="glass pointer-events-auto animate-in fade-in slide-in-from-bottom-2 rounded-2xl p-4 duration-300">
          <div className="flex items-start gap-3">
            {r.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-deep" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-rose-deep" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-navy">{r.title}</p>
              {r.detail && <p className="mt-1 text-[12.5px] leading-relaxed text-tide">{r.detail}</p>}
              {r.call && <p className="mt-2 truncate font-mono text-[11px] text-fog">{r.call}</p>}
              {r.tx && (
                <p className="mt-1 font-mono text-[11px] text-fog">
                  tx {shortHex(r.tx)} · {s.network.name}
                </p>
              )}
            </div>
            <button type="button" onClick={() => dismiss(r.id)} aria-label="Dismiss" className="text-fog transition-colors hover:text-navy">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const active = SECTIONS.find((s) => s.id === activeSection(pathname))!;

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r border-line-soft bg-[linear-gradient(180deg,rgb(255_255_255/0.02),transparent_40%)] lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar and drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line-soft bg-canvas/85 px-4 backdrop-blur-xl lg:hidden">
        <Logo size={24} href="/" />
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fog">{active.label}</span>
        <button type="button" onClick={() => setMenu(true)} aria-label="Open navigation" className="inline-flex size-9 items-center justify-center rounded-xl bg-haze text-navy">
          <Menu className="size-4" />
        </button>
      </div>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close navigation" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 w-[300px] overflow-y-auto border-r border-line bg-canvas">
            <Sidebar onNavigate={() => setMenu(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 pb-16">
        <StatusStrip />
        <Gate>{children}</Gate>
      </main>

      <Receipts />
    </div>
  );
}
