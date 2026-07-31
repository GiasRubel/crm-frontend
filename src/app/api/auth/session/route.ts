import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth/token";

export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5000";

/**
 * The only "auth state" the browser ever fetches — never includes a token,
 * only what the UI needs to render (authenticated?, user profile, deployment mode).
 */
export async function GET() {
  const deploymentMode = await fetch(`${BACKEND_URL}/config`, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => data?.deploymentMode ?? "standalone")
    .catch(() => "standalone");

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ authenticated: false, user: null, deploymentMode });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      // Don't fail silently — a valid session cookie whose token the backend
      // rejects looks identical to "logged out" in the UI, which is very hard
      // to diagnose from the browser alone.
      console.error(
        `GET ${BACKEND_URL}/users/me returned ${res.status} for a valid session:`,
        await res.text().catch(() => "<unreadable body>"),
      );
      return NextResponse.json({ authenticated: false, user: null, deploymentMode });
    }
    const user = await res.json();
    return NextResponse.json({ authenticated: true, user, deploymentMode });
  } catch (error) {
    console.error("Failed to load user profile from backend", error);
    return NextResponse.json({ authenticated: false, user: null, deploymentMode });
  }
}
