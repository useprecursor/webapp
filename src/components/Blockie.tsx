import { cn } from "@/lib/utils";

/*
 * The blockies identicon that Ethereum wallets draw beside an address: an
 * 8 by 8 mirrored grid in three colours, seeded from the address so the same
 * address always gets the same picture. Same algorithm as ethereum-blockies.
 */
function makeRandom(seed: string) {
  const s = [0, 0, 0, 0];
  for (let i = 0; i < seed.length; i++) {
    s[i % 4] = (s[i % 4] << 5) - s[i % 4] + seed.charCodeAt(i);
  }
  return () => {
    const t = s[0] ^ (s[0] << 11);
    s[0] = s[1];
    s[1] = s[2];
    s[2] = s[3];
    s[3] = s[3] ^ (s[3] >> 19) ^ t ^ (t >> 8);
    return (s[3] >>> 0) / ((1 << 31) >>> 0);
  };
}

function blockie(seed: string, size = 8) {
  const rand = makeRandom(seed.toLowerCase());
  const color = () => {
    const h = Math.floor(rand() * 360);
    const s = rand() * 60 + 40;
    const l = (rand() + rand() + rand() + rand()) * 25;
    return `hsl(${h} ${s}% ${l}%)`;
  };
  const fg = color();
  const bg = color();
  const spot = color();
  const half = Math.ceil(size / 2);
  const cells: number[] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < half; x++) row.push(Math.floor(rand() * 2.3));
    const mirrored = row.slice(0, size - half).reverse();
    cells.push(...row, ...mirrored);
  }
  return { fg, bg, spot, cells, size };
}

export function Blockie({ address, className }: { address: string; className?: string }) {
  const { fg, bg, spot, cells, size } = blockie(address);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={cn("rounded-full", className)}
    >
      <rect width={size} height={size} fill={bg} />
      {cells.map((v, i) =>
        v === 0 ? null : <rect key={i} x={i % size} y={Math.floor(i / size)} width="1" height="1" fill={v === 1 ? fg : spot} />
      )}
    </svg>
  );
}
