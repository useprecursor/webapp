"use client";

import { AuthProvider, PRIVY_APP_ID } from "@/lib/precursor/auth";
import { SandboxProvider, useIsClient } from "@/lib/precursor/store";
import { AppShell } from "./AppShell";
import { Splash } from "./Onboarding";

/** Mounts sign-in and the shared state in the browser only, since Privy runs client-side. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="flex min-h-screen bg-canvas">
        <Splash />
      </div>
    );
  }
  if (!PRIVY_APP_ID) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="card max-w-[480px] p-8">
          <h1 className="text-[24px]">Sign-in is not configured</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-tide">
            Set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET in .env, then restart the server. The values are in your Privy dashboard under App settings.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AuthProvider>
      <SandboxProvider>
        <AppShell>{children}</AppShell>
      </SandboxProvider>
    </AuthProvider>
  );
}
