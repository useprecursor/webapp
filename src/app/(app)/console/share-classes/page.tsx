"use client";

import { useState } from "react";
import { Pause, Pencil, Play, Plus } from "lucide-react";
import { Address, Badge, Button, Drawer, Field, Input, Meter, Notice, PageBody, PageHeader, Panel, PanelHeader, Segmented, Switch, Table, Td, Th } from "@/components/app/ui";
import { MODULE_META, byId, fmtDay, fmtPct, fmtRelative, fmtShares, holdersOf, totalSupply, plural } from "@/lib/precursor/engine";
import type { ModuleConfig, ModuleId, RuleModule, ShareClass } from "@/lib/precursor/types";
import { cn } from "@/lib/utils";
import { CreateShareClassForm } from "@/components/app/Onboarding";
import { Call, Caption, Confirm, ErrorList, FormFooter, Num, num, useConsole } from "../_components/kit";

const MODULE_ORDER: ModuleId[] = ["REGION", "ELIGIBILITY", "HOLDING_PERIOD", "HOLDER_CAP", "TRANSFER_WINDOW", "ROFR", "MAX_OWNERSHIP", "EMPLOYEE_VESTING"];

function defaultConfig(id: ModuleId, companyName: string): ModuleConfig {
  switch (id) {
    case "REGION":
      return { id, mode: "allow", regions: ["US"] };
    case "ELIGIBILITY":
      return { id, minimumTier: 1, exemptEmployees: true };
    case "HOLDING_PERIOD":
      return { id, days: 365 };
    case "HOLDER_CAP":
      return { id, maxHolders: 2000 };
    case "TRANSFER_WINDOW":
      return { id, allowDuringLiquidityWindows: true, windows: [] };
    case "ROFR":
      return { id, holder: companyName, noticeDays: 30 };
    case "MAX_OWNERSHIP":
      return { id, maxBps: 2500 };
    case "EMPLOYEE_VESTING":
      return { id, accelerationEnabled: false };
  }
}

/** A module's configuration, as one plain sentence. */
function describe(c: ModuleConfig): string {
  switch (c.id) {
    case "REGION":
      return c.mode === "allow"
        ? `Recipients must be in one of ${c.regions.length} regions: ${c.regions.join(", ")}.`
        : `Recipients in ${c.regions.join(", ")} are blocked. Every other region is allowed.`;
    case "ELIGIBILITY":
      return `Recipients need eligibility tier ${c.minimumTier} or higher${c.exemptEmployees ? ". Employees of the company are exempt." : ", employees included."}`;
    case "HOLDING_PERIOD":
      return `Each lot is locked for ${c.days} days after it is acquired.`;
    case "HOLDER_CAP":
      return `No more than ${fmtShares(c.maxHolders)} distinct holders.`;
    case "TRANSFER_WINDOW":
      return `Transfers run only inside ${c.windows.length} scheduled ${c.windows.length === 1 ? "window" : "windows"}${c.allowDuringLiquidityWindows ? ", plus Liquidity Windows" : ""}.`;
    case "ROFR":
      return `${c.holder} has first refusal on direct transfers, with ${c.noticeDays} days' notice. Liquidity Windows and RFQ are exempt.`;
    case "MAX_OWNERSHIP":
      return `No single holder may own more than ${fmtPct(c.maxBps / 100)} of the class.`;
    case "EMPLOYEE_VESTING":
      return `Unvested employee shares are locked until they vest${c.accelerationEnabled ? ". Acceleration is allowed." : "."}`;
  }
}

const TIMELOCK = [
  { action: "Recovery", delay: "72 hours", bound: "Minimum 48 hours", call: "PrecursorShareToken.recover" },
  { action: "Multiplier change", delay: "48 hours", bound: "Scheduled ahead", call: "PrecursorShareToken.scheduleMultiplier" },
  { action: "Module add, remove or configure", delay: "24 hours", bound: "Issuer-configurable", call: "RuleEngine.configureModule" },
  { action: "Token upgrade", delay: "7 days", bound: "UUPS, timelock gated", call: "UUPSUpgradeable.upgradeToAndCall" },
  { action: "Pause and unpause", delay: "Immediate", bound: "No delay", call: "PrecursorShareToken.pause" },
];

