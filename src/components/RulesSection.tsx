import { Fingerprint } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

/* The eight modules a share class can enable, and the code each returns. */
const MODULES = [
  { contract: "RegionModule", code: "REGION_BLOCKED", rule: "Allows or blocks holders by region, using an allow-list or a block-list of countries." },
  { contract: "EligibilityModule", code: "NOT_ELIGIBLE", rule: "Requires the recipient to hold a valid eligibility claim at or above the class's tier." },
  { contract: "HoldingPeriodModule", code: "HOLDING_PERIOD_ACTIVE", rule: "Locks each lot for a set period after it is acquired. Lots are consumed oldest first." },
  { contract: "HolderCapModule", code: "HOLDER_CAP_REACHED", rule: "Limits the number of distinct holders of the class." },
  { contract: "TransferWindowModule", code: "WINDOW_CLOSED", rule: "Allows transfers only inside windows the company schedules." },
  { contract: "ROFRModule", code: "ROFR_PENDING", rule: "Gives the company a right of first refusal, exercised on-chain." },
  { contract: "MaxOwnershipModule", code: "MAX_OWNERSHIP_EXCEEDED", rule: "Caps any single holder's share of the class." },
  { contract: "EmployeeVestingModule", code: "UNVESTED", rule: "Keeps unvested employee shares locked and releases them on schedule." },
] as const;

/* canTransfer runs in this order and stops at the first failure. */
const ORDER = [
  {
    n: "01",
    title: "Token",
    body: "Is the class paused, and does the sender hold enough unlocked, unfrozen shares?",
    codes: ["TOKEN_PAUSED", "INSUFFICIENT_UNLOCKED_BALANCE", "FROZEN"],
  },
  {
    n: "02",
    title: "Identity",
    body: "Do both wallets map to a verified identity on the company's registry, with claims still in date?",
    codes: ["SENDER_NOT_VERIFIED", "RECIPIENT_NOT_VERIFIED", "CLAIM_EXPIRED"],
  },
  {
    n: "03",
    title: "Modules",
    body: "Each module the company enabled runs in turn. If every one passes, the check returns OK and the transfer settles.",
    codes: ["8 module codes", "OK"],
  },
] as const;

const CLAIMS = [
  { topic: "IDENTITY_VERIFIED", body: "The holder passed identity verification. Carries an expiry." },
  { topic: "INVESTOR_ELIGIBLE", body: "The holder's eligibility tier, as attested by a trusted verifier." },
  { topic: "REGION", body: "An ISO 3166 country code, used by RegionModule." },
  { topic: "EMPLOYEE_OF", body: "The company the holder works for, used for vesting and employee windows." },
  { topic: "SCREENED", body: "When the holder was last screened. Revoked automatically if re-screening fails." },
  { topic: "VENUE", body: "Marks an approved pool or venue contract that may hold shares." },
] as const;

const TH = "px-5 py-3.5 caption text-fog";

export function RulesSection() {
  return (
    <section id="rules" className="relative scroll-mt-28 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="03"
          label="Transfer rules"
          title={
            <>
              Every transfer is checked. <span className="accent-word">Every answer has a code.</span>
            </>
          }
          description="Rules live inside the token, so they hold on every wallet, venue and pool on a permissionless chain. A transfer that breaks a rule never settles, and canTransfer returns the reason before anyone signs."
        />

        {/* Check order: token, identity, then the modules */}
        <div className="frame animate-reveal mt-16 grid gap-px md:grid-cols-3">
          {ORDER.map((step) => (
            <article key={step.title} className="frame-cell flex flex-col p-7">
              <div className="flex items-center justify-between">
                <span className="caption">Step {step.n}</span>
                <span className="index">canTransfer</span>
              </div>
              <h3 className="mt-8 font-display text-[26px] font-medium leading-none tracking-[-0.03em]">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-tide">{step.body}</p>
              <ul className="mt-auto flex flex-col gap-1.5 pt-6 font-mono text-[12px] text-fog">
                {step.codes.map((code) => (
                  <li key={code} className={code === "OK" ? "text-leaf-deep" : undefined}>
                    {code}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Modules, phone */}
        <ul className="mt-12 divide-y divide-line-soft border-y border-line md:hidden">
          {MODULES.map((m) => (
            <li key={m.contract} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[15.5px] font-semibold text-navy">{m.contract}</span>
                <span className="font-mono text-[12px] text-rose-deep">{m.code}</span>
              </div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-tide">{m.rule}</p>
            </li>
          ))}
        </ul>

        {/* Modules, tablet and up */}
        <div className="frame scrollbar-none mt-12 hidden overflow-x-auto md:block">
          <table className="ledger w-full min-w-[760px] border-collapse bg-canvas text-left text-[15px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Module</th>
                <th scope="col" className={TH}>Reason code</th>
                <th scope="col" className={TH}>What it enforces</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.contract}>
                  <td className="whitespace-nowrap px-5 py-4 align-top font-mono text-[14px] text-navy">{m.contract}</td>
                  <td className="whitespace-nowrap px-5 py-4 align-top font-mono text-[13px] text-rose-deep">{m.code}</td>
                  <td className="px-5 py-4 align-top text-[14.5px] leading-relaxed text-tide">{m.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-fog">
          Modules are configured per share class and swapped without upgrading the token. Adding or removing one passes a 24 hour timelock.
        </p>

        {/* Identity and claims */}
        <div className="mt-20 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="icon-tile">
              <Fingerprint className="size-[18px]" aria-hidden="true" />
            </span>
            <h3 className="mt-6 font-display text-[28px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[32px]">
              Identity as signed claims, with no personal data on-chain.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-tide">
              Each company keeps an IdentityRegistry that maps wallets to an on-chain identity. The identity holds claims signed by
              verifiers the company trusts, each with a topic, a value and an expiry. Names, documents and contact details stay
              with the verifier and never reach the chain.
            </p>
          </div>
          <ol className="grid gap-x-10 sm:grid-cols-2 md:col-span-8">
            {CLAIMS.map((claim) => (
              <li key={claim.topic} className="border-t border-line py-6">
                <p className="font-mono text-[12.5px] text-navy">{claim.topic}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-tide">{claim.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
