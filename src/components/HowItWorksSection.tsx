import { SectionHeading } from "@/components/SectionHeading";
import { cn } from "@/lib/utils";

/*
 * The path a company takes from its existing cap table to a live share
 * token. Each row carries a short tag with the one detail a reader is most
 * likely to look for.
 */
const STAGES = [
  {
    n: "01",
    title: "Verify",
    tag: "Registrar",
    tone: "text-fog",
    body: "The company is verified and chooses which share classes to bring on-chain. It appoints a registrar, the party that keeps the authoritative cap table, which can be the company itself or an administrator it names.",
  },
  {
    n: "02",
    title: "Import",
    tag: "CSV or export",
    tone: "text-fog",
    body: "The existing cap table comes in as a CSV or an export from cap table software and is reconciled line by line. Holders are invited, verify their identity, and receive an embedded wallet or connect their own.",
  },
  {
    n: "03",
    title: "Configure",
    tag: "8 modules",
    tone: "text-lagoon",
    body: "In the Console, each share class gets its rules: regions, eligibility tier, holding periods, holder cap, transfer windows, right of first refusal, maximum ownership and employee vesting. Rules are modules, so they can change later without upgrading the token.",
  },
  {
    n: "04",
    title: "Rehearse",
    tag: "Testnet",
    tone: "text-amber-deep",
    body: "The identical configuration is deployed to Robinhood Chain testnet first. The company runs sample transfers, an offering and a window against it, and reviews every reason code before anything touches mainnet.",
  },
  {
    n: "05",
    title: "Deploy",
    tag: "Mainnet",
    tone: "text-leaf-deep",
    body: "PrecursorFactory deploys the company's full contract set to mainnet in one transaction. The registrar mints tokens to each holder against the reconciled cap table, and every mint emits SharesIssued with its reference.",
  },
  {
    n: "06",
    title: "Operate",
    tag: "USDG",
    tone: "text-leaf-deep",
    body: "From here the company raises through offerings, opens Liquidity Windows, pays distributions, runs votes and anchors disclosures, all from the Console and all as on-chain transactions.",
  },
] as const;

const PRINCIPLES = [
  "The token is the share. It carries the economic, information and voting rights of its class, not a claim on a third party.",
  "The company sets the rules. They are configured in the Console and enforced by contracts the company controls.",
  "The company decides when liquidity happens, in windows it schedules or through venues it explicitly approves.",
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative scroll-mt-28 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="01"
          label="How it works"
          title={
            <>
              From a cap table to a <span className="accent-word">live share token</span> in under four weeks.
            </>
          }
          meta="Company onboarding"
          description="Precursor replaces spreadsheets and manual transfer review with a share token per class. The token balances become the cap table, reconciled once at onboarding and kept current by the chain itself."
        />

        {/* The six stages as ruled rows: number, name, what happens, the detail to look for */}
        <ol className="mt-16 border-b border-line">
          {STAGES.map((stage, i) => (
            <li
              key={stage.title}
              className={cn(
                "group animate-reveal grid gap-3 border-t border-line py-7 transition-colors hover:bg-[rgb(255_255_255/0.015)] md:grid-cols-12 md:gap-8 md:py-9",
                `delay-${Math.min(i + 1, 5)}`
              )}
            >
              <span className="readout font-mono text-[13px] text-fog transition-colors group-hover:text-navy md:col-span-1 md:pt-2">{stage.n}</span>
              <h3 className="font-display text-[30px] font-medium leading-none tracking-[-0.03em] md:col-span-3 md:text-[38px]">{stage.title}</h3>
              <p className="max-w-[620px] text-[15.5px] leading-relaxed text-tide md:col-span-6">{stage.body}</p>
              <span className={cn("tag md:col-span-2 md:justify-self-end md:pt-2", stage.tone)}>{stage.tag}</span>
            </li>
          ))}
        </ol>

        {/* What issuer-sponsored means, in three columns */}
        <div className="mt-16 grid gap-10 md:grid-cols-12">
          <p className="caption md:col-span-3 md:pt-1">Issuer-sponsored</p>
          <ul className="grid gap-8 sm:grid-cols-3 md:col-span-9">
            {PRINCIPLES.map((point, i) => (
              <li key={point} className="border-l border-line pl-5">
                <span className="readout font-mono text-[12px] text-fog">0{i + 1}</span>
                <p className="mt-3 text-[15px] leading-relaxed text-navy">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
