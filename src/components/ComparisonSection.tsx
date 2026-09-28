import { Spark } from "@/components/atmosphere";
import { SectionHeading } from "@/components/SectionHeading";

const ROWS = [
  {
    label: "Issuer",
    manual: "The company, through spreadsheets and cap table software",
    wrapper: "A third party, without the company",
    precursor: "The company itself, on contracts it controls",
  },
  {
    label: "What you hold",
    manual: "A line in a record someone else maintains",
    wrapper: "A claim on the wrapper that tracks a price",
    precursor: "The share, with the rights its class carries",
  },
  {
    label: "Transfer rules",
    manual: "Reviewed by hand, over weeks",
    wrapper: "Region gating at most",
    precursor: "Eight modules checked on every transfer, with a reason code",
  },
  {
    label: "Liquidity",
    manual: "Occasional tender offers and bilateral deals",
    wrapper: "Continuous, but outside the company's control",
    precursor: "Windows, RFQ and pools the company schedules and approves",
  },
  {
    label: "Pricing",
    manual: "Hard to benchmark, rarely shared",
    wrapper: "A price signal the company never set",
    precursor: "Reference Valuations with their source and date, plus public clearing prices",
  },
  {
    label: "Corporate actions",
    manual: "Paperwork, then manual updates",
    wrapper: "Approximated, if at all",
    precursor: "Splits, distributions, votes and conversions as on-chain transactions",
  },
  {
    label: "The record",
    manual: "Private and fragmented",
    wrapper: "Price data only",
    precursor: "Every issuance and transfer on-chain, identities kept private",
  },
] as const;

const HEAD = "caption";
const COLS = "md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]";

export function ComparisonSection() {
  return (
    <section id="compare" className="relative scroll-mt-28 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="05"
          label="Compared"
          title={
            <>
              The company issues the token. <span className="accent-word">That changes everything after it.</span>
            </>
          }
          description="There are two common ways private company equity changes hands today: manually, against records kept off-chain, or through tokens third parties create without the company. Precursor is the issuer-sponsored alternative."
        />

        {/* A ruled matrix: the alternatives are set back, the Precursor answer carries the light */}
        <div className="mt-16">
          <div className={`hidden border-b border-line pb-4 md:grid ${COLS}`}>
            <div className={`text-fog ${HEAD}`}>Compared on</div>
            <div className={`px-6 text-fog ${HEAD}`}>Spreadsheets and paper transfers</div>
            <div className={`px-6 text-fog ${HEAD}`}>Third-party wrappers</div>
            <div className={`edge-lit px-6 text-navy ${HEAD}`}>Precursor share tokens</div>
          </div>
          <ul className="divide-y divide-line-soft border-b border-line">
            {ROWS.map((row) => (
              <li key={row.label} className={`group grid gap-2 py-6 md:gap-0 md:py-0 ${COLS}`}>
                <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-fog md:py-6">{row.label}</div>
                <div className="text-[15px] leading-relaxed text-fog md:px-6 md:py-6">
                  <span className="caption mr-2 md:hidden">Manual</span>
                  {row.manual}
                </div>
                <div className="text-[15px] leading-relaxed text-fog md:px-6 md:py-6">
                  <span className="caption mr-2 md:hidden">Wrapper</span>
                  {row.wrapper}
                </div>
                <div className="text-[16px] leading-relaxed text-navy md:border-l md:border-line-soft md:bg-[linear-gradient(90deg,rgb(230_235_244/0.04),transparent)] md:px-6 md:py-6">
                  <span className="caption mr-2 text-navy md:hidden">Precursor</span>
                  {row.precursor}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 flex max-w-3xl gap-3 text-[14.5px] leading-relaxed text-tide">
          <Spark className="mt-[8px]" />
          <span>Nothing is tokenized on Precursor without the issuer. Every token is issued by the company it represents.</span>
        </p>
      </div>
    </section>
  );
}
