/*
 * Generates supabase/seed.sql and supabase/unseed.sql.
 *
 * The seed is not written by hand. Three fictional companies are built by
 * running the app's own actions through the rule engine (deploy, invite,
 * issue, configure rules, raise, run windows, pay distributions, vote), so
 * every balance, lot, valuation and event agrees with the rules. Times are
 * written relative to now(), so offerings and windows that are open in the
 * seed are open whenever it runs.
 *
 *   npm run seed:generate
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { emptySandbox, runAction, treasuryOf, type ActionArgs, type ActionName } from "../src/lib/precursor/actions";
import { byId } from "../src/lib/precursor/engine";
import { NETWORK } from "../src/lib/precursor/network";
import { TABLES, toRows, type Row } from "../src/lib/precursor/server/rows";
import type { Grant, Holder, ModuleConfig, Sandbox } from "../src/lib/precursor/types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** The moment the seed treats as "now". Every timestamp is written relative to it. */
const BASE = Date.UTC(2026, 9, 27, 12, 0, 0);
const d = (days: number, hours = 0) => BASE + days * DAY + hours * HOUR;

// Deterministic ids and hashes, so regenerating gives the same seed.
let seed = 20261027;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let clock = d(-500);
Date.now = () => clock;

let s: Sandbox = emptySandbox(NETWORK);
let block = 97_400_000;

function act<N extends ActionName>(at: number, name: N, ...args: ActionArgs[N]): Sandbox {
  clock = at;
  block += 2_000 + Math.floor(Math.random() * 6_000);
  const out = runAction(s, name, args, { now: at, block });
  if (!out.next) throw new Error(`${name} was rejected at day ${Math.round((at - BASE) / DAY)}: ${out.receipt.title}. ${out.receipt.detail}`);
  s = out.next;
  return s;
}

const company = (name: string) => s.companies.find((c) => c.name === name)!;
const cls = (symbol: string) => s.classes.find((c) => c.symbol === symbol)!;
const holder = (name: string) => s.holders.find((h) => h.name === name)!;
const last = <T,>(list: T[]) => list[0];

type Invite = [name: string, kind: Holder["kind"], region: string, tier: number, employee?: boolean];
function invite(at: number, companyName: string, people: Invite[]) {
  people.forEach(([name, kind, region, tier, employee = false], i) =>
    act(at + i * HOUR, "inviteHolder", { companyId: company(companyName).id, name, kind, region, tier, employee })
  );
}
function issue(at: number, symbol: string, grants: [name: string, quantity: number][]) {
  grants.forEach(([name, qty], i) => act(at + i * HOUR, "issueShares", cls(symbol).id, name.endsWith("treasury") ? treasuryOf(s, cls(symbol).companyId)!.id : holder(name).id, qty));
}
function rules(at: number, symbol: string, configs: ModuleConfig[]) {
  configs.forEach((config, i) => act(at + i * HOUR, "setModule", cls(symbol).id, config, true));
}
function grant(name: string, symbol: string, total: number, start: number, cliffDays: number, durationDays: number) {
  const g: Grant = { id: `grt_${holder(name).id.slice(4)}`, holderId: holder(name).id, classId: cls(symbol).id, total, start, cliffDays, durationDays, accelerated: false };
  s = { ...s, grants: [...s.grants, g] };
}
/** Precursor Identity re-signs every claim close to expiry, as it does in production. */
function renewClaims(at: number) {
  s = {
    ...s,
    holders: s.holders.map((h) => ({
      ...h,
      claims: h.claims.map((c) => (c.expiresAt < at + 120 * DAY ? { ...c, issuedAt: at, expiresAt: c.topic === "SCREENED" ? at + 365 * DAY : at + 730 * DAY } : c)),
    })),
  };
}
function doc(at: number, companyName: string, kind: Parameters<typeof act<"anchorDocument">>[2]["kind"], title: string, visibility: "holders" | "public") {
  act(at, "anchorDocument", { companyId: company(companyName).id, kind, title, visibility });
}

/* Northwind Labs ---------------------------------------------------------- */

