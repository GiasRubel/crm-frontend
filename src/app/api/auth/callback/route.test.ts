import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar, type MockCookieJar } from "../../../../../test/utils/cookieJar";
import { fakeOidcConfig, freezeTime, NOW, tokenResponse } from "../../../../../test/utils/oidcMocks";
import {
  OAUTH_COOKIE_NAME,
  joinIdTokenCookie,
  joinSessionCookie,
  sealOAuthFlow,
  unsealIdToken,
  unsealSession,
} from "@/lib/auth/session";

let jar: MockCookieJar;
const authorizationCodeGrant = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("openid-client", () => ({
  authorizationCodeGrant: (...args: unknown[]) => authorizationCodeGrant(...args),
}));
vi.mock("@/lib/auth/oidc", () => ({ getOidcConfig: async () => fakeOidcConfig }));

const { GET } = await import("./route");

const CALLBACK = "http://localhost:3001/api/auth/callback?code=auth-code-123&state=test-state";

async function seedFlow(overrides: Partial<{ codeVerifier: string; state: string; returnTo: string }> = {}) {
  const flow = { codeVerifier: "test-code-verifier", state: "test-state", returnTo: "/dashboard", ...overrides };
  jar.seed({ [OAUTH_COOKIE_NAME]: await sealOAuthFlow(flow) });
  return flow;
}

const call = (url = CALLBACK) => GET(new NextRequest(new URL(url)));

const storedSession = () => unsealSession(joinSessionCookie((n) => jar.get(n)?.value));
const storedIdToken = () => unsealIdToken(joinIdTokenCookie((n) => jar.get(n)?.value));

let restoreTime: () => void;

beforeEach(() => {
  jar = createCookieJar();
  restoreTime = freezeTime();
  authorizationCodeGrant.mockReset();
  authorizationCodeGrant.mockResolvedValue(tokenResponse({ id_token: "the-id-token" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => restoreTime());

describe("GET /api/auth/callback — happy path", () => {
  it("exchanges the code using the stashed PKCE verifier and expected state", async () => {
    await seedFlow();
    await call();

    const [config, url, options] = authorizationCodeGrant.mock.calls[0];
    expect(config).toBe(fakeOidcConfig);
    expect(String(url)).toBe(CALLBACK);
    expect(options).toEqual({ pkceCodeVerifier: "test-code-verifier", expectedState: "test-state" });
  });

  it("seals the token pair into the session cookie", async () => {
    await seedFlow();
    await call();

    await expect(storedSession()).resolves.toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: NOW + 300_000,
    });
  });

  it("writes the session cookie httpOnly, so browser JS can never read the token", async () => {
    await seedFlow();
    await call();
    expect(jar.options.get("crm_session.0")).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("does not store the raw access token as a cookie value", async () => {
    authorizationCodeGrant.mockResolvedValue(tokenResponse({ access_token: "PLAINTEXT-TOKEN" }));
    await seedFlow();
    await call();
    expect([...jar.store.values()].join(";")).not.toContain("PLAINTEXT-TOKEN");
  });

  it("stores the id_token in a separate cookie scoped to the logout path", async () => {
    await seedFlow();
    await call();

    await expect(storedIdToken()).resolves.toBe("the-id-token");
    expect(jar.options.get("crm_id_token.0")).toMatchObject({ path: "/api/auth/logout", httpOnly: true });
  });

  it("skips the id_token cookie when the provider returns none", async () => {
    authorizationCodeGrant.mockResolvedValue(tokenResponse({ id_token: undefined }));
    await seedFlow();
    await call();
    expect(jar.get("crm_id_token.0")).toBeUndefined();
  });

  it("consumes the one-shot oauth flow cookie", async () => {
    await seedFlow();
    await call();
    expect(jar.deleted).toContain(OAUTH_COOKIE_NAME);
    expect(jar.get(OAUTH_COOKIE_NAME)).toBeUndefined();
  });

  it("redirects to the returnTo captured at login", async () => {
    await seedFlow({ returnTo: "/leads?status=New" });
    const res = await call();

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/leads");
    expect(location.searchParams.get("status")).toBe("New");
  });

  it("falls back to a 60s lifetime when the provider omits expires_in", async () => {
    authorizationCodeGrant.mockResolvedValue(tokenResponse({ expiresIn: undefined }));
    await seedFlow();
    await call();
    await expect(storedSession()).resolves.toMatchObject({ expiresAt: NOW + 60_000 });
  });
});

describe("GET /api/auth/callback — missing flow cookie", () => {
  it("redirects to the login page with session_expired and does not exchange the code", async () => {
    const res = await call();

    expect(authorizationCodeGrant).not.toHaveBeenCalled();
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("error")).toBe("session_expired");
  });

  it("does not create a session", async () => {
    await call();
    expect(jar.get("crm_session.0")).toBeUndefined();
  });
});

describe("GET /api/auth/callback — CSRF / state mismatch", () => {
  it("does not create a session when the grant rejects a mismatched state", async () => {
    // openid-client verifies expectedState against the callback URL and throws.
    authorizationCodeGrant.mockRejectedValue(new Error("unexpected state"));
    await seedFlow({ state: "the-real-state" });

    const res = await call("http://localhost:3001/api/auth/callback?code=x&state=attacker-state");

    expect(jar.get("crm_session.0")).toBeUndefined();
    expect(new URL(res.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });

  it("passes the state it stashed as expectedState rather than trusting the query", async () => {
    await seedFlow({ state: "the-real-state" });
    await call("http://localhost:3001/api/auth/callback?code=x&state=attacker-state");

    expect(authorizationCodeGrant.mock.calls[0][2]).toMatchObject({ expectedState: "the-real-state" });
  });

  it("still consumes the flow cookie so the code cannot be replayed", async () => {
    authorizationCodeGrant.mockRejectedValue(new Error("unexpected state"));
    await seedFlow();
    await call();
    expect(jar.deleted).toContain(OAUTH_COOKIE_NAME);
  });
});

describe("GET /api/auth/callback — token exchange failure", () => {
  it("redirects to the login page with auth_failed", async () => {
    authorizationCodeGrant.mockRejectedValue(new Error("invalid_grant"));
    await seedFlow();
    const res = await call();

    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("error")).toBe("auth_failed");
  });

  it("logs the failure", async () => {
    authorizationCodeGrant.mockRejectedValue(new Error("boom"));
    await seedFlow();
    await call();
    expect(console.error).toHaveBeenCalledWith("OIDC callback failed", expect.any(Error));
  });
});
