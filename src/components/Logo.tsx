import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MarkProps {
  size?: number;
  className?: string;
  /** Adds the one soft shadow the brand allows under the mark. */
  glow?: boolean;
}

/** The Precursor mark: a folded paper arrow with a light edge, cut out so it sits on any ground. */
export function Mark({ size = 36, className, glow = false }: MarkProps) {
  return (
    <Image
      src="/images/logo-mark.png"
      alt=""
      width={size}
      height={size}
      priority
      aria-hidden="true"
      className={cn("shrink-0 object-contain", glow && "mark-glow", className)}
      style={{ width: size, height: size }}
    />
  );
}

interface LogoProps {
  /** Pixel size of the mark. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
  href?: string;
}

export function Logo({ size = 32, withWordmark = true, className, href = "/" }: LogoProps) {
  return (
    <Link href={href} aria-label="Precursor, back to the start" className={cn("group inline-flex items-center gap-2.5 text-navy", className)}>
      <Mark size={size} className="transition-transform duration-500 group-hover:-rotate-6" />
      {withWordmark && <span className="font-display text-[22px] tracking-[-0.01em]">Precursor</span>}
    </Link>
  );
}