act(d(-430), "createCompany", {
  name: "Northwind Labs",
  legalName: "Northwind Labs, Inc.",
  sector: "Logistics software",
  hq: "US, San Francisco",
  founded: 2017,
  description: "Routing and capacity planning for freight networks. Northwind's models schedule loads for carriers and shippers across North America and Europe.",
  website: "https://northwind.example",
});
act(d(-429), "createShareClass", { companyId: company("Northwind Labs").id, name: "Common", symbol: "NWL-C", authorized: 20_000_000, multiplier: 1 });
act(d(-429, 2), "createShareClass", { companyId: company("Northwind Labs").id, name: "Series B Preferred", symbol: "NWL-B", authorized: 4_000_000, multiplier: 1 });
invite(d(-428), "Northwind Labs", [
  ["Maya Chen", "founder", "US", 3, true],
  ["Daniel Okafor", "founder", "US", 3, true],
  ["Priya Raman", "employee", "US", 0, true],
  ["Tom Becker", "employee", "DE", 0, true],
  ["Harbor Point Ventures", "fund", "US", 3],
  ["Lattice Capital", "fund", "GB", 3],
  ["Kenji Watanabe", "investor", "SG", 2],
  ["Ruth Adeyemi", "investor", "GB", 2],
  ["Ines Moreau", "investor", "FR", 1],
  ["Sofia Alvarez", "investor", "US", 1],
]);
issue(d(-427), "NWL-C", [
  ["Maya Chen", 4_200_000],
  ["Daniel Okafor", 3_800_000],
  ["Priya Raman", 120_000],
  ["Tom Becker", 90_000],
  ["Northwind Labs treasury", 1_500_000],
]);
grant("Priya Raman", "NWL-C", 120_000, d(-610), 365, 1460);
grant("Tom Becker", "NWL-C", 90_000, d(-320), 365, 1460);
issue(d(-426), "NWL-B", [
  ["Harbor Point Ventures", 600_000],
  ["Lattice Capital", 500_000],
  ["Kenji Watanabe", 60_000],
  ["Ruth Adeyemi", 40_000],
]);
const nwlTreasury = () => treasuryOf(s, company("Northwind Labs").id)!.id;
rules(d(-425), "NWL-C", [
  { id: "REGION", mode: "allow", regions: ["US", "CA", "GB", "DE", "FR", "SG"] },
  { id: "HOLDING_PERIOD", days: 365 },
  { id: "ROFR", holder: nwlTreasury(), noticeDays: 30 },
  { id: "EMPLOYEE_VESTING", accelerationEnabled: false },
]);
rules(d(-425, 6), "NWL-B", [
  { id: "REGION", mode: "allow", regions: ["US", "CA", "GB", "DE", "FR", "SG", "JP"] },
  { id: "ELIGIBILITY", minimumTier: 1, exemptEmployees: true },
  { id: "HOLDING_PERIOD", days: 180 },
  { id: "HOLDER_CAP", maxHolders: 2000 },
  { id: "ROFR", holder: nwlTreasury(), noticeDays: 30 },
]);
doc(d(-425, 8), "Northwind Labs", "SHARE_CLASS_TERMS", "Series B Preferred terms", "public");
doc(d(-424), "Northwind Labs", "SHARE_CLASS_TERMS", "Common stock terms and transfer rules", "public");
doc(d(-412), "Northwind Labs", "VALUATION_REPORT", "Independent valuation, Q3 2025", "holders");
act(d(-411), "publishValuation", cls("NWL-B").id, 18.4, "INDEPENDENT_VALUATION");
act(d(-411, 1), "publishValuation", cls("NWL-C").id, 9.1, "INDEPENDENT_VALUATION");

// The Series B round: subscriptions over a month, then the close mints the shares.
doc(d(-242), "Northwind Labs", "OFFERING_DOCUMENT", "Series B offering memorandum", "holders");
act(d(-240), "createOffering", {
  companyId: company("Northwind Labs").id,
  classId: cls("NWL-B").id,
  name: "Series B",
  pricePerShare: 22.5,
  minRaise: 2_000_000,
  maxRaise: 6_000_000,
  minTicket: 25_000,
  opensAt: d(-240),
  closesAt: d(-210),
  requiredClaims: ["IDENTITY_VERIFIED", "INVESTOR_ELIGIBLE"],
  documentId: last(s.documents).id,
});
const seriesB = last(s.offerings).id;
(
  [
    ["Harbor Point Ventures", 1_500_000, -236],
    ["Lattice Capital", 1_200_000, -231],
    ["Kenji Watanabe", 250_000, -226],
    ["Ruth Adeyemi", 150_000, -222],
    ["Ines Moreau", 100_000, -218],
    ["Sofia Alvarez", 80_000, -214],
  ] as const
).forEach(([name, amount, day]) => act(d(day), "subscribe", seriesB, holder(name).id, amount));
act(d(-209), "closeOffering", seriesB);
doc(d(-300), "Northwind Labs", "FINANCIAL_STATEMENT", "FY2025 audited financial statements", "holders");

