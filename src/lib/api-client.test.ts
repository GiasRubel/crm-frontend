import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError, apiClient, isSubscriptionLockedError } from "./api-client";

/** Runs a request expected to reject, returning the ApiError it threw. */
async function apiErrorFrom(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected the request to reject");
}

/** Captures the request msw saw so we can assert on URL/verb/headers/body. */
function capture(method: keyof typeof http, path: string, respond: () => Response) {
  const seen: { url?: URL; headers?: Headers; body?: string; method?: string } = {};
  server.use(
    http[method](path, async ({ request }) => {
      seen.url = new URL(request.url);
      seen.headers = request.headers;
      seen.method = request.method;
      seen.body = await request.text();
      return respond();
    }) as never,
  );
  return seen;
}

describe("apiClient — request shaping", () => {
  it("prefixes every endpoint with the /api/backend BFF proxy base", async () => {
    const seen = capture("get", "/api/backend/customers", () => HttpResponse.json([]));
    await apiClient.get("/customers");
    expect(seen.url?.pathname).toBe("/api/backend/customers");
  });

  it("does not double the /api segment for backend root paths", async () => {
    const seen = capture("get", "/api/backend/users", () => HttpResponse.json([]));
    await apiClient.get("/users");
    expect(seen.url?.pathname).not.toContain("/api/api");
    expect(seen.url?.pathname).toBe("/api/backend/users");
  });

  it("preserves query strings on the endpoint", async () => {
    const seen = capture("get", "/api/backend/leads", () => HttpResponse.json([]));
    await apiClient.get("/leads?status=New&page=2");
    expect(seen.url?.searchParams.get("status")).toBe("New");
    expect(seen.url?.searchParams.get("page")).toBe("2");
  });

  it("sends Content-Type: application/json by default", async () => {
    const seen = capture("get", "/api/backend/customers", () => HttpResponse.json([]));
    await apiClient.get("/customers");
    expect(seen.headers?.get("content-type")).toBe("application/json");
  });

  it("lets callers override headers", async () => {
    const seen = capture("get", "/api/backend/customers", () => HttpResponse.json([]));
    await apiClient.get("/customers", { headers: { "X-Trace": "abc", "Content-Type": "text/plain" } });
    expect(seen.headers?.get("x-trace")).toBe("abc");
    expect(seen.headers?.get("content-type")).toBe("text/plain");
  });

  it.each([
    ["post", "POST"],
    ["put", "PUT"],
    ["patch", "PATCH"],
  ] as const)("%s serialises the body as JSON and uses %s", async (verb, method) => {
    const seen = capture(verb, "/api/backend/customers", () => HttpResponse.json({ ok: true }));
    await apiClient[verb]("/customers", { name: "Acme", value: 10 });
    expect(seen.method).toBe(method);
    expect(seen.body).toBe(JSON.stringify({ name: "Acme", value: 10 }));
  });

  it("delete sends no body", async () => {
    const seen = capture("delete", "/api/backend/customers/1", () => new HttpResponse(null, { status: 204 }));
    await apiClient.delete("/customers/1");
    expect(seen.method).toBe("DELETE");
    expect(seen.body).toBe("");
  });
});

describe("apiClient — response handling", () => {
  it("returns the parsed JSON body", async () => {
    server.use(http.get("/api/backend/customers/1", () => HttpResponse.json({ id: "1", name: "Acme" })));
    await expect(apiClient.get("/customers/1")).resolves.toEqual({ id: "1", name: "Acme" });
  });

  it("returns undefined for 204 No Content instead of throwing on an empty body", async () => {
    server.use(http.delete("/api/backend/customers/1", () => new HttpResponse(null, { status: 204 })));
    await expect(apiClient.delete("/customers/1")).resolves.toBeUndefined();
  });
});

describe("apiClient — errors", () => {
  it("throws ApiError carrying the HTTP status", async () => {
    server.use(
      http.get("/api/backend/customers", () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
    );
    const err = await apiErrorFrom(apiClient.get("/customers"));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.name).toBe("ApiError");
  });

  it("flattens class-validator array messages to the first entry", async () => {
    server.use(
      http.post("/api/backend/customers", () =>
        HttpResponse.json(
          { message: ["email must be an email", "name should not be empty"], statusCode: 400 },
          { status: 400 },
        ),
      ),
    );
    const err = await apiErrorFrom(apiClient.post("/customers", {}));
    expect(err.message).toBe("email must be an email");
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    server.use(
      http.get("/api/backend/customers", () =>
        new HttpResponse("<html>502 Bad Gateway</html>", { status: 502 }),
      ),
    );
    const err = await apiErrorFrom(apiClient.get("/customers"));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.message).toBe("Something went wrong");
  });

  it("falls back to a generic message when the JSON body has no message field", async () => {
    server.use(
      http.get("/api/backend/customers", () => HttpResponse.json({}, { status: 500 })),
    );
    const err = await apiErrorFrom(apiClient.get("/customers"));
    expect(err.message).toBe("Something went wrong");
  });
});

describe("apiClient.getBlob", () => {
  it("returns the raw blob for non-JSON downloads", async () => {
    server.use(
      http.get("/api/backend/activities/1/calendar.ics", () =>
        new HttpResponse("BEGIN:VCALENDAR\nEND:VCALENDAR", {
          headers: { "Content-Type": "text/calendar" },
        }),
      ),
    );
    const blob = await apiClient.getBlob("/activities/1/calendar.ics");
    // `instanceof Blob` is unreliable here: undici's Blob comes from the Node
    // realm, not jsdom's. Assert on the contract instead.
    expect(blob.type).toBe("text/calendar");
    await expect(blob.text()).resolves.toContain("BEGIN:VCALENDAR");
  });

  it("does not force a JSON Content-Type on the request", async () => {
    const seen = capture("get", "/api/backend/export.ics", () => new HttpResponse("x"));
    await apiClient.getBlob("/export.ics");
    expect(seen.headers?.get("content-type")).toBeNull();
  });

  it("throws ApiError on a failed download", async () => {
    server.use(
      http.get("/api/backend/export.ics", () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 }),
      ),
    );
    const err = await apiErrorFrom(apiClient.getBlob("/export.ics"));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
  });
});

describe("isSubscriptionLockedError", () => {
  it("is true only for an ApiError with status 402", () => {
    expect(isSubscriptionLockedError(new ApiError(402, "Payment Required"))).toBe(true);
  });

  it("is false for other ApiError statuses", () => {
    expect(isSubscriptionLockedError(new ApiError(403, "Forbidden"))).toBe(false);
    expect(isSubscriptionLockedError(new ApiError(500, "boom"))).toBe(false);
  });

  it("is false for non-ApiError values", () => {
    expect(isSubscriptionLockedError(new Error("402"))).toBe(false);
    expect(isSubscriptionLockedError(null)).toBe(false);
    expect(isSubscriptionLockedError({ status: 402 })).toBe(false);
  });
});
