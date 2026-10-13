import type { Metadata } from "next";
import { AppFrame } from "@/components/app/AppFrame";

export const metadata: Metadata = {
  title: { default: "App", template: "%s | Precursor" },
  description: "Precursor Console, Portfolio and Explorer: issue, hold and trade private company shares on Robinhood Chain.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
