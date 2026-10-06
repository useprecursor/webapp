import type { Sandbox } from "./types";

/** The chain the app records to, from the environment. */
export const NETWORK: Sandbox["network"] = {
  name: process.env.NEXT_PUBLIC_CHAIN_NAME || "Robinhood Chain testnet",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 46630),
  explorer: process.env.NEXT_PUBLIC_CHAIN_EXPLORER || "",
};

export const CHAIN_RPC = process.env.NEXT_PUBLIC_CHAIN_RPC || "";
