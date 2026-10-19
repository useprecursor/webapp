"use client";

import { useState } from "react";
import { Plus, Waves } from "lucide-react";
import { Badge, Button, Drawer, EmptyState, Field, Input, Notice, PageBody, PageHeader, Panel, PanelHeader, Segmented, Select, Table, Td, Th } from "@/components/app/ui";
import { CLAIM_LABEL, byId, fmtDateTime, fmtDay, fmtRelative, fmtShares, fmtUsd, latestValuation, moduleConfig, previewClearing, type ClearingPreview } from "@/lib/precursor/engine";
import type { ClaimTopic, LiquidityWindow, WindowOrder } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";
import { Call, Caption, Checks, Confirm, DAY, ErrorList, FormFooter, KV, Num, WINDOW_TONE, fromDateInput, num, toDateInput, useConsole } from "../_components/kit";

export default function Page() {
  const { s, company, classes, setRfq } = useConsole();
  const windows = s.windows.filter((w) => w.companyId === company.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const selected = byId(windows, selectedId ?? undefined) ?? windows.find((w) => w.status === "OPEN") ?? windows[0];

  const cleared = windows.filter((w) => w.status === "CLEARED" && w.result);
  const lastCleared = [...cleared].sort((a, b) => (b.result!.clearedAt ?? 0) - (a.result!.clearedAt ?? 0))[0];
  const volume = cleared.reduce((a, w) => a + (w.result?.volume ?? 0), 0);
  const notional = cleared.reduce((a, w) => a + (w.result ? w.result.volume * w.result.clearingPrice : 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Console"
        title="Liquidity"
        description="Scheduled Liquidity Windows give holders one uniform price at close. RFQ and permissioned pools add continuous routes. Every route runs canTransfer."
        action={
          <Button className="btn-sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Open a window
          </Button>
        }
        stats={[
          { label: "Open windows", value: String(windows.filter((w) => w.status === "OPEN").length), hint: `${windows.filter((w) => w.status === "SCHEDULED").length} scheduled`, accent: "lagoon" },
          { label: "Last clearing price", value: lastCleared ? fmtUsd(lastCleared.result!.clearingPrice) : "None", hint: lastCleared ? `${lastCleared.name}, ${fmtDay(lastCleared.result!.clearedAt)}` : "No window has cleared" },
          { label: "Volume cleared", value: fmtShares(volume), hint: `${fmtUsd(notional, 0)} notional` },
          { label: "RFQ enabled", value: `${classes.filter((c) => c.rfqEnabled).length} of ${classes.length}`, hint: "Share classes" },
        ]}
      />
      <PageBody className="space-y-5">
        <Panel>
          <PanelHeader eyebrow="LiquidityWindow" title="Windows" description="Auctions clear at the single price that matches the most volume. Tenders buy at a fixed price, pro rata if oversubscribed." />
          {windows.length === 0 ? (
            <EmptyState title="No windows yet" body="Open a window to let holders sell to eligible buyers at one clearing price." action={<Button className="btn-sm" onClick={() => setCreating(true)}>Open a window</Button>} />
          ) : (
            <Table minWidth={860}>
              <thead>
                <tr>
                  <Th>Window</Th>
                  <Th>Mode</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Reserve / tender</Th>
                  <Th className="text-right">Max volume</Th>
                  <Th className="text-right">Asks / bids</Th>
                  <Th className="text-right">Closes</Th>
                </tr>
              </thead>
              <tbody>
                {windows.map((w) => {
                  const live = w.orders.filter((o) => !o.cancelled);
                  const active = selected?.id === w.id;
                  return (
                    <tr key={w.id} onClick={() => setSelectedId(w.id)} className={cn("cursor-pointer", active && "[&>td]:bg-[rgb(255_255_255/0.03)]")}>
                      <Td>
                        <button type="button" className="text-left" onClick={() => setSelectedId(w.id)}>
                          <div className="font-medium text-navy">{w.name}</div>
                          <div className="font-mono text-[11px] text-fog">{byId(s.classes, w.classId)?.symbol}</div>
                        </button>
                      </Td>
                      <Td>
                        <span className="font-mono text-[11.5px] text-tide">{w.mode === "AUCTION" ? "Auction" : "Tender"}</span>
                      </Td>
                      <Td>
                        <Badge tone={WINDOW_TONE[w.status]}>{w.status}</Badge>
                      </Td>
                      <Td className="text-right">
                        <Num>{w.mode === "TENDER" ? fmtUsd(w.tenderPrice ?? 0) : w.reservePrice > 0 ? fmtUsd(w.reservePrice) : "None"}</Num>
                      </Td>
                      <Td className="text-right">
                        <Num>{fmtShares(w.maxVolume)}</Num>
                      </Td>
                      <Td className="text-right">
                        <Num>
                          {live.filter((o) => o.side === "SELL").length} <span className="text-fog">/</span> {live.filter((o) => o.side === "BUY").length}
                        </Num>
                      </Td>
                      <Td className="whitespace-nowrap text-right text-[12.5px]">{w.status === "CLEARED" && w.result ? fmtDay(w.result.clearedAt) : fmtDay(w.closesAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        {selected && <WindowDetail key={selected.id} w={selected} />}

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader eyebrow="RFQSettlement" title="RFQ by class" description="Holders settle EIP-712 signed quotes peer to peer. The fill checks canTransfer and swaps shares for USDG atomically." />
            <Table minWidth={460}>
              <thead>
                <tr>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Fills</Th>
                  <Th className="text-right">Last fill</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const fills = s.events.filter((e) => e.classId === c.id && e.name === "QuoteFilled").sort((a, b) => b.at - a.at);
                  return (
                    <tr key={c.id}>
                      <Td>
                        <div className="text-navy">{c.name}</div>
                        <div className="font-mono text-[11px] text-fog">{c.symbol}</div>
                      </Td>
                      <Td>{c.rfqEnabled ? <Badge tone="leaf">Enabled</Badge> : <Badge>Off</Badge>}</Td>
                      <Td className="text-right">
                        <Num>{fills.length}</Num>
                      </Td>
                      <Td className="text-right text-[12.5px]">{fills[0] ? fmtDay(fills[0].at) : "None"}</Td>
                      <Td className="text-right">
                        <Button variant="ghost" className="btn-sm" onClick={() => setRfq(c.id, !c.rfqEnabled)}>
                          {c.rfqEnabled ? "Disable" : "Enable"}
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Call className="mt-4">RFQSettlement.fill(quote, signature, quantity)</Call>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="PoolGate" title="Permissioned pools" description="An approved AMM pool receives a VENUE claim. The PoolGate hook runs canTransfer for the counterparty on every swap and liquidity change, and LP positions stay with eligible holders." />
            <EmptyState
              title="No pools registered"
              body="Registering a pool gives eligible holders continuous liquidity under the same rules as every other transfer."
              action={
                <div className="flex flex-col items-center gap-2">
                  <Button variant="secondary" className="btn-sm" disabled>
                    <Waves className="size-4" aria-hidden="true" />
                    Register a pool
                  </Button>
                  <Call>PoolGate.registerPool(pool)</Call>
                </div>
              }
            />
          </Panel>
        </div>
      </PageBody>

      <Drawer open={creating} onClose={() => setCreating(false)} title="Open a Liquidity Window">
        {classes.length > 0 && <NewWindow onDone={() => setCreating(false)} />}
      </Drawer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* One window                                                          */
/* ------------------------------------------------------------------ */

function WindowDetail({ w }: { w: LiquidityWindow }) {
  const { s, now, clearWindow, cancelWindow } = useConsole();
  const cls = byId(s.classes, w.classId);
  const ref = latestValuation(s, w.classId);
  const preview = w.status === "OPEN" || w.status === "SCHEDULED" ? previewClearing(w, ref?.price) : null;
  const final = w.status === "CLEARED" || w.status === "CANCELLED";
  const rofr = cls ? moduleConfig(cls, "ROFR") : undefined;
  const sells = w.orders.filter((o) => o.side === "SELL").sort((a, b) => a.limitPrice - b.limitPrice || a.placedAt - b.placedAt);
  const buys = w.orders.filter((o) => o.side === "BUY").sort((a, b) => b.limitPrice - a.limitPrice || a.placedAt - b.placedAt);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel>
        <PanelHeader eyebrow={`${cls?.symbol} · ${w.mode === "AUCTION" ? "Batch auction" : "Fixed-price tender"}`} title={w.name} action={<Badge tone={WINDOW_TONE[w.status]}>{w.status}</Badge>} />
        <KV
          rows={[
            { label: "Opens", value: fmtDateTime(w.opensAt) },
            { label: "Closes", value: `${fmtDateTime(w.closesAt)} (${fmtRelative(w.closesAt, now)})` },
            w.mode === "TENDER" ? { label: "Tender price", value: fmtUsd(w.tenderPrice ?? 0), mono: true } : { label: "Reserve price", value: w.reservePrice > 0 ? fmtUsd(w.reservePrice) : "None", mono: true },
            { label: "Maximum volume", value: fmtShares(w.maxVolume), mono: true },
            { label: "Per-seller cap", value: fmtShares(w.perSellerCap), mono: true },
            { label: "Sellers need", value: w.sellerClaims.map((c) => CLAIM_LABEL[c]).join(", ") || "Any holder" },
            { label: "Buyers need", value: w.buyerClaims.map((c) => CLAIM_LABEL[c]).join(", ") || "Any verified holder" },
            { label: "Reference Valuation", value: ref ? fmtUsd(ref.price) : "None", mono: true },
          ]}
        />

        {rofr && (
          <div className="mt-5">
            <Notice tone="info">
              ROFR is enabled on {cls?.symbol}. {rofr.holder} holds a priority bid at the clearing price for {rofr.noticeDays} days before clear. Settlement inside the window is exempt from ROFR_PENDING.
            </Notice>
          </div>
        )}

        {!final && (
          <div className="mt-6 space-y-3 border-t border-line-soft pt-5">
            <Confirm
              variant="primary"
              label="Clear window"
              confirmLabel={preview ? `Clear at ${fmtUsd(preview.price)}` : "Close with no match"}
              message={
                preview ? (
                  <>
                    Settles {fmtShares(preview.volume)} {cls?.symbol} at {fmtUsd(preview.price)} between {preview.sellers} sellers and {preview.buyers} {w.mode === "TENDER" ? "buyer" : "buyers"} in one transaction, unlocks every unfilled order, and publishes the price as a Reference Valuation.
                    {now < w.closesAt && ` The window is scheduled to close ${fmtRelative(w.closesAt, now)}; clearing now settles the book as it stands.`}
                  </>
                ) : (
                  "Bids and asks do not cross. Clearing closes the window with no fills and unlocks every order."
                )
              }
              onConfirm={() => clearWindow(w.id)}
            />
            <Call>LiquidityWindow.clear(windowId)</Call>
            <Confirm variant="danger" label="Cancel window" confirmLabel="Cancel and unlock" message="No orders fill. Every locked share and every escrowed bid returns to its owner." onConfirm={() => cancelWindow(w.id)} />
            <Call>LiquidityWindow.cancelWindow(windowId)</Call>
          </div>
        )}
      </Panel>

      <Panel className="lg:col-span-2">
        <PanelHeader
          eyebrow={final ? "Result" : "Indicative clearing"}
          title={
            w.status === "CLEARED" && w.result
              ? w.result.volume > 0
                ? `Cleared at ${fmtUsd(w.result.clearingPrice)}`
                : "Closed with no match"
              : w.status === "CANCELLED"
                ? "Cancelled"
                : preview
                  ? `${fmtUsd(preview.price)} for ${fmtShares(preview.volume)} shares`
                  : "No crossing orders yet"
          }
          description={
            final
              ? undefined
              : w.mode === "TENDER"
                ? "Sellers tender at the fixed price. If tenders exceed the maximum volume, each fills pro rata."
                : "The price that matches the most volume, ties broken toward the Reference Valuation, held at or above the reserve. Fills by price priority, pro rata at the margin."
          }
        />

        {w.status === "CLEARED" && w.result && (
          <div className="frame mb-5 grid grid-cols-3 gap-px">
            {[
              ["Clearing price", fmtUsd(w.result.clearingPrice)],
              ["Volume", fmtShares(w.result.volume)],
              ["Notional", fmtUsd(w.result.volume * w.result.clearingPrice, 0)],
            ].map(([l, v]) => (
              <div key={l} className="frame-cell px-4 py-3">
                <div className="text-[11.5px] text-fog">{l}</div>
                <div className="readout mt-1 font-mono text-[14px] text-navy">{v}</div>
              </div>
            ))}
          </div>
        )}

        {preview && (
          <div className="frame mb-5 grid grid-cols-2 gap-px sm:grid-cols-4">
            {[
              ["Price", fmtUsd(preview.price)],
              ["Volume", fmtShares(preview.volume)],
              ["Sellers filled", String(preview.sellers)],
              ["Buyers filled", w.mode === "TENDER" ? "Company" : String(preview.buyers)],
            ].map(([l, v]) => (
              <div key={l} className="frame-cell px-4 py-3">
                <div className="text-[11.5px] text-fog">{l}</div>
                <div className="readout mt-1 font-mono text-[14px] text-navy">{v}</div>
              </div>
            ))}
          </div>
        )}

        {w.mode === "AUCTION" && !final && <Depth w={w} preview={preview} />}

        {w.orders.length === 0 ? (
          <EmptyState title={final ? "Order book archived" : "No orders yet"} body={final ? "Orders for this window settled at clear. Fills are on the cap table." : "Eligible holders place orders from Portfolio. Sell orders lock shares; bids lock USDG."} />
        ) : (
          <div className={cn("grid gap-5", w.mode === "AUCTION" && "xl:grid-cols-2")}>
            <Book title="Asks, lowest first" side="SELL" orders={sells} preview={preview} />
            {w.mode === "AUCTION" && <Book title="Bids, highest first" side="BUY" orders={buys} preview={preview} />}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Book({ title, side, orders, preview }: { title: string; side: "SELL" | "BUY"; orders: WindowOrder[]; preview: ClearingPreview | null }) {
  const { s } = useConsole();
  return (
    <div className="min-w-0">
      <Caption>{title}</Caption>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-fog">No {side === "SELL" ? "asks" : "bids"}.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="ledger w-full min-w-[380px] text-left text-[12.5px]">
            <thead>
              <tr className="text-fog">
                <th className="px-3 py-2.5 font-medium">Holder</th>
                <th className="py-2.5 pr-3 text-right font-medium">Qty</th>
                <th className="py-2.5 pr-3 text-right font-medium">{side === "SELL" ? "Min" : "Max"}</th>
                <th className="py-2.5 pr-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const fill = o.filled ?? preview?.fills[o.id] ?? 0;
                const settled = o.filled !== undefined;
                return (
                  <tr key={o.id} className={cn(o.cancelled && "opacity-50")}>
                    <td className="px-3 py-2.5">
                      <span className="block truncate text-navy">{byId(s.holders, o.holderId)?.name ?? o.holderId}</span>
                    </td>
                    <td className="readout py-2.5 pr-3 text-right font-mono text-navy">{fmtShares(o.quantity)}</td>
                    <td className={cn("readout py-2.5 pr-3 text-right font-mono", side === "SELL" ? "text-rose-deep" : "text-leaf-deep")}>{fmtUsd(o.limitPrice)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-[11px]">
                      {o.cancelled ? (
                        <span className="text-fog">Cancelled</span>
                      ) : fill > 0 ? (
                        <span className={settled ? "text-leaf-deep" : "text-navy"}>
                          {settled ? "Filled" : "Fills"} {fill === o.quantity ? "all" : fmtShares(fill)}
                        </span>
                      ) : (
                        <span className="text-fog">{settled ? "Unfilled" : "Out"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Cumulative demand and supply at each price level, with the clearing level marked. */
function Depth({ w, preview }: { w: LiquidityWindow; preview: ClearingPreview | null }) {
  const live = w.orders.filter((o) => !o.cancelled);
  const levels = [...new Set(live.map((o) => o.limitPrice))].sort((a, b) => b - a);
  if (levels.length === 0) return null;
  const rows = levels.map((p) => ({
    p,
    demand: live.filter((o) => o.side === "BUY" && o.limitPrice >= p).reduce((a, o) => a + o.quantity, 0),
    supply: live.filter((o) => o.side === "SELL" && o.limitPrice <= p).reduce((a, o) => a + o.quantity, 0),
  }));
  const max = Math.max(1, ...rows.map((r) => Math.max(r.demand, r.supply)));

  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <Caption className="mb-0">Depth by price</Caption>
        <span className="flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fog">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-leaf/80" aria-hidden="true" />
            Demand at or above
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-rose/80" aria-hidden="true" />
            Supply at or below
          </span>
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const clearing = preview?.price === r.p;
          const matched = Math.min(r.demand, r.supply, w.maxVolume);
          return (
            <div key={r.p} className={cn("grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-1.5", clearing && "bg-lagoon-faint ring-1 ring-lagoon-line")}>
              <div className="flex items-center justify-end gap-2">
                <span className="readout font-mono text-[11px] text-fog">{r.demand ? fmtShares(r.demand) : ""}</span>
                <div className="flex h-3 w-full max-w-[240px] justify-end overflow-hidden rounded-[3px] bg-haze">
                  <div className="h-full bg-leaf/70" style={{ width: `${(r.demand / max) * 100}%` }} />
                </div>
              </div>
              <div className="text-center">
                <div className={cn("readout font-mono text-[12px]", clearing ? "text-navy" : "text-tide")}>{r.p.toFixed(2)}</div>
                {clearing ? <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-lagoon">clears</div> : r.p < w.reservePrice ? <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-fog">below reserve</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-full max-w-[240px] overflow-hidden rounded-[3px] bg-haze">
                  <div className="h-full bg-rose/70" style={{ width: `${(r.supply / max) * 100}%` }} />
                </div>
                <span className="readout font-mono text-[11px] text-fog">{r.supply ? fmtShares(r.supply) : ""}</span>
              </div>
              <span className="sr-only">
                At {fmtUsd(r.p)}, demand {fmtShares(r.demand)}, supply {fmtShares(r.supply)}, matched {fmtShares(matched)}.
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-fog">Prices in USDG. Matched volume at each level is the smaller of the two bars, capped at {fmtShares(w.maxVolume)}.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New window                                                          */
/* ------------------------------------------------------------------ */

const SELLER_OPTIONS: { value: ClaimTopic; label: string; hint: string }[] = [
  { value: "IDENTITY_VERIFIED", label: CLAIM_LABEL.IDENTITY_VERIFIED, hint: "IDENTITY_VERIFIED" },
  { value: "EMPLOYEE_OF", label: "Employees only", hint: "EMPLOYEE_OF" },
  { value: "INVESTOR_ELIGIBLE", label: CLAIM_LABEL.INVESTOR_ELIGIBLE, hint: "INVESTOR_ELIGIBLE" },
];
const BUYER_OPTIONS: { value: ClaimTopic; label: string; hint: string }[] = [
  { value: "IDENTITY_VERIFIED", label: CLAIM_LABEL.IDENTITY_VERIFIED, hint: "IDENTITY_VERIFIED" },
  { value: "INVESTOR_ELIGIBLE", label: CLAIM_LABEL.INVESTOR_ELIGIBLE, hint: "INVESTOR_ELIGIBLE" },
];

function NewWindow({ onDone }: { onDone: () => void }) {
  const { s, now, company, classes, openWindow } = useConsole();
  const [classId, setClassId] = useState(classes[0].id);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"AUCTION" | "TENDER">("AUCTION");
  const [opens, setOpens] = useState(toDateInput(now));
  const [closes, setCloses] = useState(toDateInput(now + 7 * DAY));
  const ref = latestValuation(s, classId);
  const [price, setPrice] = useState(ref ? String(Math.floor(ref.price * 0.8 * 100) / 100) : "");
  const [maxVolume, setMaxVolume] = useState("250000");
  const [perSeller, setPerSeller] = useState("25000");
  const [sellerClaims, setSellerClaims] = useState<ClaimTopic[]>(["IDENTITY_VERIFIED"]);
  const [buyerClaims, setBuyerClaims] = useState<ClaimTopic[]>(["IDENTITY_VERIFIED", "INVESTOR_ELIGIBLE"]);
  const cls = byId(classes, classId)!;

  const p = num(price);
  const mv = num(maxVolume);
  const ps = num(perSeller);
  const opensAt = fromDateInput(opens, now, "start");
  const closesAt = fromDateInput(closes, now, "end");

  const errors: string[] = [];
  if (!name.trim()) errors.push("Name the window.");
  if (mode === "TENDER" && !(p > 0)) errors.push("Set a tender price above zero.");
  if (mode === "AUCTION" && !(p >= 0)) errors.push("Set a reserve price, or 0 for none.");
  if (!(mv > 0 && Number.isInteger(mv))) errors.push("Set a maximum volume in whole shares.");
  if (!(ps > 0 && Number.isInteger(ps))) errors.push("Set a per-seller cap in whole shares.");
  if (ps > mv) errors.push("The per-seller cap cannot exceed the maximum volume.");
  if (!(closesAt > opensAt)) errors.push("The close must follow the open.");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        const r = openWindow({
          companyId: company.id,
          classId,
          name: name.trim(),
          mode,
          opensAt,
          closesAt,
          reservePrice: mode === "AUCTION" ? p : 0,
          tenderPrice: mode === "TENDER" ? p : undefined,
          maxVolume: mv,
          perSellerCap: ps,
          sellerClaims,
          buyerClaims,
        });
        if (r.ok) onDone();
      }}
    >
      <p className="mb-5 text-[13.5px] leading-relaxed text-tide">Sellers lock shares and buyers lock USDG while the window is open. At close, one transaction settles every match.</p>
      <div className="space-y-4">
        <Field label="Share class">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Liquidity Window" />
        </Field>
        <Field label="Mode">
          <Segmented
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "AUCTION", label: "Batch auction" },
              { value: "TENDER", label: "Fixed-price tender" },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens" hint="Today opens immediately.">
            <Input type="date" value={opens} onChange={(e) => setOpens(e.target.value)} />
          </Field>
          <Field label="Closes" hint="End of day, local time.">
            <Input type="date" value={closes} onChange={(e) => setCloses(e.target.value)} />
          </Field>
        </div>
        <Field label={mode === "AUCTION" ? "Reserve price" : "Tender price"} hint={ref ? `Reference Valuation for ${cls.symbol}: ${fmtUsd(ref.price)}.` : `No Reference Valuation for ${cls.symbol} yet.`}>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" suffix="USDG" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Maximum volume">
            <Input value={maxVolume} onChange={(e) => setMaxVolume(e.target.value)} inputMode="numeric" suffix="shares" />
          </Field>
          <Field label="Per-seller cap">
            <Input value={perSeller} onChange={(e) => setPerSeller(e.target.value)} inputMode="numeric" suffix="shares" />
          </Field>
        </div>
        <Field label="Sellers need">
          <Checks<ClaimTopic> value={sellerClaims} onChange={setSellerClaims} options={SELLER_OPTIONS} />
        </Field>
        {mode === "AUCTION" ? (
          <Field label="Buyers need">
            <Checks<ClaimTopic> value={buyerClaims} onChange={setBuyerClaims} options={BUYER_OPTIONS} />
          </Field>
        ) : (
          <p className="text-[12.5px] text-fog">In a tender the company or its designee is the buyer. Tendered shares settle to the treasury.</p>
        )}
      </div>
      {moduleConfig(cls, "ROFR") && (
        <div className="mt-5">
          <Notice tone="info">{cls.symbol} has ROFR enabled. The company holds a priority bid at the clearing price before the window clears.</Notice>
        </div>
      )}
      <ErrorList errors={name ? errors : []} />
      <FormFooter call="LiquidityWindow.openWindow(params)">
        <Button type="submit" disabled={errors.length > 0}>
          {opensAt <= now ? "Open window" : "Schedule window"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}
