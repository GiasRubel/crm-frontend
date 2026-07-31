import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/auth/oidc";
import {
  OAUTH_COOKIE_NAME,
  idTokenCookieOptions,
  sealIdToken,
  sealSession,
  sessionCookieOptions,
  splitIdTokenCookie,
  splitSessionCookie,
  unsealOAuthFlow,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const flow = await unsealOAuthFlow(jar.get(OAUTH_COOKIE_NAME)?.value);
  jar.delete(OAUTH_COOKIE_NAME);

  if (!flow) {
    return NextResponse.redirect(new URL("/auth/login?error=session_expired", req.url));
  }

  try {
    const config = await getOidcConfig();
    const tokens = await client.authorizationCodeGrant(config, new URL(req.url), {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
    });

    const sealed = await sealSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expiresIn() ?? 60) * 1000,
    });
    for (const chunk of splitSessionCookie(sealed)) {
      jar.set(chunk.name, chunk.value, sessionCookieOptions);
    }

    if (tokens.id_token) {
      for (const chunk of splitIdTokenCookie(await sealIdToken(tokens.id_token))) {
        jar.set(chunk.name, chunk.value, idTokenCookieOptions);
      }
    }

    return NextResponse.redirect(new URL(flow.returnTo, req.url));
  } catch (error) {
    console.error("OIDC callback failed", error);
    return NextResponse.redirect(new URL("/auth/login?error=auth_failed", req.url));
  }
}
