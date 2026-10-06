/*
 * The Precursor product model, as the Console, Portfolio and Explorer see it.
 * Names follow the contracts and the API: companies own share classes, each
 * share class is one Precursor Share Token, holders are identities with
 * claims, and every transfer is checked against the class's rule modules.
 */

export type Address = `0x${string}`;

export type ReasonCode =
  | "OK"
  | "TOKEN_PAUSED"
  | "FROZEN"
  | "INSUFFICIENT_UNLOCKED_BALANCE"
  | "SENDER_NOT_VERIFIED"
  | "RECIPIENT_NOT_VERIFIED"
  | "CLAIM_EXPIRED"
  | "REGION_BLOCKED"
  | "NOT_ELIGIBLE"
  | "HOLDING_PERIOD_ACTIVE"
  | "HOLDER_CAP_REACHED"
  | "WINDOW_CLOSED"
  | "ROFR_PENDING"
  | "MAX_OWNERSHIP_EXCEEDED"
  | "UNVESTED";

export type ClaimTopic = "IDENTITY_VERIFIED" | "INVESTOR_ELIGIBLE" | "REGION" | "EMPLOYEE_OF" | "SCREENED" | "VENUE";

export interface Claim {
  topic: ClaimTopic;
  /** Human-readable value: an eligibility tier, a region code, a company id. */
  value: string;
  verifier: string;
  issuedAt: number;
  expiresAt: number;
}

export type HolderKind = "founder" | "employee" | "investor" | "fund" | "treasury";

export interface Holder {
  id: string;
  name: string;
  kind: HolderKind;
  /** The identity contract the wallets resolve to. */
  identity: Address;
  wallets: Address[];
  region: string;
  /** Eligibility tier from the INVESTOR_ELIGIBLE claim, 0 when there is none. */
  tier: number;
  claims: Claim[];
  joinedAt: number;
  /** The company that invited this holder, or that owns it when it is a treasury. */
  companyId?: string;
  /** Set on the signed-in user's own holder record. */
  self?: boolean;
}

export type ModuleId =
  | "REGION"
  | "ELIGIBILITY"
  | "HOLDING_PERIOD"
  | "HOLDER_CAP"
  | "TRANSFER_WINDOW"
  | "ROFR"
  | "MAX_OWNERSHIP"
  | "EMPLOYEE_VESTING";

export type ModuleConfig =
  | { id: "REGION"; mode: "allow" | "block"; regions: string[] }
  | { id: "ELIGIBILITY"; minimumTier: number; exemptEmployees: boolean }
  | { id: "HOLDING_PERIOD"; days: number }
  | { id: "HOLDER_CAP"; maxHolders: number }
  | { id: "TRANSFER_WINDOW"; allowDuringLiquidityWindows: boolean; windows: { opensAt: number; closesAt: number }[] }
  | { id: "ROFR"; holder: string; noticeDays: number }
  | { id: "MAX_OWNERSHIP"; maxBps: number }
  | { id: "EMPLOYEE_VESTING"; accelerationEnabled: boolean };

export interface RuleModule {
  config: ModuleConfig;
  enabled: boolean;
  /** Set when a change is waiting on the IssuerTimelock. */
  pendingUntil?: number;
}

/** Shares acquired in one event. Holding periods are tracked per lot and consumed oldest first. */
export interface Lot {
  id: string;
  holderId: string;
  classId: string;
  quantity: number;
  acquiredAt: number;
  source: "ISSUANCE" | "OFFERING" | "WINDOW" | "RFQ" | "TRANSFER" | "GRANT";
}

export interface Grant {
  id: string;
  holderId: string;
  classId: string;
  total: number;
  start: number;
  cliffDays: number;
  durationDays: number;
  accelerated: boolean;
}