// The Q2 Liquidity Window, cleared.
act(d(-100), "openWindow", {
  companyId: company("Northwind Labs").id,
  classId: cls("NWL-B").id,
  name: "Q2 2026 Liquidity Window",
  mode: "AUCTION",
  opensAt: d(-100),
  closesAt: d(-93),
  reservePrice: 20,
  maxVolume: 60_000,
  perSellerCap: 30_000,
  sellerClaims: ["IDENTITY_VERIFIED"],
  buyerClaims: ["IDENTITY_VERIFIED", "INVESTOR_ELIGIBLE"],
});
const q2 = last(s.windows).id;
(
  [
    ["Kenji Watanabe", "SELL", 20_000, 23.0, -99],
    ["Ruth Adeyemi", "SELL", 15_000, 24.5, -98],
    ["Lattice Capital", "SELL", 25_000, 25.0, -97],
    ["Sofia Alvarez", "BUY", 12_000, 26.0, -97],
    ["Ines Moreau", "BUY", 8_000, 24.75, -96],
    ["Harbor Point Ventures", "BUY", 30_000, 23.5, -95],
  ] as const
).forEach(([name, side, qty, price, day]) => act(d(day), "placeOrder", q2, holder(name).id, side, qty, price));
act(d(-93, 1), "clearWindow", q2);

renewClaims(d(-150));
act(d(-30), "setRfq", cls("NWL-B").id, true);
act(d(-20), "transfer", cls("NWL-B").id, holder("Kenji Watanabe").id, holder("Sofia Alvarez").id, 2_000, "rfq");

// A preferred dividend, mostly claimed.
act(d(-58), "fundDistribution", {
  companyId: company("Northwind Labs").id,
  classId: cls("NWL-B").id,
  name: "2026 preferred dividend",
  asset: "USDG",
  amount: 342_240,
  recordAt: d(-60),
  claimDeadline: d(330),
});
const dividend = last(s.distributions).id;
["Harbor Point Ventures", "Lattice Capital", "Ruth Adeyemi"].forEach((name, i) => act(d(-50 + i * 4), "claimDistribution", dividend, holder(name).id));

// One decided vote and one still open.
act(d(-75), "createProposal", {
  companyId: company("Northwind Labs").id,
  classIds: [cls("NWL-C").id, cls("NWL-B").id],
  title: "Approve the 2026 equity incentive plan",
  summary: "Reserves 800,000 Common shares for employee grants over the next three years, vesting over four years with a one-year cliff.",
  options: ["For", "Against", "Abstain"],
  snapshotAt: d(-75),
  endsAt: d(-61),
  quorumBps: 2000,
  binding: true,
});
const plan = last(s.proposals).id;
(
  [
    ["Maya Chen", 0],
    ["Daniel Okafor", 0],
    ["Harbor Point Ventures", 0],
    ["Lattice Capital", 2],
    ["Kenji Watanabe", 1],
  ] as const
).forEach(([name, option], i) => act(d(-72 + i), "castVote", plan, holder(name).id, option));
act(d(-60), "finalizeProposal", plan);
doc(d(-59), "Northwind Labs", "BOARD_RESOLUTION", "Board resolution adopting the 2026 equity incentive plan", "holders");

act(d(-3), "createProposal", {
  companyId: company("Northwind Labs").id,
  classIds: [cls("NWL-B").id],
  title: "Elect an independent director",
  summary: "Elects Grace Liu, former chief operating officer of a public freight carrier, to the board as an independent director for a two-year term.",
  options: ["For", "Against"],
  snapshotAt: d(-3),
  endsAt: d(9),
  quorumBps: 3000,
  binding: true,
});
const director = last(s.proposals).id;
act(d(-2), "castVote", director, holder("Harbor Point Ventures").id, 0);
act(d(-1), "castVote", director, holder("Ruth Adeyemi").id, 0);

