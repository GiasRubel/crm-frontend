import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/auth/oidc";
import {
  SESSION_CHUNK_NAMES,
  SessionData,
  joinSessionCookie,
  sealSession,
  sessionCookieOptions,
  splitSessionCookie,
  unsealSession,
} from "@/lib/auth/session";

// Refresh proactively — avoids a request racing a token that expires mid-flight.
const REFRESH_SKEW_MS = 30_000;

/**
 * Gates every (crm) route on a valid session cookie before the page ever
 * renders — this is what replaces the old client-side keycloak-js check-sso
 * dance (and its double-load quirk): auth state is now resolved server-side,
 * with no client round-trip needed to know if the user is logged in.
 */
export async function proxy(req: NextRequest) {
  const session = await unsealSession(
    joinSessionCookie((name) => req.cookies.get(name)?.value),
  );

  const loginUrl = new URL("/api/auth/login", req.url);
  loginUrl.searchParams.set("returnTo", req.nextUrl.pathname + req.nextUrl.search);

  const redirectToLogin = () => {
    const res = NextResponse.redirect(loginUrl);
    SESSION_CHUNK_NAMES.forEach((name) => res.cookies.delete(name));
    return res;
  };

  if (!session) {
    return NextResponse.redirect(loginUrl);
  }

  if (session.expiresAt - REFRESH_SKEW_MS > Date.now()) {
    return NextResponse.next();
  }

  if (!session.refreshToken) {
    return redirectToLogin();
  }

  try {
    const config = await getOidcConfig();
    const tokens = await client.refreshTokenGrant(config, session.refreshToken);
    const refreshed: SessionData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + (tokens.expiresIn() ?? 60) * 1000,
    };

    const res = NextResponse.next();
    for (const chunk of splitSessionCookie(await sealSession(refreshed))) {
      res.cookies.set(chunk.name, chunk.value, sessionCookieOptions);
    }
    return res;
  } catch (error) {
    console.error("Proxy failed to refresh Keycloak session", error);
    return redirectToLogin();
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/activities/:path*",
    "/automations/:path*",
    "/contacts/:path*",
    "/customers/:path*",
    "/kb/:path*",
    "/leads/:path*",
    "/opportunities/:path*",
    "/reports/:path*",
    "/teams/:path*",
    "/tickets/:path*",
    "/users/:path*",
  ],
};
