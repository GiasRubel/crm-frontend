import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar, type MockCookieJar } from "../../../../../test/utils/cookieJar";
import { fakeOidcConfig } from "../../../../../test/utils/oidcMocks";
import { OAUTH_COOKIE_NAME, unsealOAuthFlow } from "@/lib/auth/session";

let jar: MockCookieJar;
const buildAuthorizationUrl = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => jar }));

vi.mock("openid-client", () => ({
  randomPKCECodeVerifier: () => "test-code-verifier",
  // Distinct from the verifier on purpose: the challenge is a hash of it, and
  // the verifier itself must never reach the authorization URL.
  calculatePKCECodeChallenge: async () => "S256-hashed-challenge",
  randomState: () => "test-state",
  buildAuthorizationUrl: (...args: unknown[]) => buildAuthorizationUrl(...args),
}));

vi.mock("@/lib/auth/oidc", () => ({ getOidcConfig: async () => fakeOidcConfig }));

const { GET } = await import("./route");

const AUTH_ENDPOINT = "http://keycloak.test:8080/realms/crm/protocol/openid-connect/auth";

beforeEach(() => {
  jar = createCookieJar();
  buildAuthorizationUrl.mockImplementation((_config, params: Record<string, string>) => {
    const url = new URL(AUTH_ENDPOINT);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url;
  });
});

const call = (query = "") => GET(new NextRequest(new URL(`http://localhost:3001/api/auth/login${query}`)));

/** The sealed PKCE/state cookie the handler stashed for the callback to verify. */
const storedFlow = () => unsealOAuthFlow(jar.get(OAUTH_COOKIE_NAME)?.value);

describe("GET /api/auth/login", () => {
  it("redirects to Keycloak's authorization endpoint", async () => {
    const res = await call();
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe(
      "/realms/crm/protocol/openid-connect/auth",
    );
  });

  it("sends PKCE S256 parameters, the callback redirect_uri and the OIDC scopes", async () => {
    await call();
    const [config, params] = buildAuthorizationUrl.mock.calls[0];

    expect(config).toBe(fakeOidcConfig);
    expect(params).toMatchObject({
      redirect_uri: "http://localhost:3001/api/auth/callback",
      scope: "openid profile email",
      code_challenge: "S256-hashed-challenge",
      code_challenge_method: "S256",
      state: "test-state",
    });
  });

  it("never puts the raw code verifier on the authorization URL", async () => {
    const res = await call();
    expect(res.headers.get("location")).not.toContain("test-code-verifier");
  });

  it("stashes the verifier and state in a short-lived httpOnly cookie", async () => {
    await call();
    await expect(storedFlow()).resolves.toEqual({
      codeVerifier: "test-code-verifier",
      state: "test-state",
      returnTo: "/dashboard",
    });
    expect(jar.options.get(OAUTH_COOKIE_NAME)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
    });
  });

  it("defaults returnTo to /dashboard", async () => {
    await call();
    await expect(storedFlow()).resolves.toMatchObject({ returnTo: "/dashboard" });
  });

  it("carries returnTo (including its query string) through to the callback", async () => {
    await call("?returnTo=%2Fleads%3Fstatus%3DNew");
    await expect(storedFlow()).resolves.toMatchObject({ returnTo: "/leads?status=New" });
  });

  it.each(["google", "facebook"])("passes kc_idp_hint=%s for social login", async (provider) => {
    await call(`?idpHint=${provider}`);
    expect(buildAuthorizationUrl.mock.calls[0][1]).toMatchObject({ kc_idp_hint: provider });
  });

  it("omits kc_idp_hint when no provider is requested", async () => {
    await call();
    expect(buildAuthorizationUrl.mock.calls[0][1]).not.toHaveProperty("kc_idp_hint");
  });

  it("swaps the auth endpoint for the registration endpoint when register=true", async () => {
    const res = await call("?register=true");
    expect(new URL(res.headers.get("location")!).pathname).toBe(
      "/realms/crm/protocol/openid-connect/registrations",
    );
  });

  it("keeps the login endpoint for any other register value", async () => {
    const res = await call("?register=1");
    expect(new URL(res.headers.get("location")!).pathname).toMatch(/\/auth$/);
  });

  it("keeps the same PKCE params on the registration URL", async () => {
    await call("?register=true&returnTo=%2Fdashboard");
    expect(buildAuthorizationUrl.mock.calls[0][1]).toMatchObject({
      code_challenge_method: "S256",
      state: "test-state",
    });
  });
});
