import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getValidAccessToken = vi.fn();
vi.mock("@/lib/auth/token", () => ({ getValidAccessToken: () => getValidAccessToken() }));

const BACKEND = "http://backend.test:5000";
process.env.BACKEND_INTERNAL_URL = BACKEND;

const route = await import("./route");

/** What the backend replies with; overridden per test. */
let respond: () => Response;

function callFor(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  endpoint: string,
  init: RequestInit = {},
) {
  const url = new URL(`http://localhost:3001/api/backend${endpoint}`);
  const path = url.pathname.replace("/api/backend/", "").split("/");
  const req = new NextRequest(url, { method, ...init } as ConstructorParameters<typeof NextRequest>[1]);
  return route[method](req, { params: Promise.resolve({ path }) });
}

/** The single outbound fetch the proxy made. */
const outbound = () => vi.mocked(fetch).mock.calls[0];

beforeEach(() => {
  respond = () => Response.json({ ok: true });
  getValidAccessToken.mockResolvedValue("live-access-token");
  vi.stubGlobal("fetch", vi.fn(async () => respond()));
});

describe("BFF proxy — forwarding", () => {
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE"] as const)("forwards %s to the backend", async (method) => {
    await callFor(method, "/customers", method === "GET" || method === "DELETE" ? {} : { body: "{}" });
    expect(outbound()?.[1]?.method).toBe(method);
  });

  it("targets BACKEND_INTERNAL_URL with the backend's root path (no double /api)", async () => {
    await callFor("GET", "/customers");
    const target = new URL(String(outbound()?.[0]));
    expect(target.origin).toBe(BACKEND);
    expect(target.pathname).toBe("/customers");
  });

  it("preserves nested catch-all path segments", async () => {
    await callFor("GET", "/leads/abc123/engagements");
    expect(new URL(String(outbound()?.[0])).pathname).toBe("/leads/abc123/engagements");
  });

  it("preserves the query string", async () => {
    await callFor("GET", "/leads?status=New&page=2");
    const target = new URL(String(outbound()?.[0]));
    expect(target.searchParams.get("status")).toBe("New");
    expect(target.searchParams.get("page")).toBe("2");
  });

  it("never caches proxied responses", async () => {
    await callFor("GET", "/customers");
    expect(outbound()?.[1]?.cache).toBe("no-store");
  });
});

describe("BFF proxy — bearer token injection", () => {
  it("attaches the session's access token server-side", async () => {
    await callFor("GET", "/customers");
    expect(new Headers(outbound()?.[1]?.headers).get("authorization")).toBe("Bearer live-access-token");
  });

  it("sends no Authorization header when there is no session", async () => {
    getValidAccessToken.mockResolvedValue(null);
    await callFor("GET", "/customers");
    expect(new Headers(outbound()?.[1]?.headers).get("authorization")).toBeNull();
  });

  it("does not echo the token back to the browser", async () => {
    const res = await callFor("GET", "/customers");
    expect(JSON.stringify([...res.headers])).not.toContain("live-access-token");
    await expect(res.text()).resolves.not.toContain("live-access-token");
  });

  it("ignores an Authorization header supplied by the browser", async () => {
    await callFor("GET", "/customers", { headers: { authorization: "Bearer forged-token" } });
    expect(new Headers(outbound()?.[1]?.headers).get("authorization")).toBe("Bearer live-access-token");
  });
});

describe("BFF proxy — bodies and content type", () => {
  it("forwards the request body for POST", async () => {
    await callFor("POST", "/customers", {
      body: JSON.stringify({ name: "Acme" }),
      headers: { "content-type": "application/json" },
    });

    const init = outbound()?.[1];
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe('{"name":"Acme"}');
  });

  it("sends no body for GET", async () => {
    await callFor("GET", "/customers");
    expect(outbound()?.[1]?.body).toBeUndefined();
  });

  it("sends an empty body for DELETE (only GET/HEAD skip the body entirely)", async () => {
    await callFor("DELETE", "/customers/1");
    expect((outbound()?.[1]?.body as ArrayBuffer).byteLength).toBe(0);
  });

  it("omits content-type when the browser sent none", async () => {
    await callFor("GET", "/customers");
    expect(new Headers(outbound()?.[1]?.headers).get("content-type")).toBeNull();
  });
});

describe("BFF proxy — response passthrough", () => {
  it("streams the backend body and status back unchanged", async () => {
    respond = () => Response.json([{ id: "1" }], { status: 200 });
    const res = await callFor("GET", "/customers");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: "1" }]);
  });

  it("passes 204 No Content through with no body", async () => {
    respond = () => new Response(null, { status: 204 });
    const res = await callFor("DELETE", "/customers/1");

    expect(res.status).toBe(204);
    await expect(res.text()).resolves.toBe("");
  });

  it("passes 402 through so the UI can show the subscription lock", async () => {
    respond = () => Response.json({ message: "Subscription inactive" }, { status: 402 });
    const res = await callFor("GET", "/customers");

    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toEqual({ message: "Subscription inactive" });
  });

  it("passes 401 and 403 through rather than swallowing them", async () => {
    respond = () => Response.json({ message: "Unauthorized" }, { status: 401 });
    expect((await callFor("GET", "/customers")).status).toBe(401);

    respond = () => Response.json({ message: "Forbidden" }, { status: 403 });
    expect((await callFor("GET", "/customers")).status).toBe(403);
  });

  it("preserves class-validator 400 payloads so apiClient can flatten them", async () => {
    respond = () => Response.json({ message: ["name should not be empty"] }, { status: 400 });
    const res = await callFor("POST", "/customers", { body: "{}" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: ["name should not be empty"] });
  });

  it("keeps the backend's content-type on the way out (e.g. .ics downloads)", async () => {
    respond = () => new Response("BEGIN:VCALENDAR", { headers: { "content-type": "text/calendar" } });
    const res = await callFor("GET", "/activities/1/calendar.ics");

    expect(res.headers.get("content-type")).toBe("text/calendar");
    await expect(res.text()).resolves.toContain("BEGIN:VCALENDAR");
  });

  it("strips hop-by-hop headers that would corrupt the re-chunked body", async () => {
    respond = () =>
      new Response("{}", {
        headers: {
          "content-type": "application/json",
          "content-encoding": "gzip",
          connection: "keep-alive",
        },
      });
    const res = await callFor("GET", "/customers");

    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("transfer-encoding")).toBeNull();
    expect(res.headers.get("connection")).toBeNull();
  });
});
