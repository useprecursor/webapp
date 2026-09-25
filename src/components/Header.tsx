"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GitHubIcon, XIcon } from "@/components/icons";
import { NAV_LINKS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const index = (i: number) => String(i + 1).padStart(2, "0");

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const cell = "group relative flex h-full items-center gap-2 whitespace-nowrap border-l border-line px-3.5 text-[13px] font-medium text-tide transition-colors hover:bg-white/[0.025] hover:text-navy";
  const underline = "pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-navy shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-transform duration-300 group-hover:scale-x-100";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-300",
        scrolled || open ? "border-line bg-canvas/85 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="container">
        <div className="flex h-16 items-stretch">
          <div className="flex items-center pr-6">
            <Logo size={28} />
          </div>

          <nav aria-label="Primary" className="hidden flex-1 items-stretch xl:flex">
            {NAV_LINKS.map((link, i) => (
              <Link key={link.href} href={link.href} className={cell}>
                <span className="font-mono text-[10px] text-pale transition-colors group-hover:text-fog">{index(i)}</span>
                {link.label}
                <span aria-hidden="true" className={underline} />
              </Link>
            ))}
            <a href={SITE.docsUrl} target="_blank" rel="noopener noreferrer" className={cn(cell, "border-r")}>
              <span className="font-mono text-[10px] text-pale transition-colors group-hover:text-fog">{index(NAV_LINKS.length)}</span>
              Docs
              <ArrowUpRight className="size-3 text-fog" aria-hidden="true" />
              <span aria-hidden="true" className={underline} />
            </a>
          </nav>

          <div className="ml-auto hidden items-center gap-4 pl-6 xl:flex">
            <Link href={SITE.appHref} className="btn btn-primary btn-sm">
              Open the Console
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? "Close the menu" : "Open the menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="-mr-2 ml-auto inline-flex w-12 cursor-pointer items-center justify-center border-l border-line text-navy transition-colors hover:bg-white/[0.03] xl:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Full-screen navigation on small screens */}
      <div
        id="mobile-nav"
        className={cn("fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-canvas/95 backdrop-blur-xl xl:hidden", open ? "block" : "hidden")}
      >
        <div className="container flex min-h-full flex-col pb-10 pt-2">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-4 border-b border-line py-5 font-display text-[22px] text-navy transition-colors hover:text-lagoon"
              >
                <span className="font-mono text-[11px] text-pale">{index(i)}</span>
                {link.label}
              </Link>
            ))}
            <a
              href={SITE.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-baseline gap-4 border-b border-line py-5 font-display text-[22px] text-navy transition-colors hover:text-lagoon"
            >
              <span className="font-mono text-[11px] text-pale">{index(NAV_LINKS.length)}</span>
              Docs
              <ArrowUpRight className="size-4 self-center text-fog" aria-hidden="true" />
            </a>
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <Link href={SITE.appHref} className="btn btn-primary btn-lg w-full" onClick={() => setOpen(false)}>
              Open the Console
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <a href={SITE.xUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">
                <XIcon className="size-3.5" />
                {SITE.xHandle}
              </a>
              <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">
                <GitHubIcon className="size-4" />
                GitHub
              </a>
            </div>
          </div>
          <p className="mt-auto pt-10 font-mono text-[11px] uppercase tracking-[0.12em] text-fog">
            {SITE.domain}
          </p>
        </div>
      </div>
    </header>
  );
}
