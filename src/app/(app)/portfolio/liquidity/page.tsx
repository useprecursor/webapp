"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Meter,
  Notice,
  PageBody,
  PageHeader,
  Panel,
  PanelHeader,
  Segmented,
  StatPill,
  Table,
  Td,
  Th,
} from "@/components/app/ui";
import { CallLine, CheckLine, CompanyMark, KV } from "@/components/app/holder-kit";
import { useSandbox } from "@/lib/precursor/store";
import {
  breakdown,
  byId,
  canTransfer,
  CLAIM_LABEL,
  fmtDateTime,
  fmtDay,
  fmtRelative,
  fmtShares,
  fmtUsd,
  latestValuation,
  previewClearing,
  VALUATION_SOURCE_LABEL,
} from "@/lib/precursor/engine";
import type { LiquidityWindow, Sandbox, WindowOrder } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";

const isLive = (w: LiquidityWindow) => w.status === "OPEN" || w.status === "SCHEDULED";

function hasClaims(s: Sandbox, holderId: string, topics: LiquidityWindow["sellerClaims"], now: number) {
  const h = byId(s.holders, holderId);
  return topics.filter((t) => !h?.claims.some((c) => c.topic === t && c.expiresAt > now));
}

export default function Page() {
  const { s, now, viewer } = useSandbox();
  const live = useMemo(() => s.windows.filter(isLive).sort((a, b) => a.opensAt - b.opensAt), [s.windows]);
  const past = useMemo(() => s.windows.filter((w) => !isLive(w)).sort((a, b) => (b.result?.clearedAt ?? b.closesAt) - (a.result?.clearedAt ?? a.closesAt)), [s.windows]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = live.find((w) => w.id === selectedId) ?? live.find((w) => w.status === "OPEN") ?? live[0];

  const myOrders = s.windows.flatMap((w) => w.orders.filter((o) => o.holderId === viewer.holderId).map((o) => ({ w, o })));
  const sellable = [...new Set(live.map((w) => w.classId))].reduce((a, c) => a + breakdown(s, c, viewer.holderId, now).unlocked, 0);
  const inOrders = myOrders.filter(({ w, o }) => isLive(w) && !o.cancelled && o.side === "SELL").reduce((a, { o }) => a + o.quantity, 0);
  const lastCleared = past.find((w) => w.status === "CLEARED" && w.result && w.result.volume > 0);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Liquidity Windows"
        title="Sell or buy in a Liquidity Window"
        description="Companies open time-boxed windows for secondary trading. Every order is collected until the close, then one uniform price clears the window and settles all trades in a single transaction."
        stats={[
          { label: "Open and scheduled", value: String(live.length), hint: `${live.filter((w) => w.status === "OPEN").length} accepting orders` },
          { label: "Unlocked shares you can offer", value: fmtShares(sellable), hint: "In classes with a live window", accent: sellable > 0 ? "leaf" : undefined },
          { label: "Locked in your sell orders", value: fmtShares(inOrders), hint: "Released if unfilled" },
          {
            label: "Last clearing price",
            value: lastCleared?.result ? fmtUsd(lastCleared.result.clearingPrice) : "None",
            hint: lastCleared ? `${lastCleared.name}, ${fmtDay(lastCleared.result!.clearedAt)}` : undefined,
          },
        ]}
      />
      <PageBody className="space-y-6">
        {live.length === 0 ? (
          <Panel>
            <EmptyState title="No windows are open" body="When a company schedules a Liquidity Window for a class you can trade, it appears here." />
          </Panel>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              {live.map((w) => (
                <WindowCard key={w.id} w={w} active={selected?.id === w.id} onSelect={() => setSelectedId(w.id)} />
              ))}
            </div>
            {selected && <OrderForm key={selected.id} w={selected} />}
          </div>
        )}

        <Panel>
          <PanelHeader eyebrow="Your orders" title="Orders across windows" description="Sell orders lock your shares and buy orders lock USDG until the window clears. Anything unfilled is released at the close." />
          {myOrders.length === 0 ? (
            <p className="text-[13.5px] text-fog">You have not placed any orders.</p>
          ) : (
            <MyOrders rows={myOrders} />
          )}
        </Panel>

        <Panel>
          <PanelHeader eyebrow="History" title="Past windows" description="Each clearing price is published to the ValuationOracle as a Reference Valuation with source WINDOW_CLEARING." />
          {past.length === 0 ? (
            <p className="text-[13.5px] text-fog">No windows have closed yet.</p>
          ) : (
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>Window</Th>
                  <Th>Mode</Th>
                  <Th>Closed</Th>
                  <Th className="text-right">Clearing price</Th>
                  <Th className="text-right">Volume</Th>
                  <Th className="text-right">Notional</Th>
                </tr>
              </thead>
              <tbody>
                {past.map((w) => {
                  const company = byId(s.companies, w.companyId);
                  const cls = byId(s.classes, w.classId);
                  return (
                    <tr key={w.id}>
                      <Td>
                        <span className="block font-medium text-navy">{w.name}</span>
                        <span className="text-[12px] text-fog">
                          {company?.name} · {cls?.symbol}
                        </span>
                      </Td>
                      <Td>{w.mode === "AUCTION" ? "Auction" : "Tender"}</Td>
                      <Td>{fmtDay(w.result?.clearedAt ?? w.closesAt)}</Td>
                      <Td className="readout text-right text-navy">
                        {w.status === "CANCELLED" ? <Badge tone="muted">Cancelled</Badge> : w.result && w.result.volume > 0 ? fmtUsd(w.result.clearingPrice) : "No match"}
                      </Td>
                      <Td className="readout text-right">{fmtShares(w.result?.volume ?? 0)}</Td>
                      <Td className="readout text-right">{fmtUsd((w.result?.volume ?? 0) * (w.result?.clearingPrice ?? 0), 0)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      </PageBody>
    </>
  );
}

function WindowCard({ w, active, onSelect }: { w: LiquidityWindow; active: boolean; onSelect: () => void }) {
  const { s, now, viewer } = useSandbox();
  const company = byId(s.companies, w.companyId);
  const cls = byId(s.classes, w.classId);
  const ref = latestValuation(s, w.classId);
  const preview = previewClearing(w, ref?.price);
  const b = breakdown(s, w.classId, viewer.holderId, now);
  const open = w.status === "OPEN" && now >= w.opensAt && now < w.closesAt;
  const liveOrders = w.orders.filter((o) => !o.cancelled);
  const asks = liveOrders.filter((o) => o.side === "SELL").reduce((a, o) => a + o.quantity, 0);
  const bids = liveOrders.filter((o) => o.side === "BUY").reduce((a, o) => a + o.quantity, 0);

  return (
    <button type="button" onClick={onSelect} aria-pressed={active} className={cn("card card-hover block w-full p-5 text-left md:p-6", active && "card-accent")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark name={company?.name ?? "?"} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-tide">
              {company?.name} · {cls?.name}
            </p>
            <h3 className="truncate font-sans text-[17px] font-semibold tracking-[-0.02em] text-navy">{w.name}</h3>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={open ? "leaf" : "muted"}>{open ? "Open" : "Scheduled"}</Badge>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fog">{w.mode === "AUCTION" ? "Uniform-price auction" : "Fixed-price tender"}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill label={open ? "Closes" : "Opens"} value={fmtRelative(open ? w.closesAt : w.opensAt, now).replace(/^in /, "")} sub={fmtDay(open ? w.closesAt : w.opensAt)} />
        <StatPill label={w.mode === "TENDER" ? "Tender price" : "Indicative price"} value={w.mode === "TENDER" ? (w.tenderPrice ?? 0).toFixed(2) : preview ? preview.price.toFixed(2) : "None"} sub="USDG" />
        <StatPill label="Reference" value={ref ? ref.price.toFixed(2) : "None"} sub={ref ? VALUATION_SOURCE_LABEL[ref.source] : undefined} />
        <StatPill label="You can offer" value={fmtShares(Math.min(b.unlocked, w.perSellerCap))} sub={`${cls?.symbol} unlocked`} tone={b.unlocked > 0 ? "leaf" : undefined} />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-tide">
            Asks {fmtShares(asks)} · Bids {fmtShares(bids)}
          </span>
          <span className="readout text-fog">
            {fmtShares(preview?.volume ?? 0)} of {fmtShares(w.maxVolume)} max volume
          </span>
        </div>
        <Meter value={((preview?.volume ?? 0) / w.maxVolume) * 100} className="mt-2" />
      </div>
      {b.balance > 0 && b.unlocked < b.balance && (
        <p className="mt-3 text-[12px] text-fog">
          {fmtShares(b.balance - b.unlocked)} of your {fmtShares(b.balance)} {cls?.symbol} are locked and cannot be offered in this window.
        </p>
      )}
    </button>
  );
}

function OrderForm({ w }: { w: LiquidityWindow }) {
  const { s, now, viewer, placeOrder } = useSandbox();
  const cls = byId(s.classes, w.classId);
  const ref = latestValuation(s, w.classId);
  const tender = w.mode === "TENDER";
  const open = w.status === "OPEN" && now >= w.opensAt && now < w.closesAt;
  const [side, setSide] = useState<"SELL" | "BUY">("SELL");
  const [qtyText, setQtyText] = useState("");
  const [priceText, setPriceText] = useState(ref ? ref.price.toFixed(2) : "");

  const b = breakdown(s, w.classId, viewer.holderId, now);
  const already = w.orders.filter((o) => o.holderId === viewer.holderId && o.side === "SELL" && !o.cancelled).reduce((a, o) => a + o.quantity, 0);
  const capLeft = Math.max(0, w.perSellerCap - already);
  const maxSell = Math.min(b.unlocked, capLeft);

  const qty = Math.floor(Number(qtyText));
  const price = tender ? (w.tenderPrice ?? 0) : Number(priceText);
  const validQty = Number.isFinite(qty) && qty > 0;
  const validPrice = Number.isFinite(price) && price > 0;

  const missing = hasClaims(s, viewer.holderId, side === "SELL" ? w.sellerClaims : w.buyerClaims, now);
  const buyCheck = side === "BUY" && validQty ? canTransfer(s, w.classId, null, viewer.holderId, qty, now, "window") : null;

  let problem: { code: string; text: string } | null = null;
  if (missing.length) problem = { code: "Missing claim", text: `${side === "SELL" ? "Sellers" : "Buyers"} in this window need ${missing.map((t) => CLAIM_LABEL[t].toLowerCase()).join(" and ")}.` };
  else if (side === "SELL" && validQty && qty > b.unlocked) problem = { code: "INSUFFICIENT_UNLOCKED_BALANCE", text: `You can offer up to ${fmtShares(b.unlocked)} unlocked shares.` };
  else if (side === "SELL" && validQty && qty > capLeft) problem = { code: "Above the per-seller cap", text: `Each seller may offer up to ${fmtShares(w.perSellerCap)} shares in this window. You have ${fmtShares(capLeft)} left.` };
  else if (buyCheck && !buyCheck.ok) problem = { code: buyCheck.reason, text: "" };

  const hypothetical: WindowOrder | null = validQty && validPrice ? { id: "preview", holderId: viewer.holderId, side, quantity: qty, limitPrice: price, placedAt: now } : null;
  const current = previewClearing(w, ref?.price);
  const withMine = hypothetical && !problem ? previewClearing({ ...w, orders: [...w.orders, hypothetical] }, ref?.price) : null;
  const shown = withMine ?? current;
  const myFill = withMine?.fills.preview ?? 0;
  const vsRef = shown && ref ? ((shown.price - ref.price) / ref.price) * 100 : null;

  const canSubmit = open && validQty && validPrice && !problem;
  const submit = () => {
    if (!canSubmit) return;
    const r = placeOrder(w.id, viewer.holderId, side, qty, price);
    if (r.ok) setQtyText("");
  };

  return (
    <Panel className="h-fit lg:sticky lg:top-6">
      <PanelHeader eyebrow="Place an order" title={w.name} description={`${cls?.name} (${cls?.symbol}). ${open ? `Accepting orders until ${fmtDateTime(w.closesAt)}.` : `Opens ${fmtRelative(w.opensAt, now)}.`}`} />
      <div className="space-y-4">
        <Segmented
          label="Side"
          value={side}
          onChange={(v) => setSide(v)}
          options={tender ? [{ value: "SELL", label: "Sell (tender)" }] : [{ value: "SELL", label: "Sell" }, { value: "BUY", label: "Buy" }]}
        />
        {tender && <p className="text-[12.5px] text-tide">In a tender the company or its designee buys at a fixed price. Holders tender shares, and fills are pro-rata if more is tendered than the maximum.</p>}

        <Field
          label="Quantity"
          hint={side === "SELL" ? `${fmtShares(maxSell)} available: ${fmtShares(b.unlocked)} unlocked, ${fmtShares(capLeft)} left under the per-seller cap.` : `Your USDG locks at your limit until the window clears.`}
        >
          <Input inputMode="numeric" placeholder="0" value={qtyText} onChange={(e) => setQtyText(e.target.value.replace(/[^\d]/g, ""))} suffix={cls?.symbol} />
        </Field>
        {side === "SELL" && maxSell > 0 && (
          <div className="-mt-2 flex gap-1.5">
            {[0.25, 0.5, 1].map((f) => (
              <button key={f} type="button" onClick={() => setQtyText(String(Math.floor(maxSell * f)))} className="rounded-[8px] border border-line bg-haze px-2.5 py-1 font-mono text-[11px] text-tide hover:text-navy">
                {f === 1 ? "Max" : `${f * 100}%`}
              </button>
            ))}
          </div>
        )}

        {tender ? (
          <dl className="divide-y divide-line-soft border-y border-line-soft">
            <KV label="Tender price">
              <span className="readout">{fmtUsd(w.tenderPrice ?? 0)}</span>
            </KV>
          </dl>
        ) : (
          <Field label={side === "SELL" ? "Minimum price" : "Maximum price"} hint={ref ? `Reference Valuation ${fmtUsd(ref.price)}, ${VALUATION_SOURCE_LABEL[ref.source].toLowerCase()} on ${fmtDay(ref.asOf)}. Reserve ${fmtUsd(w.reservePrice)}.` : undefined}>
            <Input inputMode="decimal" placeholder="0.00" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.]/g, ""))} suffix="USDG" />
          </Field>
        )}

        <div className="surface p-4">
          <p className="caption">Indicative clearing</p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="readout font-display text-[26px] leading-none text-navy">{shown ? fmtUsd(shown.price) : "No match yet"}</span>
            {vsRef !== null && (
              <span className={cn("readout text-[12.5px]", vsRef >= 0 ? "text-leaf-deep" : "text-rose-deep")}>
                {vsRef >= 0 ? "+" : ""}
                {vsRef.toFixed(1)}% vs reference
              </span>
            )}
          </div>
          <dl className="mt-3 divide-y divide-line-soft">
            <KV label="Matched volume">
              <span className="readout">{fmtShares(shown?.volume ?? 0)}</span>
            </KV>
            <KV label="Your indicative fill">
              <span className="readout">{withMine ? `${fmtShares(myFill)} of ${fmtShares(qty)}` : "Enter an order"}</span>
            </KV>
            {withMine && myFill > 0 && (
              <KV label={side === "SELL" ? "You would receive" : "You would pay"}>
                <span className="readout">{fmtUsd(myFill * withMine.price)}</span>
              </KV>
            )}
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-fog">
            {tender
              ? "Every tendered share fills at the tender price. If more is tendered than the maximum volume, each seller fills the same fraction."
              : "Everyone trades at one price: the price that matches the most volume. You never sell below your minimum or buy above your maximum. Orders at the margin fill pro-rata. Indicative until the close."}
          </p>
        </div>

        {problem && <CheckLine ok={false} reason={problem.code} text={problem.text || undefined} />}
        {!open && <Notice tone="info">This window opens {fmtRelative(w.opensAt, now)}. You can place orders once it opens.</Notice>}

        <div className="space-y-2 border-t border-line-soft pt-4">
          <Button onClick={submit} disabled={!canSubmit} className="w-full">
            {side === "SELL" ? (tender ? "Tender shares" : "Place sell order") : "Place buy order"}
          </Button>
          <CallLine className="text-center">LiquidityWindow.placeOrder(windowId, side, quantity, limitPrice)</CallLine>
        </div>
        <p className="text-[12px] text-fog">
          Window trades are exempt from right of first refusal and transfer-window rules. See your{" "}
          <Link href="/portfolio" className="text-tide underline decoration-line underline-offset-4 hover:text-navy">
            holdings
          </Link>{" "}
          for unlock dates.
        </p>
      </div>
    </Panel>
  );
}

function MyOrders({ rows }: { rows: { w: LiquidityWindow; o: WindowOrder }[] }) {
  const { s, cancelOrder } = useSandbox();
  const previews = new Map<string, ReturnType<typeof previewClearing>>();
  for (const { w } of rows) if (!previews.has(w.id) && w.status === "OPEN") previews.set(w.id, previewClearing(w, latestValuation(s, w.classId)?.price));
  const sorted = [...rows].sort((a, b) => b.o.placedAt - a.o.placedAt);

  return (
    <Table minWidth={820}>
      <thead>
        <tr>
          <Th>Window</Th>
          <Th>Side</Th>
          <Th className="text-right">Quantity</Th>
          <Th className="text-right">Limit</Th>
          <Th>Placed</Th>
          <Th>Status</Th>
          <Th className="text-right">Action</Th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ w, o }) => {
          const cls = byId(s.classes, w.classId);
          const p = previews.get(w.id);
          const indicative = p?.fills[o.id] ?? 0;
          let status: React.ReactNode;
          if (o.cancelled) status = <Badge tone="muted">Cancelled</Badge>;
          else if (w.status === "CLEARED") status = (o.filled ?? 0) > 0 ? <Badge tone="leaf">Filled {fmtShares(o.filled ?? 0)}</Badge> : <Badge tone="muted">Unfilled</Badge>;
          else if (w.status === "CANCELLED") status = <Badge tone="muted">Window cancelled</Badge>;
          else status = (
            <span className="flex flex-col gap-1">
              <Badge tone="lagoon">Open</Badge>
              <span className="font-mono text-[11px] text-fog">Indicative fill {fmtShares(indicative)}</span>
            </span>
          );
          return (
            <tr key={o.id}>
              <Td>
                <span className="block font-medium text-navy">{w.name}</span>
                <span className="text-[12px] text-fog">{cls?.symbol}</span>
              </Td>
              <Td>
                <span className={o.side === "SELL" ? "text-rose-deep" : "text-leaf-deep"}>{o.side === "SELL" ? "Sell" : "Buy"}</span>
              </Td>
              <Td className="readout text-right text-navy">{fmtShares(o.quantity)}</Td>
              <Td className="readout text-right">{fmtUsd(o.limitPrice)}</Td>
              <Td>{fmtDateTime(o.placedAt)}</Td>
              <Td>{status}</Td>
              <Td className="text-right">
                {w.status === "OPEN" && !o.cancelled ? (
                  <Button variant="ghost" className="btn-sm" onClick={() => cancelOrder(w.id, o.id)}>
                    Cancel
                  </Button>
                ) : (
                  <span className="text-fog">None</span>
                )}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
