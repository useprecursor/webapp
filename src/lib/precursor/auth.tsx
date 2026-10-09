"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { PrivyProvider, useIdentityToken, usePrivy, useWallets } from "@privy-io/react-auth";
import { defineChain } from "viem";
import { CHAIN_RPC, NETWORK } from "./network";

/*
 * Sign-in through Privy: email or an existing wallet, with an
 * embedded wallet created for anyone who arrives without one. The server
 * verifies the access token on every request.
 */

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

const chain = defineChain({
  id: NETWORK.chainId,
  name: NETWORK.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: CHAIN_RPC ? [CHAIN_RPC] : [] } },
  blockExplorers: NETWORK.explorer ? { default: { name: "Explorer", url: NETWORK.explorer } } : undefined,
});

export interface Auth {
  ready: boolean;
  authenticated: boolean;
  email: string | null;
  wallet: string | null;
  login: () => void;
  logout: () => Promise<void>;
  /** Headers that authenticate a request to the Precursor API, empty when signed out. */
  headers: () => Promise<Record<string, string>>;
}

const Ctx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth needs an AuthProvider ancestor");
  return ctx;
}

function Session({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { wallets } = useWallets();

  const wallet = useMemo(() => {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    return (embedded ?? wallets[0])?.address ?? user?.wallet?.address ?? null;
  }, [wallets, user]);

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    if (!authenticated) return {};
    const token = await getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}`, ...(identityToken ? { "x-privy-id-token": identityToken } : {}) };
  }, [authenticated, getAccessToken, identityToken]);

  const value = useMemo<Auth>(
    () => ({ ready, authenticated, email: user?.email?.address ?? null, wallet, login, logout, headers }),
    [ready, authenticated, user, wallet, login, logout, headers]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: { theme: "dark", accentColor: "#e6ebf4", logo: "/images/logo-mark.png", walletChainType: "ethereum-only", landingHeader: "Sign in to Precursor" },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: chain,
        supportedChains: [chain],
      }}
    >
      <Session>{children}</Session>
    </PrivyProvider>
  );
}
