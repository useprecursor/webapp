import { Eye, EyeOff } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const PUBLIC = [
  "Total supply and holder count per share class",
  "Every mint, burn, transfer, freeze, recovery and pause",
  "Offering terms, raise progress and window clearing prices",
  "Corporate actions and multiplier history",
  "Rule module configuration for every class",
  "Hashes of every anchored document",
] as const;

const PRIVATE = [
  "Holder names and contact details",
  "Identity verification documents",
  "The full cap table with identities, for the issuer only",
  "Financial statements, gated to verified holders",
  "Document contents, unless the company makes them public",
  "Individual claim details",
] as const;

const EVENTS = [
  "SharesIssued",
  "Transfer",
  "ModuleConfigured",
  "OfferingClosed",
  "WindowCleared",
  "QuoteFilled",
  "DistributionFunded",
  "ProposalFinalized",
  "DocumentAnchored",
  "ValuationPublished",
  "RecoveryScheduled",
  "Paused",
] as const;

const DOCUMENTS = [
  "SHARE_CLASS_TERMS",
  "OFFERING_DOCUMENT",
  "FINANCIAL_STATEMENT",
  "COMPANY_UPDATE",
  "BOARD_RESOLUTION",
  "VALUATION_REPORT",
] as const;

function Column({ icon: Icon, title, items, muted }: { icon: typeof Eye; title: string; items: readonly string[]; muted?: boolean }) {
  return (
    <div className="frame-cell p-7 md:p-9">
      <div className="flex items-center justify-between">
        <p className="caption text-navy">{title}</p>
        <Icon className={muted ? "size-4 text-fog" : "size-4 text-lagoon"} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <ol className="mt-8 divide-y divide-line-soft border-t border-line-soft">
        {items.map((item, i) => (
          <li key={item} className="grid grid-cols-[36px_1fr] gap-3 py-4">
            <span className="readout pt-0.5 font-mono text-[12px] text-fog">0{i + 1}</span>
            <span className={muted ? "text-[15px] leading-relaxed text-tide" : "text-[15px] leading-relaxed text-navy"}>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TransparencySection() {
  return (
    <section id="transparency" className="relative scroll-mt-28 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="07"
          label="Transparency"
          title={
            <>
              Anyone can verify what happened. <span className="accent-word">Only the right people see who.</span>
            </>
          }
          description="The Explorer reads the public record straight from Robinhood Chain. Personal data never goes on-chain, so the record can be fully public while holders stay private."
        />

        <div className="frame animate-reveal mt-16 grid gap-px md:grid-cols-2">
          <Column icon={Eye} title="Public, on-chain" items={PUBLIC} />
          <Column icon={EyeOff} title="Private, access-controlled" items={PRIVATE} muted />
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-12 md:grid-cols-2">
          <div className="border-t border-line pt-7">
            <h3 className="text-[17px] font-semibold leading-snug text-navy">Every state change emits an event</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-tide">
              Supply never changes silently. Each mint, burn, recovery, freeze and pause carries a reference, and the Explorer and
              the API index every event with its block and transaction.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12.5px] text-fog">
              {EVENTS.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line pt-7">
            <h3 className="text-[17px] font-semibold leading-snug text-navy">Disclosures, anchored by hash</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-tide">
              DisclosureRegistry records the kind, hash and location of every document the company publishes. Contents stay in
              Portfolio for verified holders, and anyone can confirm a document has not changed since it was anchored.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12.5px] text-fog">
              {DOCUMENTS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
