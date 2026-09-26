import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { SITE, docsHref } from "@/lib/site";

const PRODUCTS = [
  {
    n: "01",
    label: "Console",
    audience: "For companies",
    title: "Run your equity from one place",
    body: "Finance teams and boards configure share classes and transfer rules, run offerings and Liquidity Windows, and approve sensitive actions through a multi-sig the company sits on.",
    points: [
      "Cap table import, reconciliation and holder invites",
      "Offerings with USDG escrow, minted at close or refunded",
      "Distributions, votes and anchored disclosures",
      "Reference Valuations published with their source and date",
    ],
    cta: { label: "Open the Console", href: SITE.appHref },
  },
  {
    n: "02",
    label: "Portfolio",
    audience: "For holders",
    title: "Hold, invest and sell on the company's terms",
    body: "Holders see every position by lot, with unlocked and locked shares apart. They join offerings, sell in Liquidity Windows, claim distributions, vote and read company documents. Gas is sponsored.",
    points: [
      "Vested and unvested shares shown side by side",
      "A plain explanation of any rule before you sign",
      "Same-day identity verification, embedded wallet included",
      "Proceeds in USDG, in the same transaction as the sale",
    ],
    cta: { label: "Open Portfolio", href: SITE.portfolioHref },
  },
  {
    n: "03",
    label: "Explorer and API",
    audience: "For everyone",
    title: "A public record, and an interface to build on",
    body: "The Explorer shows every company's supply, holder count, rules, offerings, windows, valuations and events, without personal data. The API and SDK expose the same records and transfer checks to venues and wallets.",
    points: [
      "Every issuance, transfer and corporate action, linked on-chain",
      "Transfer checks with a reason code, before submission",
      "Signed webhooks for every on-chain event",
      "A sandbox on Robinhood Chain testnet",
    ],
    cta: { label: "View the Explorer", href: SITE.explorerHref },
  },
] as const;

export function ProductsSection() {
  return (
    <section id="products" className="relative scroll-mt-28 band py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="02"
          label="Products"
          title={
            <>
              One record of ownership, seen from <span className="accent-word">three sides</span>.
            </>
          }
          description="The company works in the Console. Holders work in Portfolio. Anyone can read the Explorer, and developers reach all of it through the API. Each surface reads the same contracts on Robinhood Chain."
        />

        {/* Three surfaces in one frame, divided by hairlines */}
        <div className="frame animate-reveal mt-16 grid gap-px lg:grid-cols-3">
          {PRODUCTS.map((product) => (
            <article key={product.label} className="frame-cell flex flex-col p-7 md:p-9">
              <div className="flex items-center justify-between gap-4 font-mono text-[11.5px] uppercase tracking-[0.1em] text-fog">
                <span>
                  <span className="text-navy">{product.label}</span> · {product.audience}
                </span>
                <span>{product.n}</span>
              </div>
              <h3 className="mt-16 font-display text-[28px] font-medium leading-[1.08] tracking-[-0.03em] md:text-[32px]">{product.title}</h3>
              <p className="mt-4 text-[15.5px] leading-relaxed text-tide">{product.body}</p>
              <ul className="mt-8 divide-y divide-line-soft border-t border-line-soft text-[14.5px] leading-snug text-tide">
                {product.points.map((point) => (
                  <li key={point} className="flex gap-3 py-3.5">
                    <Check className="mt-[2px] size-3.5 shrink-0 text-lagoon" strokeWidth={2.5} aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link
                  href={product.cta.href}
                  className="group inline-flex items-center gap-2 text-[14.5px] font-medium text-navy transition-colors hover:text-lagoon-deep"
                >
                  {product.cta.label}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-[13.5px] text-fog">
          Read more about each surface in the{" "}
          <a href={docsHref("products/console")} target="_blank" rel="noopener noreferrer" className="text-tide underline-offset-4 hover:text-navy hover:underline">
            product documentation
          </a>
          .
        </p>
      </div>
    </section>
  );
}
