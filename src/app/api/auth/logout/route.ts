import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/auth/oidc";
import {
  ID_TOKEN_CHUNK_NAMES,
  SESSION_CHUNK_NAMES,
  joinIdTokenCookie,
  joinSessionCookie,
  unsealIdToken,
  unsealSession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await unsealSession(joinSessionCookie((name) => jar.get(name)?.value));
  const idToken = await unsealIdToken(joinIdTokenCookie((name) => jar.get(name)?.value));

  SESSION_CHUNK_NAMES.forEach((name) => jar.delete(name));
  ID_TOKEN_CHUNK_NAMES.forEach((name) => jar.delete(name));

  // Built from APP_BASE_URL rather than new URL("/", req.url) — the latter always
  // appends a trailing slash, and Keycloak matches post-logout redirect URIs
  // exactly, so "http://localhost:3001/" fails against a configured
  // "http://localhost:3001". Normalized here so either env spelling works.
  const postLogoutUrl = String(process.env.APP_BASE_URL).replace(/\/+$/, "");

  // No session, or a local-auth one (there's no Keycloak IdP session for
  // those to begin with) — just clear cookies and go home. A Keycloak
  // session missing its id_token cookie still goes through end-session below
  // (just without the hint), since skipping it would leave the user's actual
  // Keycloak IdP session alive.
  if (!session || session.provider === "local") {
    return NextResponse.redirect(postLogoutUrl);
  }

  // id_token_hint is what lets Keycloak log the user out silently — without it
  // it can't identify the session and interrupts with a "Do you want to log
  // out?" confirmation page instead.
  const config = await getOidcConfig();
  const endSessionUrl = client.buildEndSessionUrl(config, {
    post_logout_redirect_uri: postLogoutUrl,
    ...(idToken ? { id_token_hint: idToken } : {}),
  });

  return NextResponse.redirect(endSessionUrl);
}
