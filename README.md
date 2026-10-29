<div align="center">
  <img src="public/icon-512.png" alt="Precursor" width="88" />
  <h1>precursor-web</h1>
  <p>The marketing site for <a href="https://useprecursor.xyz">useprecursor.xyz</a>, plus the Console, Portfolio and Explorer.</p>
</div>

Precursor is the platform private companies use to issue their shares as tokens on Robinhood Chain. Each share class is one Precursor Share Token (ERC-20, ERC-3643-compatible permissioned transfers, ERC-8056 multiplier), and every transfer runs the class's rule modules and returns a reason code. This repository holds everything a browser sees:

| Surface | Route | For |
| :-- | :-- | :-- |
| Marketing site | `/` | Everyone |
| Console | `/console` | Companies: cap table, share classes and rules, offerings, Liquidity Windows, corporate actions, disclosures |
| Portfolio | `/portfolio` | Investors and employees: holdings by lot, invest, sell in windows, distributions, votes, documents |
| Explorer | `/explorer` | Public: every company's supply, holders, rules, offerings, windows, valuations and events |

The three apps live under the `src/app/(app)` route group. Data is stored in **Supabase**, sign-in is **Privy**, and every action runs through a TypeScript model of the contract rules in `src/lib/precursor`, on the server as well as in the browser. There is no sample data: a new account starts by deploying its company.

## Getting started

You need Node 24 or later (pinned in `.nvmrc`), a Supabase project and a Privy app.

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Privy and Supabase values.
3. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates every table and is safe to run again.
4. In the Privy dashboard, add `http://localhost:3000` to the allowed origins.
5. `npm run dev`, then open http://localhost:3000/console, sign in, and deploy your first company and share class.

The Explorer at `/explorer` is public and works signed out.

| Command | Purpose |
| :-- | :-- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | Lint, typecheck and build |

## Layout of the code

```
src/app/page.tsx         the marketing page
src/app/(app)/           Console, Portfolio, Explorer and account routes, sharing one app layout
src/components/          marketing sections, header, footer and shared visual pieces
src/components/app/      the app shell and the small UI kit used by every app page
src/lib/precursor/       types, the rule engine, the actions, the store and Privy sign-in
src/lib/precursor/server the Supabase repository, row mapping and Privy token checks
src/app/api/precursor/   the state and action routes the app calls
supabase/schema.sql      the database schema
src/lib/site.ts          brand constants: name, domain, links, navigation, docs pages
public/                  the mark and app icons
```

Styling is Tailwind CSS 4. Color, type and component tokens are defined once in `src/app/globals.css`. Display type is Space Grotesk, body is Geist and figures are Geist Mono.

## How data flows

- **Reads.** `GET /api/precursor/state` loads every table and returns the state the caller may see. Everything on-chain is public, but a holder's name is shown only to the holder and to the companies they hold or were invited by; everyone else sees a wallet address.
- **Writes.** An action runs in the browser first, so the interface answers at once, then `POST /api/precursor/action` verifies the Privy session, checks the user may take it (a company admin for Console actions, the holder themselves for subscribing, ordering, claiming, voting and transfers), runs the same rules against the database, and writes the changed rows in one transaction through the `apply_changes` function. If another write landed first, the server reloads and runs the action again. A refused action rolls back in the browser.
- **Accounts.** The first sign-in creates a holder record linked to the user's Privy wallets. A holder a company invited by wallet address is claimed by whoever signs in with that wallet. Creating a company makes the user its owner in `company_members`.
- **Security.** Row level security is on for every table with no policies, so only the server, holding the service-role key, can read or write.

## How the model mirrors the contracts

The rule model is not a mock of the interface. It computes the same answers the contracts do, so a transfer previewed in Portfolio fails for the same reason it would fail on-chain.

- **`engine.ts`** holds the rules. `canTransfer` runs its checks in the order `PrecursorShareToken` does and stops at the first failure: token paused (`TOKEN_PAUSED`), sender balance (`INSUFFICIENT_UNLOCKED_BALANCE`, `FROZEN`), sender identity and recipient identity (`SENDER_NOT_VERIFIED`, `RECIPIENT_NOT_VERIFIED`, `CLAIM_EXPIRED`), then each enabled module in order: `REGION_BLOCKED`, `NOT_ELIGIBLE`, `HOLDING_PERIOD_ACTIVE`, `HOLDER_CAP_REACHED`, `WINDOW_CLOSED`, `ROFR_PENDING`, `MAX_OWNERSHIP_EXCEEDED`, `UNVESTED`. It returns `OK` only when everything passes, together with a step-by-step trace.
- **Liquidity Windows** clear with `previewClearing`, the algorithm `LiquidityWindow.clear` uses: the single price that matches the most volume, ties broken toward the latest Reference Valuation, held at or above the reserve price, then fills by price priority and pro-rata at the marginal level, capped by the window's maximum volume. Fixed-price tenders fill sellers pro-rata. The clearing price is published as a Reference Valuation with source `WINDOW_CLEARING`.
- **Holdings** are tracked per lot, so holding periods and vesting are consumed oldest first, exactly as on-chain. `breakdown` splits a balance into frozen, unvested, held, in orders and unlocked.
- **`actions.ts`** holds every action (deploy a company and share classes, subscribe, open a window, place and clear orders, fund and claim distributions, vote, anchor documents, publish valuations, configure modules, pause, invite and verify holders). Each one checks the same rules, updates state, records the event the contract would emit, and returns a receipt naming the contract call it maps to, such as `OfferingVault.subscribe`. `store.tsx` exposes them to the pages.

## Elsewhere

- Smart contracts, tests and deploy scripts: [`contracts/README.md`](contracts/README.md)
- Product documentation, published with GitBook at [docs.useprecursor.xyz](https://docs.useprecursor.xyz): [`docs/`](docs/)
- News and updates: [@useprecursor](https://x.com/useprecursor)
