import "server-only";
import { cookies } from "next/headers";
import * as client from "openid-client";
import { getOidcConfig } from "./oidc";
import {
  SESSION_CHUNK_NAMES,
  SessionData,
  joinSessionCookie,
  sealSession,
  sessionCookieOptions,
  splitSessionCookie,
  unsealSession,
} from "./session";

// Refresh proactively — avoids a request racing a token that expires mid-flight.
const REFRESH_SKEW_MS = 30_000;

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5000";

async function refreshLocalSession(session: SessionData): Promise<SessionData> {
  const res = await fetch(`${BACKEND_URL}/auth/local/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Local auth refresh failed: ${res.status}`);
  }
  const tokens = await res.json();
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    provider: "local",
  };
}

/**
 * Returns a live access token for the current request, transparently refreshing
 * it (and re-sealing the session cookie) if it's near expiry. Returns null if
 * there's no session or the refresh fails (caller should treat as logged out).
 * Only usable from Route Handlers / Server Actions (needs a mutable cookie jar) —
 * middleware.ts has its own copy since next/headers' cookies() isn't available there.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const clearSession = () => SESSION_CHUNK_NAMES.forEach((name) => jar.delete(name));

  const session = await unsealSession(joinSessionCookie((name) => jar.get(name)?.value));
  if (!session) return null;

  if (session.expiresAt - REFRESH_SKEW_MS > Date.now()) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    clearSession();
    return null;
  }

  try {
    const refreshed: SessionData =
      session.provider === "local"
        ? await refreshLocalSession(session)
        : await (async () => {
            const config = await getOidcConfig();
            const tokens = await client.refreshTokenGrant(config, session.refreshToken!);
            return {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? session.refreshToken,
              expiresAt: Date.now() + (tokens.expiresIn() ?? 60) * 1000,
              provider: "keycloak" as const,
            };
          })();
    for (const chunk of splitSessionCookie(await sealSession(refreshed))) {
      jar.set(chunk.name, chunk.value, sessionCookieOptions);
    }
    return refreshed.accessToken;
  } catch (error) {
    console.error("Failed to refresh session", error);
    clearSession();
    return null;
  }
}
