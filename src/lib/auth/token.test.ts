import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar, type MockCookieJar } from "../../../test/utils/cookieJar";
import { fakeOidcConfig, freezeTime, NOW, tokenResponse } from "../../../test/utils/oidcMocks";
import { SESSION_CHUNK_NAMES, type SessionData, sealSession, splitSessionCookie, unsealSession } from "./session";

let jar: MockCookieJar;
const refreshTokenGrant = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => jar,
}));

vi.mock("openid-client", () => ({
  refreshTokenGrant: (...args: unknown[]) => refreshTokenGrant(...args),
}));

vi.mock("./oidc", () => ({
  getOidcConfig: vi.fn(async () => fakeOidcConfig),
}));

const { getValidAccessToken } = await import("./token");

async function seedSession(session: SessionData) {
  jar.seed(splitSessionCookie(await sealSession(session)));
}

const liveSession = (): SessionData => ({
  accessToken: "live-access-token",
  refreshToken: "live-refresh-token",
  expiresAt: NOW + 5 * 60_000,
});

let restoreTime: () => void;

beforeEach(() => {
  jar = createCookieJar();
  restoreTime = freezeTime();
  refreshTokenGrant.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => restoreTime());

describe("getValidAccessToken — no session", () => {
  it("returns null when there is no session cookie", async () => {
    await expect(getValidAccessToken()).resolves.toBeNull();
    expect(refreshTokenGrant).not.toHaveBeenCalled();
  });

  it("returns null for an unreadable session cookie", async () => {
    jar.seed({ "crm_session.0": "garbage" });
    await expect(getValidAccessToken()).resolves.toBeNull();
  });
});

describe("getValidAccessToken — live token", () => {
  it("returns the stored access token without contacting Keycloak", async () => {
    await seedSession(liveSession());
    await expect(getValidAccessToken()).resolves.toBe("live-access-token");
    expect(refreshTokenGrant).not.toHaveBeenCalled();
  });

  it("leaves the session cookie untouched", async () => {
    await seedSession(liveSession());
    const before = new Map(jar.store);
    await getValidAccessToken();
    expect(jar.store).toEqual(before);
    expect(jar.deleted).toEqual([]);
  });

  it("does not refresh a token expiring just outside the 30s skew", async () => {
    await seedSession({ ...liveSession(), expiresAt: NOW + 30_001 });
    await expect(getValidAccessToken()).resolves.toBe("live-access-token");
    expect(refreshTokenGrant).not.toHaveBeenCalled();
  });
});

describe("getValidAccessToken — refresh", () => {
  const expiring = (): SessionData => ({ ...liveSession(), expiresAt: NOW + 30_000 });

  it("refreshes inside the skew and returns the new token", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ access_token: "fresh-token" }));
    await seedSession(expiring());

    await expect(getValidAccessToken()).resolves.toBe("fresh-token");
    expect(refreshTokenGrant).toHaveBeenCalledWith(fakeOidcConfig, "live-refresh-token");
  });

  it("re-seals the refreshed session back into the cookie jar", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ access_token: "fresh-token", refresh_token: "rotated" }));
    await seedSession(expiring());
    await getValidAccessToken();

    const rewritten = await unsealSession(jar.get("crm_session.0")?.value);
    expect(rewritten?.accessToken).toBe("fresh-token");
    expect(rewritten?.refreshToken).toBe("rotated");
    expect(rewritten?.expiresAt).toBe(NOW + 300_000);
  });

  it("writes the session cookie with httpOnly options", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse());
    await seedSession(expiring());
    await getValidAccessToken();

    expect(jar.options.get("crm_session.0")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("keeps the existing refresh token when the provider does not rotate it", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ refresh_token: undefined }));
    await seedSession(expiring());
    await getValidAccessToken();

    const rewritten = await unsealSession(jar.get("crm_session.0")?.value);
    expect(rewritten?.refreshToken).toBe("live-refresh-token");
  });

  it("defaults to a 60s lifetime when the provider omits expires_in", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ expiresIn: undefined }));
    await seedSession(expiring());
    await getValidAccessToken();

    const rewritten = await unsealSession(jar.get("crm_session.0")?.value);
    expect(rewritten?.expiresAt).toBe(NOW + 60_000);
  });
});

describe("getValidAccessToken — refresh failure", () => {
  it("clears every session chunk and returns null when the grant is rejected", async () => {
    refreshTokenGrant.mockRejectedValue(new Error("invalid_grant"));
    await seedSession({ ...liveSession(), expiresAt: NOW - 1 });

    await expect(getValidAccessToken()).resolves.toBeNull();
    expect(jar.deleted.sort()).toEqual([...SESSION_CHUNK_NAMES].sort());
  });

  it("logs the failure", async () => {
    refreshTokenGrant.mockRejectedValue(new Error("keycloak down"));
    await seedSession({ ...liveSession(), expiresAt: NOW - 1 });
    await getValidAccessToken();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to refresh Keycloak session",
      expect.any(Error),
    );
  });

  it("clears the session and returns null when an expired session has no refresh token", async () => {
    await seedSession({ accessToken: "stale", expiresAt: NOW - 1 });

    await expect(getValidAccessToken()).resolves.toBeNull();
    expect(refreshTokenGrant).not.toHaveBeenCalled();
    expect(jar.deleted.sort()).toEqual([...SESSION_CHUNK_NAMES].sort());
  });
});
