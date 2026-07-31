import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/auth/oidc";
import { OAUTH_COOKIE_NAME, oauthCookieOptions, sealOAuthFlow } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Starts the Authorization Code + PKCE flow. Query params:
 * - returnTo: path to land on after callback (default /dashboard)
 * - register: "true" to hit Keycloak's registration form instead of login
 * - idpHint: "google" | "facebook" to skip straight to a social provider
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";
  const idpHint = searchParams.get("idpHint");
  const register = searchParams.get("register") === "true";

  const config = await getOidcConfig();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const params: Record<string, string> = {
    redirect_uri: `${process.env.APP_BASE_URL}/api/auth/callback`,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  };
  if (idpHint) params.kc_idp_hint = idpHint;

  const authUrl = client.buildAuthorizationUrl(config, params);
  if (register) {
    // Mirrors keycloak-js's register(): same params, Keycloak's registration
    // endpoint instead of the login endpoint.
    authUrl.pathname = authUrl.pathname.replace(/\/auth$/, "/registrations");
  }

  const jar = await cookies();
  jar.set(OAUTH_COOKIE_NAME, await sealOAuthFlow({ codeVerifier, state, returnTo }), oauthCookieOptions);

  return NextResponse.redirect(authUrl);
}
