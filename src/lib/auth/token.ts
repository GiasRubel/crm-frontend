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
    const config = await getOidcConfig();
    const tokens = await client.refreshTokenGrant(config, session.refreshToken);
    const refreshed: SessionData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + (tokens.expiresIn() ?? 60) * 1000,
    };
    for (const chunk of splitSessionCookie(await sealSession(refreshed))) {
      jar.set(chunk.name, chunk.value, sessionCookieOptions);
    }
    return refreshed.accessToken;
  } catch (error) {
    console.error("Failed to refresh Keycloak session", error);
    clearSession();
    return null;
  }
}
