import { PrivyClient, type User } from "@privy-io/server-auth";
import { ApiError } from "./http";

/** The signed-in user behind a request, as Privy knows them. */
export interface Actor {
  userId: string;
  email: string | null;
  /** Lowercased wallet addresses linked to the Privy account. */
  wallets: string[];
}

let client: PrivyClient | null = null;
function privy(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) throw new ApiError("Set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET on the server.", 500);
  client ??= new PrivyClient(appId, secret);
  return client;
}

// Privy's user lookup is rate limited, so a profile is reused for a few minutes.
const cache = new Map<string, { actor: Actor; until: number }>();
const TTL = 5 * 60_000;

function toActor(user: User): Actor {
  const wallets = new Set<string>();
  if (user.wallet?.address) wallets.add(user.wallet.address.toLowerCase());
  for (const a of user.linkedAccounts) {
    if (a.type === "wallet" && "address" in a && typeof a.address === "string" && a.address.startsWith("0x")) wallets.add(a.address.toLowerCase());
  }
  return { userId: user.id, email: user.email?.address ?? user.google?.email ?? null, wallets: [...wallets] };
}

/**
 * Verifies the Privy access token on a request. Returns null when the request
 * carries no token, and throws when it carries one that does not verify.
 */
export async function actorFrom(req: Request): Promise<Actor | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  let userId: string;
  try {
    userId = (await privy().verifyAuthToken(token)).userId;
  } catch {
    throw new ApiError("Your session has expired. Sign in again.", 401);
  }

  const idToken = req.headers.get("x-privy-id-token");
  const hit = cache.get(userId);
  // A fresh identity token can carry newly linked wallets, so it always wins over the cache.
  if (hit && hit.until > Date.now() && !idToken) return hit.actor;

  let user: User;
  try {
    user = idToken ? await privy().getUser({ idToken }) : await privy().getUserById(userId);
  } catch {
    user = await privy().getUserById(userId);
  }
  if (user.id !== userId) throw new ApiError("The identity token does not match the session.", 401);
  const actor = toActor(user);
  cache.set(userId, { actor, until: Date.now() + TTL });
  return actor;
}
