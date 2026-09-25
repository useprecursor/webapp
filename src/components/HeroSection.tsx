import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { ShareClassCard } from "@/components/ShareClassCard";
import { Void } from "@/components/atmosphere";
import { SITE } from "@/lib/site";

/* Product facts, not customer figures: each one is fixed by the contracts. */
const FACTS = [
  { value: "8", unit: "Rule modules", note: "Region, eligibility, holding periods, vesting and more" },
  { value: "15", unit: "Reason codes", note: "Every check returns one before anyone signs" },
  { value: "1", unit: "Transaction to deploy", note: "PrecursorFactory creates a company's full contract set" },
  { value: "0", unit: "Gas for holders", note: "Sponsored for investors and employees" },
] as const;

export function HeroSection() {
  return (
    <section className="relative isolate -mt-[72px] overflow-hidden">
      <Void
        beam={false}
        grid={false}
        image="/images/hero-bg.png"
        imageClassName="left-[8%] top-[300px] w-[150%] opacity-70 md:left-[22%] md:top-[150px] md:w-full md:opacity-100"
      />

      <div className="container grid items-center gap-14 pb-16 pt-[136px] md:pt-[168px] lg:grid-cols-12 lg:gap-10 lg:pb-24">
        <div className="lg:col-span-7">
          <Link
            href="#chain"
            className="animate-reveal group inline-flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.12em] text-fog transition-colors hover:text-navy"
          >
            <span className="text-navy">Live on Robinhood Chain</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>

          <h1 className="animate-reveal delay-1 mt-8 text-[44px] leading-[0.98] md:text-[68px] lg:text-[78px] [text-wrap:balance]">
            Private company shares, issued on-chain. <span className="accent-word">With the rules built in.</span>
          </h1>
          <p className="animate-reveal delay-2 mt-7 max-w-[580px] text-[16.5px] leading-[1.65] text-tide md:text-[18px]">
            Precursor is the platform private companies use to issue their shares as tokens on Robinhood Chain. Every
            transfer runs the company&apos;s rules before it settles, and every issuance, offering and corporate action is
            recorded where anyone can verify it.
          </p>

          <div className="animate-reveal delay-3 mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link href={SITE.appHref} className="btn btn-primary btn-lg">
              Open the Console
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href={SITE.explorerHref} className="btn btn-ghost btn-lg">
              View the Explorer
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="animate-reveal delay-3 mt-8 flex items-center gap-2 text-[12.5px] text-fog">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            Issuer-sponsored. Every Precursor token is issued by the company it represents.
          </p>
        </div>

        {/* The product itself, lit from behind */}
        <div className="animate-reveal delay-3 relative mx-auto w-full max-w-[520px] lg:col-span-5 lg:mr-0">
          <div
            aria-hidden="true"
            className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(230_235_244/0.14),transparent_65%)] blur-2xl"
          />
          <ShareClassCard className="card-accent" />
        </div>
      </div>

      {/* Four figures across the full width, divided by hairlines */}
      <div className="container pb-16 md:pb-20">
        <dl className="frame animate-reveal delay-3 grid grid-cols-2 gap-px lg:grid-cols-4">
          {FACTS.map((item) => (
            <div key={item.unit} className="frame-cell px-5 py-6 md:px-7 md:py-7">
              <dt className="caption">{item.unit}</dt>
              <dd className="readout mt-3 font-display text-[34px] leading-none text-navy md:text-[44px]">{item.value}</dd>
              <dd className="mt-2.5 text-[13px] leading-snug text-fog">{item.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