export interface ShareClass {
  id: string;
  companyId: string;
  name: string;
  symbol: string;
  /** Raw contract address of the share token proxy. */
  token: Address;
  ruleEngine: Address;
  authorized: number;
  /** ERC-8056 multiplier, 1 = one token per share. */
  multiplier: number;
  pendingMultiplier?: { value: number; effectiveAt: number };
  paused: boolean;
  modules: RuleModule[];
  /** Partial freezes keyed by holder id. */
  frozen: Record<string, number>;
  rfqEnabled: boolean;
}

export interface Company {
  id: string;
  name: string;
  legalName: string;
  sector: string;
  hq: string;
  founded: number;
  description: string;
  website: string;
  treasury: Address;
  registrar: string;
  contracts: Record<string, Address>;
  onboardedAt: number;
}

export interface Subscription {
  holderId: string;
  amount: number;
  at: number;
}

export interface Offering {
  id: string;
  companyId: string;
  classId: string;
  name: string;
  pricePerShare: number;
  minRaise: number;
  maxRaise: number;
  minTicket: number;
  opensAt: number;
  closesAt: number;
  requiredClaims: ClaimTopic[];
  documentId?: string;
  subscriptions: Subscription[];
  status: "SCHEDULED" | "OPEN" | "CLOSED" | "FAILED";
  /** Set at close. */
  result?: { raised: number; sharesIssued: number; fee: number; closedAt: number };
}

export interface WindowOrder {
  id: string;
  holderId: string;
  side: "SELL" | "BUY";
  quantity: number;
  limitPrice: number;
  placedAt: number;
  cancelled?: boolean;
  filled?: number;
}

export interface LiquidityWindow {
  id: string;
  companyId: string;
  classId: string;
  name: string;
  mode: "AUCTION" | "TENDER";
  opensAt: number;
  closesAt: number;
  reservePrice: number;
  tenderPrice?: number;
  maxVolume: number;
  perSellerCap: number;
  sellerClaims: ClaimTopic[];
  buyerClaims: ClaimTopic[];
  orders: WindowOrder[];
  status: "SCHEDULED" | "OPEN" | "CLEARED" | "CANCELLED";
  result?: { clearingPrice: number; volume: number; clearedAt: number };
}

export interface Distribution {
  id: string;
  companyId: string;
  classId: string;
  name: string;
  asset: "USDG";
  amount: number;
  recordAt: number;
  fundedAt: number;
  claimDeadline?: number;
  /** Holder id to amount claimed. */
  claimed: Record<string, number>;
}

export interface Proposal {
  id: string;
  companyId: string;
  classIds: string[];
  title: string;
  summary: string;
  options: string[];
  snapshotAt: number;
  endsAt: number;
  quorumBps: number;
  binding: boolean;
  /** Holder id to option index. */
  votes: Record<string, number>;
  status: "ACTIVE" | "FINALIZED";
  result?: number;
}

export type DocumentKind =
  | "SHARE_CLASS_TERMS"
  | "OFFERING_DOCUMENT"
  | "FINANCIAL_STATEMENT"
  | "COMPANY_UPDATE"
  | "BOARD_RESOLUTION"
  | "VALUATION_REPORT";

export interface Disclosure {
  id: string;
  companyId: string;
  kind: DocumentKind;
  title: string;
  hash: `0x${string}`;
  anchoredAt: number;
  visibility: "holders" | "public";
}

export interface Valuation {
  id: string;
  classId: string;
  price: number;
  source: "PRICED_ROUND" | "INDEPENDENT_VALUATION" | "WINDOW_CLEARING";
  asOf: number;
  documentId?: string;
}

export interface ChainEvent {
  id: string;
  companyId: string;
  classId?: string;
  name: string;
  summary: string;
  at: number;
  block: number;
  tx: `0x${string}`;
}

export interface Sandbox {
  network: { name: string; chainId: number; explorer: string };
  companies: Company[];
  classes: ShareClass[];
  holders: Holder[];
  lots: Lot[];
  grants: Grant[];
  offerings: Offering[];
  windows: LiquidityWindow[];
  distributions: Distribution[];
  proposals: Proposal[];
  documents: Disclosure[];
  valuations: Valuation[];
  events: ChainEvent[];
  block: number;
}
