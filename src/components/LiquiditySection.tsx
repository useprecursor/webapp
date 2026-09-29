import { ArrowLeftRight, CalendarClock, Landmark, Waves } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { cn } from "@/lib/utils";

const MECHANISMS = [
  {
    icon: Landmark,
    title: "Offerings",
    contract: "OfferingVault",
    body: "The company sets a price per share, a minimum and maximum raise, a minimum ticket and dates. Investors subscribe in USDG, held in escrow. At close, shares are minted and funds released in one transaction, or every investor is refunded.",
  },
  {
    icon: CalendarClock,
    title: "Liquidity Windows",
    contract: "LiquidityWindow",
    body: "Time-boxed sales the company schedules. Sellers lock shares, eligible buyers lock USDG, and the window clears at one uniform price. With ROFR enabled, the company gets a priority bid at that price before it settles. Fixed-price tenders work the same way.",
  },
  {
    icon: ArrowLeftRight,
    title: "RFQ",
    contract: "RFQSettlement",
    body: "Eligible holders trade between windows on signed EIP-712 quotes. The taker fills on-chain, canTransfer runs on both sides, and the company can restrict RFQ to its transfer windows.",
  },
  {
    icon: Waves,
    title: "Permissioned pools",
    contract: "PoolGate",
    body: "Companies that opt in can list a class on an AMM pool. PoolGate checks canTransfer on every swap and liquidity change, so only eligible holders can trade or provide liquidity.",
  },
] as const;

/* A worked window, cleared with the same algorithm the contract uses. */
type Order = { id: string; qty: number; price: number; filled: number };

const ASKS: Order[] = [
  { id: "A1", qty: 4_000, price: 21.0, filled: 4_000 },
  { id: "A2", qty: 6_000, price: 23.0, filled: 6_000 },
  { id: "A3", qty: 5_000, price: 24.0, filled: 5_000 },
  { id: "A4", qty: 3_000, price: 26.0, filled: 0 },
];

const BIDS: Order[] = [
  { id: "B1", qty: 5_000, price: 26.0, filled: 5_000 },
  { id: "B2", qty: 4_000, price: 24.5, filled: 4_000 },
  { id: "B3", qty: 8_000, price: 24.0, filled: 6_000 },
  { id: "B4", qty: 4_000, price: 22.0, filled: 0 },
];

const CLEARING = 24.0;
const VOLUME = 15_000;

const fmt = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) => n.toFixed(2);

function OrderList({ title, note, orders }: { title: string; note: string; orders: Order[] }) {
  return (
    <div className="frame-cell p-6 md:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <p className="caption text-navy">{title}</p>
        <p className="caption">{note}</p>
      </div>
      <div className="mt-5 grid grid-cols-[32px_1fr_1fr_1fr] gap-x-3 border-b border-line-soft pb-2.5 caption">
        <span>ID</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Limit</span>
        <span className="text-right">Filled</span>
      </div>
      <ul className="divide-y divide-line-soft font-mono text-[13px]">
        {orders.map((o) => {
          const status = o.filled === o.qty ? "full" : o.filled > 0 ? "partial" : "none";
          return (
            <li key={o.id} className="readout grid grid-cols-[32px_1fr_1fr_1fr] gap-x-3 py-3">
              <span className="text-fog">{o.id}</span>
              <span className="text-right text-tide">{fmt(o.qty)}</span>
              <span className="text-right text-tide">{usd(o.price)}</span>
              <span
                className={cn(
                  "text-right",
                  status === "full" && "text-leaf-deep",
                  status === "partial" && "text-amber-deep",
                  status === "none" && "text-pale"
                )}
              >
                {status === "none" ? "0" : fmt(o.filled)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LiquiditySection() {
  return (
    <section id="liquidity" className="relative scroll-mt-28 band py-20 md:py-28">
      <div className="container">
        <SectionHeading
          index="04"
          label="Capital and liquidity"
          title={
            <>
              Raise and sell on a schedule <span className="accent-word">the company sets</span>.
            </>
          }
          description="Liquidity is something the company controls, not something that happens to it. Every mechanism settles delivery versus payment in USDG: shares and stablecoins move in the same transaction, or neither moves."
        />

        {/* Four mechanisms in one frame */}
        <div className="frame animate-reveal mt-16 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {MECHANISMS.map((item, i) => (
            <article key={item.title} className="frame-cell flex flex-col p-7">
              <div className="flex items-center justify-between">
                <item.icon className="size-5 text-lagoon" strokeWidth={1.6} aria-hidden="true" />
                <span className="index">0{i + 1}</span>
              </div>
              <h3 className="mt-10 text-[18px] font-semibold leading-snug">{item.title}</h3>
              <p className="mt-1 font-mono text-[12px] text-fog">{item.contract}</p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-tide">{item.body}</p>
            </article>
          ))}
        </div>

        {/* A worked example: one window, eight orders, one price */}
        <div className="mt-20 grid gap-6 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <p className="caption">Worked example</p>
            <h3 className="mt-4 font-display text-[28px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[32px]">
              Eight orders, one clearing price.
            </h3>
          </div>
          <p className="text-[15px] leading-relaxed text-tide md:col-span-8 md:self-end">
            A Liquidity Window on ANTH-F, an example Series F Preferred class for Anthropic. At close, anyone can call{" "}
            <span className="font-mono text-[13.5px] text-navy">clear(windowId)</span>. The contract picks the single price that
            matches the most shares, breaking ties toward the last Reference Valuation, then fills by price priority and pro-rata at
            the margin. Everything unmatched is released.
          </p>
        </div>

        <div className="frame animate-reveal mt-10 grid gap-px lg:grid-cols-3">
          <OrderList title="Asks" note="Sellers lock shares" orders={ASKS} />
          <OrderList title="Bids" note="Buyers lock USDG" orders={BIDS} />
          <div className="frame-cell flex flex-col p-6 md:p-7">
            <div className="flex items-baseline justify-between gap-3">
              <p className="caption text-navy">Cleared</p>
              <p className="caption text-leaf-deep">WindowCleared</p>
            </div>
            <p className="readout mt-6 font-display text-[56px] leading-none text-navy">
              {usd(CLEARING)}
              <span className="text-[22px] text-tide"> USDG</span>
            </p>
            <p className="mt-2 text-[13.5px] text-fog">Uniform price for every fill, buyer and seller alike</p>
            <dl className="mt-8 divide-y divide-line-soft border-y border-line-soft text-[14px]">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-tide">Shares matched</dt>
                <dd className="readout font-mono text-navy">{fmt(VOLUME)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-tide">Settled to sellers</dt>
                <dd className="readout font-mono text-navy">{fmt(VOLUME * CLEARING)} USDG</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-tide">B3 at the margin</dt>
                <dd className="readout font-mono text-amber-deep">6,000 of 8,000</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-tide">Prior Reference Valuation</dt>
                <dd className="readout font-mono text-navy">22.50</dd>
              </div>
            </dl>
            <p className="mt-auto pt-6 text-[13.5px] leading-relaxed text-tide">
              The clearing price is published as the new Reference Valuation, with source{" "}
              <span className="font-mono text-[12.5px] text-navy">WINDOW_CLEARING</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
