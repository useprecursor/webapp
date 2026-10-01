import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { Rings, Void } from "@/components/atmosphere";
import { SITE } from "@/lib/site";

export function CTASection() {
  return (
    <section className="px-2 pb-2 pt-8 md:px-3 md:pb-3 md:pt-12">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-line-soft md:rounded-[36px]">
        <Void
          beam={false}
          grid={false}
          image="/images/cta-bg.png"
          imageClassName="-left-[35%] top-[38%] w-[170%] opacity-60 [--fade:50%] lg:left-[12%] lg:top-[4%] lg:w-full lg:opacity-100"
        />
        <div
          aria-hidden="true"
          className="absolute -right-40 -top-40 -z-10 size-[560px] rounded-full bg-[radial-gradient(circle,rgb(230_235_244/0.12),transparent_65%)] blur-2xl"
        />

        <div className="container grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="text-center lg:text-left">
            <p className="animate-reveal delay-1 inline-flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.12em] text-fog">
              Onboarding in under four weeks
            </p>
            <h2 className="animate-reveal delay-1 mt-6 text-[38px] leading-[1.04] md:text-[56px] lg:text-[64px] [text-wrap:balance]">
              Bring your cap table on-chain. <span className="accent-word">Keep the rules yours.</span>
            </h2>
            <p className="animate-reveal delay-2 mx-auto mt-6 max-w-xl text-[16.5px] leading-relaxed text-tide md:text-[18px] lg:mx-0">
              Tell us about your company and the share classes you want to issue. We will walk your team through the Console,
              rehearse your configuration on testnet, and deploy when you are ready.
            </p>
            <div className="animate-reveal delay-3 mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a href={`mailto:${SITE.contactEmail}`} className="btn btn-primary btn-lg">
                <Mail className="size-4" aria-hidden="true" />
                Talk to the team
              </a>
              <Link href={SITE.appHref} className="btn btn-secondary btn-lg">
                Open the Console
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="animate-reveal delay-3 mt-6 text-[13px] text-fog">{SITE.contactEmail}</p>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center">
            <Rings className="absolute inset-0 h-full w-full" />
            <Image
              src="/images/logo-mark-lg.png"
              alt=""
              width={520}
              height={520}
              className="animate-float mark-glow relative w-[44%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
