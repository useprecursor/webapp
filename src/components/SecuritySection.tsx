import { SectionHeading } from "@/components/SectionHeading";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const TIMELOCKS = [
  { label: "Recovery", value: "72 h", note: "Minimum 48 hours" },
  { label: "Multiplier change", value: "48 h", note: "Splits and reverse splits" },
  { label: "Module change", value: "24 h", note: "Add or remove a rule" },
  { label: "Token upgrade", value: "7 days", note: "UUPS, via IssuerTimelock" },
  { label: "Pause", value: "Immediate", note: "Unpause is immediate too" },
] as const;

const ROLES = [
  { role: "ISSUER_ADMIN", holder: "Company multi-sig", can: "Configures modules, offerings, windows, distributions and votes." },
  { role: "REGISTRAR", holder: "Registrar", can: "Mints and burns against cap table records and approves recoveries." },
  { role: "OPERATOR", holder: "Precursor relayers", can: "Submits and sponsors transactions. Cannot move holder tokens alone." },
  { role: "PAUSER", holder: "Issuer and registrar", can: "Pauses and unpauses a share class, with a reason on-chain." },
] as const;

type Stop = { name: string; body: string; event?: string; done: boolean };

const RECOVERY: Stop[] = [
  { name: "Lost wallet reported", body: "The holder reports the lost wallet and verifies their identity again with a trusted verifier.", done: true },
  {
    name: "Two of three approve",
    body: "Any two of ISSUER_ADMIN, REGISTRAR and OPERATOR approve the replacement wallet. No single party can do it alone.",
    done: true,
  },
  {
    name: "Scheduled in public",
    body: "The recovery is scheduled on-chain with its execution time, so the holder and anyone watching can see it before it happens.",
    event: "RecoveryScheduled",
    done: true,
  },
  { name: "Timelock runs", body: "The balance stays frozen for 72 hours by default. A mistaken or contested recovery can be cancelled.", event: "RecoveryCancelled", done: false },
  { name: "Executed", body: "The full balance moves to the replacement wallet, with lots and holding periods intact.", event: "RecoveryExecuted", done: false },
];

export function SecuritySection() {
  return (
    <section id="security" className="relative scroll-mt-28 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="09"
          label="Security and control"
          title={
            <>
              Sensitive actions wait in public, <span className="accent-word">and include the company</span>.
            </>
          }
          description="Roles are separated, sensitive actions pass a timelocked multi-sig on which the issuer is a signer, and every pause publishes its reason. Each deployment is rehearsed on testnet with the same configuration first."
        />

        {/* Timelock defaults: one frame, five readings */}
        <dl className="frame animate-reveal mt-16 grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5">
          {TIMELOCKS.map((t) => (
            <div key={t.label} className="frame-cell px-5 py-5 md:px-6 md:py-6">
              <dt className="caption">{t.label}</dt>
              <dd className="readout mt-3 font-mono text-[18px] font-medium text-navy md:text-[22px]">{t.value}</dd>
              <dd className="mt-2 text-[12.5px] leading-snug text-fog">{t.note}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[13px] text-fog">Defaults. Each company can configure its timelocks within fixed bounds.</p>

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          {/* Roles as ruled rows */}
          <div className="lg:col-span-5">
            <p className="caption">Roles</p>
            <ul className="mt-5 border-b border-line">
              {ROLES.map((r) => (
                <li key={r.role} className="border-t border-line py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-mono text-[13px] text-navy">{r.role}</span>
                    <span className="text-[13px] text-fog">{r.holder}</span>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-tide">{r.can}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[13.5px] leading-relaxed text-fog">
              Found a vulnerability? Write to{" "}
              <a href={`mailto:${SITE.securityEmail}`} className="text-tide hover:text-navy">
                {SITE.securityEmail}
              </a>
              .
            </p>
          </div>

          {/* Recovery as a vertical timeline: the lit stretch has happened, the dashed stretch is pending */}
          <div className="lg:col-span-7">
            <p className="caption">Recovery, not custody</p>
            <ol className="mt-5">
              {RECOVERY.map((stop, i) => (
                <li
                  key={stop.name}
                  className={cn(
                    "relative border-l pb-8 pl-8 md:pl-10",
                    stop.done ? "border-white/60" : "border-dashed border-pale",
                    i === RECOVERY.length - 1 && "pb-0"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0 top-[5px] size-[11px] -translate-x-1/2 rounded-full border",
                      stop.done ? "border-white bg-white shadow-[0_0_14px_2px_rgb(230_235_244/0.7)]" : "border-fog bg-canvas"
                    )}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em]">
                    <span className="text-fog">0{i + 1}</span>
                    {stop.event && <span className={stop.done ? "normal-case tracking-normal text-leaf-deep" : "normal-case tracking-normal text-fog"}>{stop.event}</span>}
                  </div>
                  <h3 className="mt-2 font-display text-[22px] font-medium leading-[1.15] tracking-[-0.025em] text-navy md:text-[24px]">{stop.name}</h3>
                  <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-tide">{stop.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
