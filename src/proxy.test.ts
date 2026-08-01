import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeOidcConfig, freezeTime, NOW, tokenResponse } from "../test/utils/oidcMocks";
import {
  SESSION_CHUNK_NAMES,
  type SessionData,
  joinSessionCookie,
  sealSession,
  splitSessionCookie,
  unsealSession,
} from "@/lib/auth/session";

const refreshTokenGrant = vi.fn();

vi.mock("openid-client", () => ({
  refreshTokenGrant: (...args: unknown[]) => refreshTokenGrant(...args),
}));

vi.mock("@/lib/auth/oidc", () => ({
  getOidcConfig: vi.fn(async () => fakeOidcConfig),
}));

const { config, proxy } = await import("./proxy");

/** Builds a NextRequest carrying the sealed session as chunked cookies. */
async function requestWithSession(path: string, session: SessionData | null) {
  const url = new URL(path, "http://localhost:3001");
  const headers = new Headers();
  if (session) {
    const cookie = splitSessionCookie(await sealSession(session))
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    headers.set("cookie", cookie);
  }
  return new NextRequest(url, { headers });
}

/** Reassembles and unseals the session the response wrote back. */
async function sessionFromResponse(res: Response) {
  const chunks = new Map(
    res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0].split("="))
      .filter(([name]) => name.startsWith("crm_session.")) as [string, string][],
  );
  return unsealSession(joinSessionCookie((name) => chunks.get(name)));
}

/** Cookie names a response clears (Max-Age=0 / empty value). */
function clearedCookies(res: Response) {
  return res.headers
    .getSetCookie()
    .filter((c) => /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c))
    .map((c) => c.split("=")[0]);
}

const liveSession = (): SessionData => ({
  accessToken: "live-access-token",
  refreshToken: "live-refresh-token",
  expiresAt: NOW + 5 * 60_000,
});

let restoreTime: () => void;

beforeEach(() => {
  restoreTime = freezeTime();
  refreshTokenGrant.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => restoreTime());

describe("proxy — matcher", () => {
  it("gates every authenticated (crm) route group path", () => {
    expect(config.matcher).toEqual([
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
    ]);
  });

  it("does not gate the public routes (landing, auth, capture, faq, api)", () => {
    const gated = config.matcher.map((m) => m.replace("/:path*", ""));
    for (const publicPath of ["/", "/auth", "/capture", "/faq", "/api"]) {
      expect(gated).not.toContain(publicPath);
    }
  });
});

describe("proxy — no session", () => {
  it.each(config.matcher.map((m) => m.replace("/:path*", "")))(
    "redirects %s to the login route",
    async (path) => {
      const res = await proxy(await requestWithSession(path, null));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/api/auth/login");
      expect(location.searchParams.get("returnTo")).toBe(path);
    },
  );

  it("preserves the query string in returnTo so the user lands back where they were", async () => {
    const res = await proxy(await requestWithSession("/leads?status=New&page=2", null));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("returnTo")).toBe("/leads?status=New&page=2");
  });

  it("does not attempt a token refresh", async () => {
    await proxy(await requestWithSession("/dashboard", null));
    expect(refreshTokenGrant).not.toHaveBeenCalled();
  });
});

describe("proxy — valid session", () => {
  it("passes the request through untouched", async () => {
    const res = await proxy(await requestWithSession("/dashboard", liveSession()));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
    expect(refreshTokenGrant).not.toHaveBeenCalled();
  });

  it("does not rewrite the session cookie when no refresh is needed", async () => {
    const res = await proxy(await requestWithSession("/dashboard", liveSession()));
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
});

describe("proxy — refresh skew boundary (30s)", () => {
  it("passes through when the token expires just outside the skew", async () => {
    const session = { ...liveSession(), expiresAt: NOW + 30_001 };
    const res = await proxy(await requestWithSession("/dashboard", session));
    expect(refreshTokenGrant).not.toHaveBeenCalled();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("refreshes when the token expires exactly at the skew boundary", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse());
    const session = { ...liveSession(), expiresAt: NOW + 30_000 };
    await proxy(await requestWithSession("/dashboard", session));
    expect(refreshTokenGrant).toHaveBeenCalledOnce();
  });

  it("refreshes an already-expired token", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse());
    const session = { ...liveSession(), expiresAt: NOW - 60_000 };
    await proxy(await requestWithSession("/dashboard", session));
    expect(refreshTokenGrant).toHaveBeenCalledWith(fakeOidcConfig, "live-refresh-token");
  });
});

