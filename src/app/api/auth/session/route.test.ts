import { beforeEach, describe, expect, it, vi } from "vitest";

const getValidAccessToken = vi.fn();
vi.mock("@/lib/auth/token", () => ({ getValidAccessToken: () => getValidAccessToken() }));

const BACKEND = "http://backend.test:5000";
process.env.BACKEND_INTERNAL_URL = BACKEND;

const { GET } = await import("./route");

const profile = {
  id: "u1",
  keycloakId: "kc-1",
  email: "admin@example.com",
  username: "admin",
  firstName: "Ada",
  lastName: "Admin",
  role: "Admin",
};

/** Routes each outbound backend call to a per-test responder. */
let routes: Record<string, () => Response | Promise<Response>>;

beforeEach(() => {
  routes = {
    "/config": () => Response.json({ deploymentMode: "standalone" }),
    "/users/me": () => Response.json(profile),
  };
  getValidAccessToken.mockResolvedValue("live-access-token");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input).replace(BACKEND, "");
      const handler = routes[path];
      if (!handler) throw new Error(`Unexpected backend call: ${input}`);
      return handler();
    }),
  );
});

describe("GET /api/auth/session — authenticated", () => {
  it("returns the profile, authenticated flag and deployment mode", async () => {
    await expect((await GET()).json()).resolves.toEqual({
      authenticated: true,
      user: profile,
      deploymentMode: "standalone",
    });
  });

  it("never leaks the access token to the browser", async () => {
    const body = await (await GET()).text();
    expect(body).not.toContain("live-access-token");
    expect(JSON.parse(body)).not.toHaveProperty("accessToken");
  });

  it("forwards the bearer token to the backend profile endpoint", async () => {
    await GET();
    const init = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith("/users/me"))?.[1];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer live-access-token");
    expect(init?.cache).toBe("no-store");
  });

  it("reports saas deployment mode from the backend config endpoint", async () => {
    routes["/config"] = () => Response.json({ deploymentMode: "saas" });
    await expect((await GET()).json()).resolves.toMatchObject({ deploymentMode: "saas" });
  });
});

describe("GET /api/auth/session — anonymous", () => {
  it("reports authenticated: false without calling the backend profile endpoint", async () => {
    getValidAccessToken.mockResolvedValue(null);

    await expect((await GET()).json()).resolves.toEqual({
      authenticated: false,
      user: null,
      deploymentMode: "standalone",
    });
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/users/me"))).toBe(false);
  });

  it("still reports the deployment mode so the landing page can render billing UI", async () => {
    getValidAccessToken.mockResolvedValue(null);
    routes["/config"] = () => Response.json({ deploymentMode: "saas" });
    await expect((await GET()).json()).resolves.toMatchObject({ deploymentMode: "saas" });
  });
});

describe("GET /api/auth/session — deployment mode fallbacks", () => {
  it("defaults to standalone when /config is unreachable", async () => {
    routes["/config"] = () => {
      throw new Error("ECONNREFUSED");
    };
    await expect((await GET()).json()).resolves.toMatchObject({ deploymentMode: "standalone" });
  });

  it("defaults to standalone when /config returns a non-2xx", async () => {
    routes["/config"] = () => new Response("nope", { status: 500 });
    await expect((await GET()).json()).resolves.toMatchObject({ deploymentMode: "standalone" });
  });

  it("defaults to standalone when /config omits deploymentMode", async () => {
    routes["/config"] = () => Response.json({});
    await expect((await GET()).json()).resolves.toMatchObject({ deploymentMode: "standalone" });
  });
});

describe("GET /api/auth/session — backend rejects a valid session", () => {
  it("reports logged out rather than crashing when /users/me is a 401", async () => {
    routes["/users/me"] = () => new Response("Unauthorized", { status: 401 });

    await expect((await GET()).json()).resolves.toEqual({
      authenticated: false,
      user: null,
      deploymentMode: "standalone",
    });
  });

  it("logs the status and body — a silently 'logged out' UI is hard to diagnose", async () => {
    routes["/users/me"] = () => new Response("user not provisioned", { status: 403 });
    await GET();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("returned 403"),
      "user not provisioned",
    );
  });

  it("reports logged out when the profile call throws", async () => {
    routes["/users/me"] = () => {
      throw new Error("ECONNRESET");
    };

    await expect((await GET()).json()).resolves.toMatchObject({ authenticated: false, user: null });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load user profile from backend",
      expect.any(Error),
    );
  });
});