doc(d(-120), "Northwind Labs", "COMPANY_UPDATE", "Q2 2026 shareholder update", "holders");
doc(d(-28), "Northwind Labs", "COMPANY_UPDATE", "Q3 2026 shareholder update", "holders");

// Open now: the Series B extension and the Q4 window.
doc(d(-6), "Northwind Labs", "OFFERING_DOCUMENT", "Series B extension supplement", "holders");
act(d(-5), "createOffering", {
  companyId: company("Northwind Labs").id,
  classId: cls("NWL-B").id,
  name: "Series B extension",
  pricePerShare: 25,
  minRaise: 1_500_000,
  maxRaise: 4_000_000,
  minTicket: 10_000,
  opensAt: d(-5),
  closesAt: d(6),
  requiredClaims: ["IDENTITY_VERIFIED", "INVESTOR_ELIGIBLE"],
  documentId: last(s.documents).id,
});
const extension = last(s.offerings).id;
(
  [
    ["Harbor Point Ventures", 900_000, -4],
    ["Kenji Watanabe", 120_000, -3],
    ["Sofia Alvarez", 60_000, -2],
    ["Ines Moreau", 40_000, -1],
  ] as const
).forEach(([name, amount, day]) => act(d(day), "subscribe", extension, holder(name).id, amount));

act(d(-2, -4), "openWindow", {
  companyId: company("Northwind Labs").id,
  classId: cls("NWL-B").id,
  name: "Q4 2026 Liquidity Window",
  mode: "AUCTION",
  opensAt: d(-2, -4),
  closesAt: d(5),
  reservePrice: 22,
  maxVolume: 80_000,
  perSellerCap: 40_000,
  sellerClaims: ["IDENTITY_VERIFIED"],
  buyerClaims: ["IDENTITY_VERIFIED", "INVESTOR_ELIGIBLE"],
});
const q4 = last(s.windows).id;
(
  [
    ["Ruth Adeyemi", "SELL", 10_000, 24.0],
    ["Kenji Watanabe", "SELL", 12_000, 25.5],
    ["Lattice Capital", "SELL", 20_000, 26.0],
    ["Sofia Alvarez", "BUY", 8_000, 26.5],
    ["Ines Moreau", "BUY", 5_000, 25.0],
    ["Harbor Point Ventures", "BUY", 15_000, 25.75],
  ] as const
).forEach(([name, side, qty, price], i) => act(d(-1, i), "placeOrder", q4, holder(name).id, side, qty, price));

/* Halcyon Robotics -------------------------------------------------------- */

act(d(-330), "createCompany", {
  name: "Halcyon Robotics",
  legalName: "Halcyon Robotics Corp.",
  sector: "Warehouse robotics",
  hq: "US, Pittsburgh",
  founded: 2019,
  description: "Autonomous picking arms and fleet software for high-density warehouses, sold as a subscription per robot.",
  website: "https://halcyon.example",
});
act(d(-329), "createShareClass", { companyId: company("Halcyon Robotics").id, name: "Ordinary", symbol: "HAL-O", authorized: 12_000_000, multiplier: 1 });
invite(d(-328), "Halcyon Robotics", [
  ["Arjun Mehta", "founder", "US", 3, true],
  ["Lena Fischer", "founder", "DE", 3, true],
  ["Owen Price", "employee", "US", 0, true],
  ["Northbeam Partners", "fund", "US", 3],
  ["Clara Jensen", "investor", "SE", 1],
]);
issue(d(-327), "HAL-O", [
  ["Arjun Mehta", 2_600_000],
  ["Lena Fischer", 2_400_000],
  ["Owen Price", 60_000],
  ["Northbeam Partners", 1_900_000],
  ["Harbor Point Ventures", 700_000],
  ["Clara Jensen", 45_000],
  ["Halcyon Robotics treasury", 800_000],
]);
rules(d(-326), "HAL-O", [
  { id: "REGION", mode: "block", regions: ["CU", "IR", "KP", "RU", "SY"] },
  { id: "ELIGIBILITY", minimumTier: 1, exemptEmployees: true },
  { id: "HOLDER_CAP", maxHolders: 500 },
  { id: "MAX_OWNERSHIP", maxBps: 4000 },
]);
doc(d(-326, 4), "Halcyon Robotics", "SHARE_CLASS_TERMS", "Ordinary share terms", "public");
doc(d(-290), "Halcyon Robotics", "VALUATION_REPORT", "Independent valuation, Q1 2026", "holders");
act(d(-289), "publishValuation", cls("HAL-O").id, 11.2, "INDEPENDENT_VALUATION");

