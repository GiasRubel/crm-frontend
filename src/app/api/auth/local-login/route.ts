import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sealSession, sessionCookieOptions, splitSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5000";

/**
 * Fetch-based counterpart to /api/auth/login — that route redirects the
 * browser into Keycloak's hosted flow; this one exchanges email+password
 * directly against the backend's DB-backed local auth for organizations
 * that don't have SSO enabled, then seals the same session cookie shape.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const res = await fetch(`${BACKEND_URL}/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Invalid email or password" }));
    return NextResponse.json({ message: body.message ?? "Invalid email or password" }, { status: 401 });
  }

  const tokens = await res.json();
  const sealed = await sealSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    provider: "local",
  });

  const jar = await cookies();
  for (const chunk of splitSessionCookie(sealed)) {
    jar.set(chunk.name, chunk.value, sessionCookieOptions);
  }

  return NextResponse.json({ ok: true });
}
