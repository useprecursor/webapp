import Image from "next/image";
import { cn } from "@/lib/utils";

/** Two slow pools of silver light with grain over them. Position the parent relatively. */
export function Aurora({ className, faint = false }: { className?: string; faint?: boolean }) {
  return (
    <>
      <div aria-hidden="true" className={cn("aurora -z-10", faint && "aurora-faint", className)} />
      <div aria-hidden="true" className="grain -z-10" />
    </>
  );
}

/** The quiet dot grid behind instrument-like sections. */
export function DotGrid({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("dotgrid absolute inset-0 -z-10", className)} />;
}

/**
 * The hero ground: black lit from above, a receding hairline grid, a horizon of
 * edge-light and one beam on the mark's heading. With `image`, a photograph of
 * light takes the beam's place, faded into the page at every edge. Position the
 * parent relatively.
 */
export function Void({
  className,
  beam = true,
  grid = true,
  image,
  imageClassName,
}: {
  className?: string;
  beam?: boolean;
  grid?: boolean;
  image?: string;
  /** Size and position of the photograph, kept at its own proportions. */
  imageClassName?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("void pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {image && (
        <div className={cn("void-image absolute aspect-[7/3] mix-blend-screen", imageClassName)}>
          {/* Served as the original PNG: re-encoding smooth gradients of light bands them. */}
          <Image src={image} alt="" fill priority unoptimized sizes="100vw" className="object-cover" />
        </div>
      )}
      {grid && <div className="linegrid absolute inset-0" />}
      <div className="void-horizon" />
      {beam && <div className="void-beam" />}
      <div className="grain" />
    </div>
  );
}

/**
 * Concentric hairline orbits around a point. One arc with
 * a small bead turns slowly; the rest stay put.
 */
export function Rings({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 640" aria-hidden="true" className={cn("block", className)}>
      <circle cx="320" cy="320" r="150" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1.25" />
      <circle cx="320" cy="320" r="214" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1.25" />
      <circle cx="320" cy="320" r="296" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 9" />
      <g className="animate-spin-slow" style={{ transformOrigin: "320px 320px" }}>
        <circle cx="320" cy="320" r="214" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2" strokeDasharray="220 1125" strokeLinecap="round" />
        <circle cx="534" cy="320" r="4" fill="#ffffff" style={{ filter: "drop-shadow(0 0 6px rgb(230 235 244 / 0.9))" }} />
      </g>
    </svg>
  );
}

/** A small accent dot, used as a list marker. */
export function Spark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block size-1.5 shrink-0 rounded-full bg-aqua shadow-[0_0_8px_rgb(230_235_244/0.8)]", className)} />;
}