// A company-funded tender: the treasury buys back at a fixed price.
act(d(-52), "openWindow", {
  companyId: company("Halcyon Robotics").id,
  classId: cls("HAL-O").id,
  name: "2026 employee and founder tender",
  mode: "TENDER",
  opensAt: d(-52),
  closesAt: d(-45),
  reservePrice: 0,
  tenderPrice: 12,
  maxVolume: 60_000,
  perSellerCap: 50_000,
  sellerClaims: ["IDENTITY_VERIFIED"],
  buyerClaims: [],
});
const tender = last(s.windows).id;
(
  [
    ["Arjun Mehta", 40_000],
    ["Lena Fischer", 30_000],
    ["Owen Price", 6_000],
  ] as const
).forEach(([name, qty], i) => act(d(-50 + i), "placeOrder", tender, holder(name).id, "SELL", qty, 12));
act(d(-45, 1), "clearWindow", tender);
doc(d(-90), "Halcyon Robotics", "COMPANY_UPDATE", "H1 2026 shareholder letter", "holders");
doc(d(-12), "Halcyon Robotics", "FINANCIAL_STATEMENT", "Q3 2026 management accounts", "holders");

/* Meridian Bio ------------------------------------------------------------ */

act(d(-400), "createCompany", {
  name: "Meridian Bio",
  legalName: "Meridian Bio Ltd",
  sector: "Biotechnology",
  hq: "GB, Cambridge",
  founded: 2016,
  description: "Antibody discovery on a proprietary single-cell platform, with two programs in clinical trials for autoimmune disease.",
  website: "https://meridianbio.example",
});
act(d(-399), "createShareClass", { companyId: company("Meridian Bio").id, name: "Series C Preferred", symbol: "MER-S", authorized: 6_000_000, multiplier: 1 });
invite(d(-398), "Meridian Bio", [
  ["Eleanor Hughes", "founder", "GB", 3, true],
  ["Rafael Costa", "founder", "GB", 3, true],
  ["Kestrel Life Sciences Fund", "fund", "GB", 3],
  ["Amara Nwosu", "investor", "NL", 2],
]);
issue(d(-397), "MER-S", [
  ["Eleanor Hughes", 900_000],
  ["Rafael Costa", 850_000],
  ["Kestrel Life Sciences Fund", 1_400_000],
  ["Lattice Capital", 600_000],
  ["Amara Nwosu", 35_000],
]);
rules(d(-396), "MER-S", [
  { id: "REGION", mode: "allow", regions: ["GB", "DE", "FR", "NL", "CH", "IE", "US"] },
  { id: "ELIGIBILITY", minimumTier: 2, exemptEmployees: true },
  { id: "HOLDING_PERIOD", days: 365 },
]);
doc(d(-396, 3), "Meridian Bio", "SHARE_CLASS_TERMS", "Series C Preferred terms", "public");
act(d(-380), "publishValuation", cls("MER-S").id, 38.5, "PRICED_ROUND");
act(d(-120), "publishValuation", cls("MER-S").id, 41, "INDEPENDENT_VALUATION");
doc(d(-121), "Meridian Bio", "VALUATION_REPORT", "Independent valuation after the phase 2 readout", "holders");
doc(d(-15), "Meridian Bio", "COMPANY_UPDATE", "Clinical program update, October 2026", "public");

// A second close that has been announced but not yet opened.
act(d(-1), "createOffering", {
  companyId: company("Meridian Bio").id,
  classId: cls("MER-S").id,
  name: "Series C second close",
  pricePerShare: 41,
  minRaise: 2_000_000,
  maxRaise: 8_000_000,
  minTicket: 50_000,
  opensAt: d(10),
  closesAt: d(40),
  requiredClaims: ["IDENTITY_VERIFIED", "INVESTOR_ELIGIBLE"],
});

/* Finishing ---------------------------------------------------------------- */

// Claims are renewed on schedule, so every identity reads as current today.
s = {
  ...s,
  holders: s.holders.map((h) => ({
    ...h,
    claims: h.claims.map((c) => (c.expiresAt < d(240) ? { ...c, issuedAt: Math.max(c.issuedAt, d(-120)), expiresAt: d(240) } : c)),
  })),
};

