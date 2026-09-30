import { Blocks, Fingerprint, Network, Radio, Split, Zap } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const FACTS = [
  { label: "Stack", value: "Arbitrum" },
  { label: "Settles to", value: "Ethereum" },
  { label: "Gas", value: "ETH, sponsored" },
  { label: "Settlement asset", value: "USDG" },
] as const;

const FEATURES = [
  {
    icon: Blocks,
    title: "A standard ERC-20, with permissions",
    body: "Each share class is one Precursor Share Token: an ERC-20 with 18 decimals, ERC-3643-compatible permissioned transfers, and the ERC-8056 multiplier. Wallets and indexers on the chain read it like any other stock token.",
  },
  {
    icon: Radio,
    title: "A Chainlink-compatible valuation oracle",
    body: "ValuationOracle publishes each Reference Valuation on-chain and answers latestRoundData like any AggregatorV3 feed. latestValuation adds the source, the date and the hash of the supporting document.",
  },
  {
    icon: Split,
    title: "Corporate actions without rebasing",
    body: "Splits change the ERC-8056 uiMultiplier after a 48 hour timelock. Raw balances never change, so pools and integrations keep working through the event, and the oracle pauses across it.",
  },
  {
    icon: Network,
    title: "AMMs and permissioned pools",
    body: "The chain already runs AMMs and stablecoin rails. Companies that opt in can list a class in a pool guarded by PoolGate, which enforces the class's rules on every swap.",
  },
  {
    icon: Fingerprint,
    title: "Embedded wallets and account abstraction",
    body: "New holders get an embedded wallet at onboarding, and existing EVM wallets connect as they are. Precursor relays transactions, so investors and employees never need to hold ETH.",
  },
  {
    icon: Zap,
    title: "Cheap enough to check every transfer",
    body: "Low fees and sub-second soft confirmation make a full rule check on every transfer economical, and settlement inherits Ethereum security.",
  },
] as const;

export function ChainSection() {
  return (
    <section id="chain" className="relative isolate scroll-mt-28 overflow-hidden band py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="06"
          label="Robinhood Chain"
          title={
            <>
              Built on the chain where <span className="accent-word">stock tokens</span> already live.
            </>
          }
          description="Robinhood Chain set the conventions that wallets, pools and oracles here already understand. Precursor tokens follow every one of them, then add identity-gated transfers and issuer governance. Precursor is independent and built on Robinhood Chain."
        />

        {/* Spec strip: one frame, four readings */}
        <dl className="frame animate-reveal mt-16 grid grid-cols-2 gap-px lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="frame-cell px-5 py-5 md:px-6 md:py-6">
              <dt className="caption">{fact.label}</dt>
              <dd className="readout mt-3 font-mono text-[18px] font-medium text-navy md:text-[21px]">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {/* What the chain gives a share token: a two-column index, no boxes */}
        <div className="mt-16 grid gap-x-12 md:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <article key={feature.title} className="group grid grid-cols-[auto_1fr] gap-5 border-t border-line py-8">
              <span className="icon-tile transition-shadow group-hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_0_28px_-6px_rgb(230_235_244/0.45)]">
                <feature.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[18px] font-semibold leading-snug">{feature.title}</h3>
                  <span className="index">0{i + 1}</span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-tide">{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
