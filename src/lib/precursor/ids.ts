import type { Address } from "./types";

/** A stable pseudo-address derived from a label, for contracts and identities created before deployment. */
export function addr(label: string): Address {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let out = "";
  for (let round = 0; out.length < 40; round++) {
    for (let i = 0; i < label.length; i++) {
      h1 = Math.imul(h1 ^ label.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ (label.charCodeAt(i) + round), 2246822519) >>> 0;
    }
    out += ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
    h1 = (h1 + 0x9e3779b9) >>> 0;
  }
  return `0x${out.slice(0, 40)}` as Address;
}

export function txHash(label: string): `0x${string}` {
  return `0x${addr(`${label}:a`).slice(2)}${addr(`${label}:b`).slice(2, 26)}` as `0x${string}`;
}

/** A sortable, collision-resistant id with a readable prefix. */
export function uid(prefix: string): string {
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "x";
}
