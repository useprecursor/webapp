import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fonts are served from the repository, so builds never depend on reaching Google Fonts.
const grotesk = localFont({
  src: "./fonts/SpaceGrotesk-Variable.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});

const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const SITE_URL = "https://useprecursor.xyz";
const TITLE = "Precursor | Private company shares, issued on-chain";
const DESCRIPTION =
  "Precursor is the platform private companies use to issue their shares as tokens on Robinhood Chain, with transfer rules, offerings, Liquidity Windows and corporate actions built in and recorded on-chain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Precursor",
  },
  description: DESCRIPTION,
  applicationName: "Precursor",
  keywords: [
    "Precursor",
    "Robinhood Chain",
    "private company shares",
    "share tokens",
    "stock tokens",
    "issuer-sponsored tokens",
    "cap table",
    "ERC-3643",
    "ERC-8056",
    "transfer rules",
    "Liquidity Windows",
    "private markets",
    "USDG",
  ],
  authors: [{ name: "Precursor", url: SITE_URL }],
  creator: "Precursor",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Precursor",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@useprecursor",
    creator: "@useprecursor",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#060607",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-canvas text-navy antialiased">{children}</body>
    </html>
  );
}
