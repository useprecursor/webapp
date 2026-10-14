import { ArrowUpRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * One share class as the Explorer shows it: the token, its Reference
 * Valuation, an open offering, and two transfer checks traced step by step.
 * The company is shown as an example; every figure is illustrative.
 */
const RAISED = 3_120_000;
const MAX_RAISE = 4_000_000;
const MIN_RAISE = 1_500_000;

const TRACE = [
  "Token not paused",
  "Sender identity",
  "Recipient identity",
  "RegionModule",
  "EligibilityModule",
  "HoldingPeriodModule",
] as const;

/** Anthropic's A\ symbol, built from the A and the backslash of its wordmark. */
function AnthropicMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 193 115" className={className} fill="currentColor" aria-label="Anthropic" role="img">
      <path d="M44.3163,1.9061,0,113.094H24.779l9.0634-23.3495H80.2061L89.268,113.094h24.779L69.7307,1.9061ZM41.8575,69.0953l15.166-39.0746L72.19,69.0953Z" />
      <path d="M124,1.9061,168.316,113.094h24.302L148.302,1.9061Z" />
    </svg>
  );
}

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (n: number) => `${(n / MAX_RAISE) * 100}%`;

export function ShareClassCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("card overflow-hidden rounded-[28px] p-2 text-[14px] text-tide", className)}
      aria-label="A sample share class on Precursor, with an open offering and two transfer checks"
    >
      {/* The share class and its token */}
      <div className="flex items-center gap-3.5 px-4 pb-4 pt-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] border border-line bg-haze text-navy">
          <AnthropicMark className="h-[13px] w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-semibold text-navy">Anthropic</p>
          <p className="truncate text-[13px] text-fog">
            Series F Preferred · <span className="font-mono">ANTH-F</span>
          </p>
        </div>
        <span className="tag shrink-0 text-leaf-deep">Live</span>
      </div>

      {/* Reference Valuation and the shape of the class */}
      <div className="edge-lit rounded-[22px] border border-line-soft bg-[radial-gradient(ellipse_80%_90%_at_50%_0%,rgb(230_235_244/0.09),transparent_70%),linear-gradient(180deg,#121316,#0b0c0e)] px-5 pb-5 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-tide">Reference Valuation</p>
            <p className="readout mt-1 font-display text-[44px] leading-none text-navy">
              22.50
              <span className="text-[20px] text-tide"> USDG</span>
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fog">Priced round · Sep 30, 2026</p>
          </div>
          <dl className="grid shrink-0 gap-3 text-right">
            <div>
              <dt className="caption">Holders</dt>
              <dd className="readout mt-1 font-mono text-[17px] text-navy">184</dd>
            </div>
            <div>
              <dt className="caption">Supply</dt>
              <dd className="readout mt-1 font-mono text-[17px] text-navy">2.40M</dd>
            </div>
          </dl>
        </div>

        {/* The open offering: raised so far against the minimum and the maximum */}
        <div className="mt-6 border-t border-line-soft pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-navy">Series F extension</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fog">Closes in 6 days</p>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-haze/80">
            <div
              className="animate-fill absolute inset-y-0 left-0 origin-left rounded-full bg-[linear-gradient(90deg,#8d97aa,#ffffff)] shadow-[0_0_12px_rgb(230_235_244/0.6)]"
              style={{ width: pct(RAISED), animationDelay: "0.3s" }}
            />
            <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-tide/50" style={{ left: pct(MIN_RAISE) }} aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex justify-between text-[12px]">
            <span className="readout font-semibold text-navy">{fmt(RAISED)} USDG</span>
            <span className="readout text-fog">of {fmt(MAX_RAISE)} · min {fmt(MIN_RAISE)}</span>
          </div>
        </div>
      </div>

      {/* Two transfer checks: one passes every rule, one stops at eligibility */}
      <div className="px-4 pb-2 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13.5px] font-semibold text-navy">canTransfer</p>
          <p className="font-mono text-[11.5px] text-fog">500 ANTH-F</p>
        </div>

        <ol className="mt-3 divide-y divide-line-soft border-y border-line-soft font-mono text-[12px]">
          {TRACE.map((step, i) => (
            <li
              key={step}
              className="animate-reveal flex items-center justify-between gap-3 py-[7px]"
              style={{ animationDelay: `${0.4 + i * 0.12}s` }}
            >
              <span className="flex items-center gap-2.5 text-tide">
                <Check className="size-3 text-leaf-deep" strokeWidth={3} aria-hidden="true" />
                {step}
              </span>
              <span className="text-fog">pass</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-2.5">
            <span className="readout text-fog">0x71c3…9e4a to 0xb02f…17d3</span>
            <span className="font-medium text-leaf-deep">OK</span>
          </li>
        </ol>

        <div className="mt-3 rounded-[14px] border border-line-soft bg-rose-soft/40 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3 font-mono text-[12px]">
            <span className="flex items-center gap-2.5 text-tide">
              <X className="size-3 text-rose-deep" strokeWidth={3} aria-hidden="true" />
              <span className="readout">0x71c3…9e4a to 0x4e88…c0b1</span>
            </span>
            <span className="font-medium text-rose-deep">NOT_ELIGIBLE</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-fog">
            Stopped at EligibilityModule. The recipient does not meet the eligibility tier for this class.
          </p>
        </div>
      </div>

      <div className="mx-2 mb-2 mt-3 flex items-center justify-between rounded-2xl bg-haze px-4 py-3 text-[12.5px]">
        <span className="readout text-fog">Checked before anyone signs</span>
        <span className="inline-flex items-center gap-1 font-medium text-lagoon-deep">
          View in Explorer <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
