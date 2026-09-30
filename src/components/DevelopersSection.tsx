import { ArrowUpRight, Braces, FlaskConical, KeyRound, Webhook } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { docsHref } from "@/lib/site";

const FEATURES = [
  {
    icon: Braces,
    title: "REST API and TypeScript SDK",
    body: "Companies, share classes, holders, offerings, windows, distributions, proposals, documents and valuations. JSON, cursor pagination and an Idempotency-Key on every POST.",
  },
  {
    icon: Webhook,
    title: "Signed webhooks",
    body: "Every on-chain event, delivered with its block number, transaction hash and confirmation depth, signed with HMAC-SHA256 and retried for three days.",
  },
  {
    icon: FlaskConical,
    title: "A sandbox on testnet",
    body: "sk_test_ keys run against Robinhood Chain testnet with the same contracts and the same reason codes as mainnet.",
  },
  {
    icon: KeyRound,
    title: "Publishable keys for the client",
    body: "pk_live_ keys call read-only endpoints such as transfer checks and public Explorer data straight from a browser or a wallet.",
  },
] as const;

const WEBHOOKS = ["share_class.deployed", "holder.verified", "transfer.settled", "transfer.blocked", "offering.closed", "liquidity_window.cleared"] as const;

/* Tokens for the snippet, so it can be coloured without a highlighter. */
const C = {
  kw: "text-lagoon",
  str: "text-leaf-deep",
  com: "text-pale",
  fn: "text-navy",
} as const;

export function DevelopersSection() {
  return (
    <section id="developers" className="relative scroll-mt-28 band py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="08"
          label="Developers"
          title={
            <>
              Check a transfer before it is sent. <span className="accent-word">From any app.</span>
            </>
          }
          description="Venues and wallets integrate the rule engine once and reuse it across every company on Precursor. The same canTransfer answer is available on-chain, over the API and in the SDK."
        />

        <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* The snippet */}
          <div className="lg:col-span-7">
            <div className="card overflow-hidden rounded-[22px]">
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
                <span className="caption">check-transfer.ts</span>
                <span className="caption">@precursor/sdk</span>
              </div>
              <pre className="scrollbar-none overflow-x-auto px-5 py-5 font-mono text-[13px] leading-[1.75] text-tide">
                <code>
                  <span className={C.com}>{"$ npm install @precursor/sdk"}</span>
                  {"\n\n"}
                  <span className={C.kw}>import</span>
                  {" { Precursor } "}
                  <span className={C.kw}>from</span> <span className={C.str}>{'"@precursor/sdk"'}</span>
                  {";\n\n"}
                  <span className={C.kw}>const</span>
                  {" precursor = "}
                  <span className={C.kw}>new</span> <span className={C.fn}>Precursor</span>
                  {"(process.env.PRECURSOR_SECRET_KEY);\n\n"}
                  <span className={C.kw}>const</span>
                  {" check = "}
                  <span className={C.kw}>await</span>
                  {" precursor.transfers."}
                  <span className={C.fn}>check</span>
                  {"({\n  share_class: "}
                  <span className={C.str}>{'"cls_nwl_series_b"'}</span>
                  {",\n  from: "}
                  <span className={C.str}>{'"0x71c3a0d5f1b84e2c9a07d36b5e8f12c4d0a39e4a"'}</span>
                  {",\n  to: "}
                  <span className={C.str}>{'"0x4e8817b3a9c25d06e4f71b8a2d93c5e6f048c0b1"'}</span>
                  {",\n  amount: "}
                  <span className={C.str}>{'"500"'}</span>
                  {",\n});\n\n"}
                  <span className={C.com}>{"// {"}</span>
                  {"\n"}
                  <span className={C.com}>{"//   ok: false,"}</span>
                  {"\n"}
                  <span className={C.com}>{'//   reason_code: "NOT_ELIGIBLE",'}</span>
                  {"\n"}
                  <span className={C.com}>{'//   message: "The recipient does not meet the eligibility tier for this share class."'}</span>
                  {"\n"}
                  <span className={C.com}>{"// }"}</span>
                </code>
              </pre>
            </div>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <span className="caption">Webhook events</span>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12.5px] text-fog">
                {WEBHOOKS.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* What comes with it */}
          <div className="lg:col-span-5">
            <ul className="border-b border-line">
              {FEATURES.map((f) => (
                <li key={f.title} className="grid grid-cols-[auto_1fr] gap-4 border-t border-line py-6">
                  <f.icon className="mt-0.5 size-[18px] text-lagoon" strokeWidth={1.7} aria-hidden="true" />
                  <div>
                    <h3 className="text-[16.5px] font-semibold leading-snug text-navy">{f.title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-tide">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={docsHref("developers/quickstart")} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Read the quickstart
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
              <a href={docsHref("developers/api-reference")} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                API reference
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
