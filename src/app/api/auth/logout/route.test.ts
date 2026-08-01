import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar, type MockCookieJar } from "../../../../../test/utils/cookieJar";
import { fakeOidcConfig } from "../../../../../test/utils/oidcMocks";
import {
  ID_TOKEN_CHUNK_NAMES,
  SESSION_CHUNK_NAMES,
  sealIdToken,
  sealSession,
  splitIdTokenCookie,
  splitSessionCookie,
} from "@/lib/auth/session";

let jar: MockCookieJar;
const buildEndSessionUrl = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("openid-client", () => ({
  buildEndSessionUrl: (...args: unknown[]) => buildEndSessionUrl(...args),
}));
vi.mock("@/lib/auth/oidc", () => ({ getOidcConfig: async () => fakeOidcConfig }));

const { GET } = await import("./route");

const END_SESSION = "http://keycloak.test:8080/realms/crm/protocol/openid-connect/logout";

async function seedLoggedIn({ withIdToken = true } = {}) {
  jar.seed(splitSessionCookie(await sealSession({ accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 60_000 })));
  if (withIdToken) jar.seed(splitIdTokenCookie(await sealIdToken("the-id-token")));
}

beforeEach(() => {
  jar = createCookieJar();
  buildEndSessionUrl.mockImplementation((_config, params: Record<string, string>) => {
    const url = new URL(END_SESSION);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url;
  });
  process.env.APP_BASE_URL = "http://localhost:3001";
});

describe("GET /api/auth/logout — with a session", () => {
  it("clears every session and id_token chunk", async () => {
    await seedLoggedIn();
    await GET();

    for (const name of [...SESSION_CHUNK_NAMES, ...ID_TOKEN_CHUNK_NAMES]) {
      expect(jar.deleted).toContain(name);
    }
    expect(jar.store.size).toBe(0);
  });

  it("redirects through Keycloak's RP-initiated end-session endpoint", async () => {
    await seedLoggedIn();
    const res = await GET();

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe(
      "/realms/crm/protocol/openid-connect/logout",
    );
  });

  it("passes id_token_hint so Keycloak logs out silently instead of prompting", async () => {
    await seedLoggedIn();
    await GET();

    expect(buildEndSessionUrl.mock.calls[0][1]).toMatchObject({
      id_token_hint: "the-id-token",
      post_logout_redirect_uri: "http://localhost:3001",
    });
  });

  it("omits id_token_hint when the id_token cookie is missing", async () => {
    await seedLoggedIn({ withIdToken: false });
    await GET();

    expect(buildEndSessionUrl.mock.calls[0][1]).not.toHaveProperty("id_token_hint");
    expect(buildEndSessionUrl.mock.calls[0][1]).toMatchObject({
      post_logout_redirect_uri: "http://localhost:3001",
    });
  });

  it("omits id_token_hint when the id_token cookie is unreadable", async () => {
    await seedLoggedIn({ withIdToken: false });
    jar.seed({ "crm_id_token.0": "corrupt" });
    await GET();
    expect(buildEndSessionUrl.mock.calls[0][1]).not.toHaveProperty("id_token_hint");
  });
});

describe("GET /api/auth/logout — post-logout redirect URI", () => {
  it.each([
    ["http://localhost:3001", "http://localhost:3001"],
    ["http://localhost:3001/", "http://localhost:3001"],
    ["http://localhost:3001///", "http://localhost:3001"],
  ])(
    // Keycloak matches post-logout redirect URIs exactly, so a stray trailing
    // slash from the env var breaks logout.
    "normalises APP_BASE_URL %s to %s",
    async (configured, expected) => {
      process.env.APP_BASE_URL = configured;
      await seedLoggedIn();
      await GET();
      expect(buildEndSessionUrl.mock.calls[0][1]).toMatchObject({ post_logout_redirect_uri: expected });
    },
  );
});

describe("GET /api/auth/logout — no session", () => {
  it("redirects straight home without contacting Keycloak", async () => {
    const res = await GET();

    expect(buildEndSessionUrl).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("http://localhost:3001/");
  });

  it("still clears any stray cookie chunks", async () => {
    await GET();
    for (const name of [...SESSION_CHUNK_NAMES, ...ID_TOKEN_CHUNK_NAMES]) {
      expect(jar.deleted).toContain(name);
    }
  });

  it("normalises the home redirect from a trailing-slash APP_BASE_URL", async () => {
    process.env.APP_BASE_URL = "http://localhost:3001/";
    const res = await GET();
    expect(res.headers.get("location")).toBe("http://localhost:3001/");
  });
});