describe("proxy — successful refresh", () => {
  const expiring = (): SessionData => ({ ...liveSession(), expiresAt: NOW - 1 });

  it("lets the request continue and re-seals the session cookie", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse());
    const res = await proxy(await requestWithSession("/dashboard", expiring()));

    expect(res.headers.get("x-middleware-next")).toBe("1");
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.length).toBeGreaterThan(0);
    expect(setCookies[0]).toMatch(/^crm_session\.0=/);
    expect(setCookies[0]).toContain("HttpOnly");
    expect(setCookies[0]).toContain("SameSite=lax");
  });

  it("does not put the raw access token in a cookie", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ access_token: "PLAINTEXT-TOKEN" }));
    const res = await proxy(await requestWithSession("/dashboard", expiring()));
    expect(res.headers.getSetCookie().join(";")).not.toContain("PLAINTEXT-TOKEN");
  });

  it("keeps the previous refresh token when the provider does not rotate it", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ refresh_token: undefined }));
    const res = await proxy(await requestWithSession("/dashboard", expiring()));

    expect(res.headers.get("x-middleware-next")).toBe("1");
    await expect(sessionFromResponse(res)).resolves.toMatchObject({
      refreshToken: "live-refresh-token",
    });
  });

  it("falls back to a 60s lifetime when the provider omits expires_in", async () => {
    refreshTokenGrant.mockResolvedValue(tokenResponse({ expiresIn: undefined }));
    const res = await proxy(await requestWithSession("/dashboard", expiring()));

    expect(res.headers.get("x-middleware-next")).toBe("1");
    await expect(sessionFromResponse(res)).resolves.toMatchObject({
      expiresAt: NOW + 60_000,
    });
  });

  it("stores the rotated token pair", async () => {
    refreshTokenGrant.mockResolvedValue(
      tokenResponse({ access_token: "rotated-access", refresh_token: "rotated-refresh" }),
    );
    const res = await proxy(await requestWithSession("/dashboard", expiring()));

    await expect(sessionFromResponse(res)).resolves.toEqual({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      expiresAt: NOW + 300_000,
    });
  });
});

describe("proxy — failed refresh", () => {
  const expiring = (): SessionData => ({ ...liveSession(), expiresAt: NOW - 1 });

  it("redirects to login and clears every session chunk", async () => {
    refreshTokenGrant.mockRejectedValue(new Error("invalid_grant"));
    const res = await proxy(await requestWithSession("/leads", expiring()));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/api/auth/login");
    expect(clearedCookies(res).sort()).toEqual([...SESSION_CHUNK_NAMES].sort());
  });

  it("redirects to login without calling the provider when there is no refresh token", async () => {
    const res = await proxy(
      await requestWithSession("/leads", { accessToken: "a", expiresAt: NOW - 1 }),
    );

    expect(refreshTokenGrant).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(clearedCookies(res).sort()).toEqual([...SESSION_CHUNK_NAMES].sort());
  });

  it("logs the failure rather than swallowing it", async () => {
    refreshTokenGrant.mockRejectedValue(new Error("keycloak down"));
    await proxy(await requestWithSession("/leads", expiring()));
    expect(console.error).toHaveBeenCalledWith(
      "Proxy failed to refresh Keycloak session",
      expect.any(Error),
    );
  });
});

describe("proxy — corrupt session cookie", () => {
  it("redirects to login when only a partial chunk survives", async () => {
    const url = new URL("/dashboard", "http://localhost:3001");
    const req = new NextRequest(url, {
      headers: new Headers({ cookie: "crm_session.0=truncated-garbage" }),
    });
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/api/auth/login");
  });
});