/* SQL ---------------------------------------------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ARRAY_COLUMNS = new Set(["wallets", "required_claims", "seller_claims", "buyer_claims", "class_ids", "options"]);
const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;

function literal(column: string, v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (ARRAY_COLUMNS.has(column)) {
    const list = v as string[];
    return list.length ? `array[${list.map(quote).join(", ")}]::text[]` : "'{}'::text[]";
  }
  if (typeof v === "string" && ISO.test(v)) {
    const secs = Math.round((Date.parse(v) - BASE) / 1000);
    return `now() ${secs < 0 ? "-" : "+"} interval '${Math.abs(secs)} seconds'`;
  }
  if (typeof v === "string") return quote(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return `${quote(JSON.stringify(v))}::jsonb`;
}

const tables = toRows(s);
const out: string[] = [
  "-- Precursor sample data: three fictional companies with cap tables, rules,",
  "-- offerings, Liquidity Windows, a dividend, votes, documents and their events.",
  "--",
  "-- Generated by scripts/seed.ts from the app's own rule engine. Do not edit by",
  "-- hand; change the script and run `npm run seed:generate`.",
  "--",
  "-- Run supabase/schema.sql first, then this file in the Supabase SQL editor.",
  "-- Times are relative to now(), so open offerings and windows are open when you",
  "-- run it. Running it twice changes nothing. supabase/unseed.sql removes it.",
  "",
  "begin;",
  "",
];
for (const name of TABLES) {
  const rows = tables[name] as Row[];
  if (!rows.length) continue;
  const columns = Object.keys(rows[0]).filter((c) => !(name === "companies" && c === "company_id"));
  out.push(`-- ${name} (${rows.length})`);
  out.push(`insert into public.${name} (${columns.join(", ")}) values`);
  out.push(rows.map((r) => `  (${columns.map((c) => literal(c, r[c])).join(", ")})`).join(",\n"));
  out.push("on conflict (id) do nothing;", "");
}
out.push(
  "-- Tell the server its cached state is stale.",
  "update public.app_state set version = version + 1, updated_at = now() where id = 1;",
  "",
  "commit;",
  "",
  "-- Optional: administer the sample companies from your own account.",
  "-- Sign in to the app once (that creates your account row), replace the email,",
  "-- and run the statement below. Wallet-only accounts have no email; use",
  "-- `where a.user_id = 'did:privy:...'` instead, from the accounts table.",
  "--",
  "-- insert into public.company_members (company_id, user_id, role)",
  "-- select c.id, a.user_id, 'admin'",
  "-- from public.companies c cross join public.accounts a",
  `-- where a.email = 'you@example.com' and c.id in (${s.companies.map((c) => quote(c.id)).join(", ")})`,
  "-- on conflict do nothing;",
  ""
);

const unseed = [
  "-- Removes the sample data that supabase/seed.sql adds, and nothing else.",
  "-- Deleting a company cascades to its classes, rules, lots, offerings, windows,",
  "-- distributions, votes, documents, valuations and events.",
  "",
  "begin;",
  "",
  `delete from public.company_members where company_id in (${s.companies.map((c) => quote(c.id)).join(", ")});`,
  `delete from public.companies where id in (${s.companies.map((c) => quote(c.id)).join(", ")});`,
  `delete from public.holders where id in (${s.holders.map((h) => quote(h.id)).join(", ")}) and id not in (select holder_id from public.accounts);`,
  "update public.app_state set version = version + 1, updated_at = now() where id = 1;",
  "",
  "commit;",
  "",
];

const dir = join(__dirname, "..", "supabase");
writeFileSync(join(dir, "seed.sql"), out.join("\n"));
writeFileSync(join(dir, "unseed.sql"), unseed.join("\n"));

const count = Object.fromEntries(TABLES.map((t) => [t, tables[t].length]).filter(([, n]) => n));
console.log("seed.sql written:", count);
console.log(
  "open now:",
  s.offerings.filter((o) => o.status === "OPEN").map((o) => o.name),
  s.windows.filter((w) => w.status === "OPEN").map((w) => w.name),
  "valuations:",
  s.classes.map((c) => `${c.symbol} ${byId(s.valuations, s.valuations.filter((v) => v.classId === c.id).sort((a, b) => b.asOf - a.asOf)[0]?.id)?.price}`)
);
