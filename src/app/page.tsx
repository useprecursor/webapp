import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { ProductsSection } from "@/components/ProductsSection";
import { RulesSection } from "@/components/RulesSection";
import { LiquiditySection } from "@/components/LiquiditySection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { ChainSection } from "@/components/ChainSection";
import { TransparencySection } from "@/components/TransparencySection";
import { DevelopersSection } from "@/components/DevelopersSection";
import { SecuritySection } from "@/components/SecuritySection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative">
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <ProductsSection />
        <RulesSection />
        <LiquiditySection />
        <ComparisonSection />
        <ChainSection />
        <TransparencySection />
        <DevelopersSection />
        <SecuritySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
