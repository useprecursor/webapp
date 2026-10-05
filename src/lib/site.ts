/** Brand constants shared across the site. */
export const SITE = {
  name: "Precursor",
  domain: "useprecursor.xyz",
  url: "https://useprecursor.xyz",
  xHandle: "@useprecursor",
  xUrl: "https://x.com/useprecursor",
  githubUrl: "https://github.com/useprecursor",
  docsUrl: "https://docs.useprecursor.xyz",
  contactEmail: "hello@useprecursor.xyz",
  securityEmail: "security@useprecursor.xyz",
  appHref: "/console",
  portfolioHref: "/portfolio",
  explorerHref: "/explorer",
} as const;

export const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Products", href: "/#products" },
  { label: "Transfer rules", href: "/#rules" },
  { label: "Liquidity", href: "/#liquidity" },
  { label: "Developers", href: "/#developers" },
  { label: "Explorer", href: SITE.explorerHref },
] as const;

/** Pages of the documentation, as served at docs.useprecursor.xyz. */
export const DOCS_LINKS = [
  { label: "Precursor at a glance", path: "" },
  { label: "Why Precursor", path: "overview/why-precursor" },
  { label: "Tokenize your company", path: "guides/tokenize-your-company" },
  { label: "Liquidity Windows", path: "liquidity/liquidity-windows" },
  { label: "Quickstart", path: "developers/quickstart" },
  { label: "API reference", path: "developers/api-reference" },
  { label: "Contract reference", path: "developers/contracts" },
  { label: "Frequently asked questions", path: "resources/faq" },
] as const;

export function docsHref(path: string): string {
  return path ? `${SITE.docsUrl}/${path}` : SITE.docsUrl;
}