const CONTRACT_PURPOSE: Record<string, string> = {
  IdentityRegistry: "Wallet to identity, verified through claims",
  TrustedVerifiers: "Which verifiers may sign which claim topics",
  IssuerTimelock: "Delays sensitive changes; signers include the issuer",
  OfferingVault: "Primary offerings with escrowed USDG",
  LiquidityWindow: "Batch auctions and fixed-price tenders",
  RFQSettlement: "Signed quotes settled delivery versus payment",
  DistributionVault: "Record-date payouts, claimed by holders",
  Governance: "Snapshot, token-weighted votes",
  DisclosureRegistry: "Anchored document hashes",
};

export default function Page() {
  const { s, company, classes } = useConsole();
  const [editing, setEditing] = useState<{ classId: string; id: ModuleId } | null>(null);
  const editCls = editing ? byId(classes, editing.classId) : undefined;
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Console"
        title="Share classes and rules"
        description="Each class is one Precursor Share Token with its own RuleEngine. Modules run in order on every transfer and the first that fails returns its reason code."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New share class
          </Button>
        }
        stats={[
          { label: "Share classes", value: String(classes.length), hint: classes.map((c) => c.symbol).join(", ") },
          { label: "Modules enabled", value: String(classes.reduce((a, c) => a + c.modules.filter((m) => m.enabled).length, 0)), hint: "Across every class", accent: "lagoon" },
          { label: "RFQ enabled", value: `${classes.filter((c) => c.rfqEnabled).length} of ${classes.length}`, hint: "Signed quotes between eligible holders" },
          { label: "Paused", value: String(classes.filter((c) => c.paused).length), hint: "Pause takes effect immediately", accent: classes.some((c) => c.paused) ? "rose" : undefined },
        ]}
      />
      <PageBody className="space-y-5">
        {classes.map((c) => (
          <ClassPanel key={c.id} cls={c} onEdit={(id) => setEditing({ classId: c.id, id })} />
        ))}

        <div className="grid gap-5 lg:grid-cols-5">
          <Panel className="lg:col-span-3">
            <PanelHeader eyebrow="Contracts" title={`${company.name} contract set`} description={`Deployed together by PrecursorFactory on ${s.network.name}. Each address is public in the Explorer.`} />
            <Table minWidth={560}>
              <thead>
                <tr>
                  <Th>Contract</Th>
                  <Th>Purpose</Th>
                  <Th>Address</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(company.contracts).map(([name, address]) => (
                  <tr key={name}>
                    <Td>
                      <span className="font-mono text-[12.5px] text-navy">{name}</span>
                    </Td>
                    <Td className="text-[12.5px]">{CONTRACT_PURPOSE[name] ?? ""}</Td>
                    <Td>
                      <Address address={address} size={18} />
                    </Td>
                  </tr>
                ))}
                {classes.flatMap((c) => [
                  <tr key={`${c.id}-token`}>
                    <Td>
                      <span className="font-mono text-[12.5px] text-navy">PrecursorShareToken</span>
                    </Td>
                    <Td className="text-[12.5px]">{c.symbol}, UUPS proxy</Td>
                    <Td>
                      <Address address={c.token} size={18} />
                    </Td>
                  </tr>,
                  <tr key={`${c.id}-engine`}>
                    <Td>
                      <span className="font-mono text-[12.5px] text-navy">RuleEngine</span>
                    </Td>
                    <Td className="text-[12.5px]">{c.symbol} modules</Td>
                    <Td>
                      <Address address={c.ruleEngine} size={18} />
                    </Td>
                  </tr>,
                ])}
                <tr>
                  <Td>
                    <span className="font-mono text-[12.5px] text-navy">Treasury</span>
                  </Td>
                  <Td className="text-[12.5px]">Receives offering proceeds</Td>
                  <Td>
                    <Address address={company.treasury} size={18} />
                  </Td>
                </tr>
              </tbody>
            </Table>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader eyebrow="IssuerTimelock" title="Timelock defaults" description="Sensitive changes wait out a delay, so holders see them coming. Delays are issuer-configurable within bounds." />
            <Table minWidth={360}>
              <thead>
                <tr>
                  <Th>Action</Th>
                  <Th className="text-right">Delay</Th>
                </tr>
              </thead>
              <tbody>
                {TIMELOCK.map((t) => (
                  <tr key={t.action}>
                    <Td>
                      <div className="text-[13px] text-navy">{t.action}</div>
                      <div className="font-mono text-[11px] text-fog">{t.call}</div>
                    </Td>
                    <Td className="text-right">
                      <div className={cn("readout font-mono text-[12.5px]", t.delay === "Immediate" ? "text-amber-deep" : "text-navy")}>{t.delay}</div>
                      <div className="text-[11px] text-fog">{t.bound}</div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        </div>
      </PageBody>

      <Drawer open={adding} onClose={() => setAdding(false)} title={`New share class · ${company.name}`}>
        <CreateShareClassForm companyId={company.id} onDone={() => setAdding(false)} />
      </Drawer>
      <Drawer open={!!editing && !!editCls} onClose={() => setEditing(null)} title={editing && editCls ? `${MODULE_META[editing.id].name} · ${editCls.symbol}` : "Module"}>
        {editing && editCls && <ModuleForm key={`${editing.classId}-${editing.id}`} cls={editCls} id={editing.id} onDone={() => setEditing(null)} />}
      </Drawer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* One class                                                           */
/* ------------------------------------------------------------------ */

function ClassPanel({ cls, onEdit }: { cls: ShareClass; onEdit: (id: ModuleId) => void }) {
  const { s, now, company, setModule, setPaused, setRfq } = useConsole();
  const supply = totalSupply(s, cls.id);
  const installed = new Map<ModuleId, RuleModule>(cls.modules.map((m) => [m.config.id, m]));

  return (
    <Panel className={cn(cls.paused && "border-rose/30")}>
      <PanelHeader
        eyebrow={cls.symbol}
        title={cls.name}
        description={`${plural(holdersOf(s, cls.id).length, "holder")}. ERC-20 with 18 decimals, ERC-3643-compatible transfers, ERC-8056 multiplier.`}
        action={cls.paused ? <Badge tone="rose">Paused</Badge> : <Badge tone="leaf">Transfers live</Badge>}
      />

      <div className="frame grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
        <div className="frame-cell px-4 py-3.5">
          <Caption className="mb-1.5">Token</Caption>
          <Address address={cls.token} size={18} />
        </div>
        <div className="frame-cell px-4 py-3.5">
          <Caption className="mb-1.5">Rule engine</Caption>
          <Address address={cls.ruleEngine} size={18} />
        </div>
        <div className="frame-cell px-4 py-3.5">
          <Caption className="mb-1.5">Issued of authorized</Caption>
          <Num>
            {fmtShares(supply)} <span className="text-fog">/ {fmtShares(cls.authorized)}</span>
          </Num>
          <Meter value={(supply / cls.authorized) * 100} className="mt-2 h-1.5" />
        </div>
        <div className="frame-cell px-4 py-3.5">
          <Caption className="mb-1.5">uiMultiplier</Caption>
          <Num>{cls.multiplier.toFixed(4)}x</Num>
          <div className="mt-1 font-mono text-[11px] text-fog">
            {cls.pendingMultiplier ? `${cls.pendingMultiplier.value}x ${fmtRelative(cls.pendingMultiplier.effectiveAt, now)}` : "1 token = 1 share"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line px-4 py-3">
          <Switch
            checked={cls.rfqEnabled}
            onChange={(v) => setRfq(cls.id, v)}
            label="RFQ settlement"
            hint="Eligible holders settle EIP-712 signed quotes against USDG, atomically. Every fill runs canTransfer."
          />
          <Call className="mt-1 px-1">RFQSettlement.setEnabled(shareToken, enabled)</Call>
        </div>
        <div className="rounded-2xl border border-line px-4 py-3">
          <div className="flex items-start justify-between gap-4 px-1 py-2">
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-navy">{cls.paused ? "Transfers are paused" : "Pause transfers"}</div>
              <p className="mt-0.5 text-[12px] leading-snug text-fog">
                {cls.paused
                  ? "Every transfer, mint and settlement returns TOKEN_PAUSED. Unpausing is also immediate."
                  : "Pause has no timelock. It takes effect in the next block and stops every transfer until you unpause."}
              </p>
            </div>
            <div className="shrink-0">
              {cls.paused ? (
                <Button variant="secondary" className="btn-sm" onClick={() => setPaused(cls.id, false)}>
                  <Play className="size-3.5" aria-hidden="true" />
                  Unpause
                </Button>
              ) : null}
            </div>
          </div>
          {!cls.paused && (
            <div className="px-1 pb-1">
              <Confirm
                variant="danger"
                label="Pause"
                confirmLabel={`Pause ${cls.symbol} now`}
                icon={<Pause className="size-3.5" aria-hidden="true" />}
                message={`Every transfer of ${cls.symbol} will return TOKEN_PAUSED from the next block, including Liquidity Window settlement and RFQ fills. Valuations cannot be published while paused.`}
                onConfirm={() => setPaused(cls.id, true)}
              />
            </div>
          )}
          <Call className="mt-1 px-1">{cls.paused ? "PrecursorShareToken.unpause()" : "PrecursorShareToken.pause(reason)"}</Call>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <Caption className="mb-0">Rule modules, in execution order</Caption>
          <span className="text-[12px] text-fog">Module changes execute through the IssuerTimelock after a 24 hour delay.</span>
        </div>
        <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line">
          {MODULE_ORDER.map((id) => {
            const m = installed.get(id);
            const meta = MODULE_META[id];
            const enabled = !!m?.enabled;
            const config = m?.config ?? defaultConfig(id, company.name);
            return (
              <li key={id} className={cn("grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center", !enabled && "bg-canvas/40")}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={cn("text-[14px] font-medium", enabled ? "text-navy" : "text-tide")}>{meta.name}</span>
                    <span className="font-mono text-[11px] text-fog">{meta.contract}</span>
                    {m?.pendingUntil && m.pendingUntil > now && <Badge tone="amber">Executes {fmtDay(m.pendingUntil)}</Badge>}
                  </div>
                  <p className={cn("mt-1 text-[13px] leading-relaxed", enabled ? "text-tide" : "text-fog")}>{enabled ? describe(config) : m ? `Disabled. ${meta.summary}` : `Not installed. ${meta.summary}`}</p>
                  <p className="mt-1 font-mono text-[11px] text-fog">Returns {meta.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="btn-sm" onClick={() => onEdit(id)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${enabled ? "Disable" : "Enable"} ${meta.name}`}
                    onClick={() => setModule(cls.id, config, !enabled)}
                    className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", enabled ? "bg-lagoon" : "bg-haze-2")}
                  >
                    <span className={cn("absolute top-0.5 size-5 rounded-full shadow-sm transition-all", enabled ? "left-[18px] bg-canvas" : "left-0.5 bg-tide")} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Module editor                                                       */
/* ------------------------------------------------------------------ */

function ModuleForm({ cls, id, onDone }: { cls: ShareClass; id: ModuleId; onDone: () => void }) {
  const { company, setModule } = useConsole();
  const existing = cls.modules.find((m) => m.config.id === id);
  const start = existing?.config ?? defaultConfig(id, company.name);
  const meta = MODULE_META[id];

  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [mode, setMode] = useState<"allow" | "block">(start.id === "REGION" ? start.mode : "allow");
  const [regions, setRegions] = useState(start.id === "REGION" ? start.regions.join(", ") : "");
  const [tier, setTier] = useState(start.id === "ELIGIBILITY" ? start.minimumTier : 1);
  const [exempt, setExempt] = useState(start.id === "ELIGIBILITY" ? start.exemptEmployees : true);
  const [days, setDays] = useState(String(start.id === "HOLDING_PERIOD" ? start.days : 365));
  const [maxHolders, setMaxHolders] = useState(String(start.id === "HOLDER_CAP" ? start.maxHolders : 2000));
  const [duringWindows, setDuringWindows] = useState(start.id === "TRANSFER_WINDOW" ? start.allowDuringLiquidityWindows : true);
  const [rofrHolder, setRofrHolder] = useState(start.id === "ROFR" ? start.holder : company.name);
  const [notice, setNotice] = useState(String(start.id === "ROFR" ? start.noticeDays : 30));
  const [maxPct, setMaxPct] = useState(String(start.id === "MAX_OWNERSHIP" ? start.maxBps / 100 : 25));
  const [accel, setAccel] = useState(start.id === "EMPLOYEE_VESTING" ? start.accelerationEnabled : false);

  const errors: string[] = [];
  let config: ModuleConfig | null = null;
  switch (id) {
    case "REGION": {
      const list = [...new Set(regions.split(",").map((r) => r.trim().toUpperCase()).filter(Boolean))];
      if (!list.length) errors.push("List at least one region.");
      if (list.some((r) => !/^[A-Z]{2}$/.test(r))) errors.push("Regions are two-letter ISO 3166 codes, separated by commas.");
      config = { id, mode, regions: list };
      break;
    }
    case "ELIGIBILITY":
      config = { id, minimumTier: tier, exemptEmployees: exempt };
      break;
    case "HOLDING_PERIOD": {
      const d = num(days);
      if (!(d >= 1 && d <= 3650 && Number.isInteger(d))) errors.push("Enter a holding period of 1 to 3,650 whole days.");
      config = { id, days: d };
      break;
    }
    case "HOLDER_CAP": {
      const n = num(maxHolders);
      if (!(n >= 1 && Number.isInteger(n))) errors.push("Enter a whole number of holders.");
      config = { id, maxHolders: n };
      break;
    }
    case "TRANSFER_WINDOW":
      config = { id, allowDuringLiquidityWindows: duringWindows, windows: start.id === "TRANSFER_WINDOW" ? start.windows : [] };
      break;
    case "ROFR": {
      const n = num(notice);
      if (!rofrHolder.trim()) errors.push("Name who holds the right of first refusal.");
      if (!(n >= 1 && n <= 180 && Number.isInteger(n))) errors.push("Enter a notice period of 1 to 180 days.");
      config = { id, holder: rofrHolder.trim(), noticeDays: n };
      break;
    }
    case "MAX_OWNERSHIP": {
      const p = num(maxPct);
      if (!(p > 0 && p <= 100)) errors.push("Enter a maximum between 0.01% and 100%.");
      config = { id, maxBps: Math.round(p * 100) };
      break;
    }
    case "EMPLOYEE_VESTING":
      config = { id, accelerationEnabled: accel };
      break;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length || !config) return;
        if (setModule(cls.id, config, enabled).ok) onDone();
      }}
    >
      <div className="mb-5">
        <p className="font-mono text-[11px] text-fog">
          {meta.contract} · returns {meta.reason}
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-tide">{meta.summary}</p>
      </div>

      <div className="space-y-4">
        {id === "REGION" && (
          <>
            <Field label="Mode">
              <Segmented
                label="Mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "allow", label: "Allow list" },
                  { value: "block", label: "Block list" },
                ]}
              />
            </Field>
            <Field label="Regions" hint="ISO 3166 alpha-2 codes, separated by commas.">
              <Input value={regions} onChange={(e) => setRegions(e.target.value)} className="font-mono uppercase" placeholder="US, CA, GB" />
            </Field>
          </>
        )}
        {id === "ELIGIBILITY" && (
          <>
            <Field label="Minimum eligibility tier" hint="Read from the recipient's INVESTOR_ELIGIBLE claim.">
              <Segmented label="Tier" value={tier} onChange={setTier} options={[0, 1, 2, 3].map((t) => ({ value: t, label: `Tier ${t}` }))} />
            </Field>
            <Switch checked={exempt} onChange={setExempt} label="Exempt employees" hint="Holders with an EMPLOYEE_OF claim for this company skip the tier check." />
          </>
        )}
        {id === "HOLDING_PERIOD" && (
          <Field label="Holding period" hint="Applied to each lot from its acquisition date. Lots are consumed oldest first.">
            <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" suffix="days" />
          </Field>
        )}
        {id === "HOLDER_CAP" && (
          <Field label="Maximum holders" hint="A transfer to a new holder fails once the class reaches this count.">
            <Input value={maxHolders} onChange={(e) => setMaxHolders(e.target.value)} inputMode="numeric" suffix="holders" />
          </Field>
        )}
        {id === "TRANSFER_WINDOW" && (
          <>
            <Switch checked={duringWindows} onChange={setDuringWindows} label="Allow during Liquidity Windows" hint="Settlement inside a Liquidity Window passes even outside a scheduled transfer window." />
            <p className="text-[12.5px] text-fog">
              {start.id === "TRANSFER_WINDOW" && start.windows.length ? `${start.windows.length} scheduled windows.` : "No transfer windows are scheduled, so direct transfers return WINDOW_CLOSED."}
            </p>
          </>
        )}
        {id === "ROFR" && (
          <>
            <Field label="Held by" hint="The company or a designee who may buy first.">
              <Input value={rofrHolder} onChange={(e) => setRofrHolder(e.target.value)} />
            </Field>
            <Field label="Notice period">
              <Input value={notice} onChange={(e) => setNotice(e.target.value)} inputMode="numeric" suffix="days" />
            </Field>
          </>
        )}
        {id === "MAX_OWNERSHIP" && (
          <Field label="Maximum per holder" hint={`Stored as basis points: ${Number.isFinite(num(maxPct)) ? Math.round(num(maxPct) * 100) : 0} bps.`}>
            <Input value={maxPct} onChange={(e) => setMaxPct(e.target.value)} inputMode="decimal" suffix="%" />
          </Field>
        )}
        {id === "EMPLOYEE_VESTING" && (
          <Switch checked={accel} onChange={setAccel} label="Allow acceleration" hint="The issuer can accelerate a grant, for example on a change of control." />
        )}

        <div className="rounded-2xl border border-line px-3 py-1">
          <Switch checked={enabled} onChange={setEnabled} label="Enabled" hint="A disabled module stays configured but does not run." />
        </div>
      </div>

      {config && !errors.length && enabled && (
        <div className="mt-5 rounded-2xl bg-haze px-4 py-3">
          <Caption className="mb-1">Reads as</Caption>
          <p className="text-[13px] leading-relaxed text-navy">{describe(config)}</p>
        </div>
      )}

      <div className="mt-5">
        <Notice tone="info">Module changes execute through the IssuerTimelock after a 24 hour delay. Holders can see the scheduled change in the Explorer.</Notice>
      </div>
      <ErrorList errors={errors} />
      <FormFooter call={`RuleEngine.${enabled ? "configureModule" : "removeModule"}(${meta.contract}, config)`}>
        <Button type="submit" disabled={errors.length > 0}>
          Schedule change
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}
