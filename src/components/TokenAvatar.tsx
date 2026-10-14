import { cn } from "@/lib/utils";

/*
 * Company marks for the Stock Tokens the market lists, drawn from Simple Icons
 * (CC0) in white on each company's own colour. Anything without a mark falls
 * back to its ticker on a graphite tile.
 */
const MARKS: Record<string, { bg: string; path: string; label: string }> = {
  NVDA: {
    label: "NVIDIA",
    bg: "#76b900",
    path: "M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z",
  },
  AAPL: {
    label: "Apple",
    bg: "#111418",
    path: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701",
  },
  AMD: {
    label: "AMD",
    bg: "#111418",
    path: "M18.324 9.137l1.559 1.56h2.556v2.557L24 14.814V9.137zM2 9.52l-2 4.96h1.309l.37-.982H3.9l.408.982h1.338L3.432 9.52zm4.209 0v4.955h1.238v-3.092l1.338 1.562h.188l1.338-1.556v3.091h1.238V9.52H10.47l-1.592 1.845L7.287 9.52zm6.283 0v4.96h2.057c1.979 0 2.88-1.046 2.88-2.472 0-1.36-.937-2.488-2.747-2.488zm1.237.91h.792c1.17 0 1.63.711 1.63 1.57 0 .728-.372 1.572-1.616 1.572h-.806zm-10.985.273l.791 1.932H2.008zm17.137.307l-1.604 1.603v2.25h2.246l1.604-1.607h-2.246z",
  },
};

/** "NVDAx", "nvda" and "NVDA" all resolve to the same company. */
function tickerOf(symbol: string): string {
  return symbol.replace(/x$/i, "").toUpperCase();
}

/** The company mark drawn in the current colour, or null when there is none. */
export function CompanyMark({ symbol, className }: { symbol: string; className?: string }) {
  const mark = MARKS[tickerOf(symbol)];
  if (!mark) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={mark.path} />
    </svg>
  );
}

/** A rounded tile carrying the token's company mark, sized by `size` in pixels. */
export function TokenAvatar({ symbol, size = 36, className }: { symbol: string; size?: number; className?: string }) {
  const ticker = tickerOf(symbol);
  const mark = MARKS[ticker];
  return (
    <span
      title={mark?.label ?? ticker}
      className={cn("inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]", className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: mark ? mark.bg : "linear-gradient(150deg, #23252b, #121316)",
      }}
    >
      {mark ? (
        <CompanyMark symbol={symbol} className="h-[56%] w-[56%]" />
      ) : (
        <span className="font-display leading-none tracking-[-0.02em]" style={{ fontSize: Math.round(size * (ticker.length > 3 ? 0.26 : 0.32)) }}>
          {ticker}
        </span>
      )}
    </span>
  );
}
