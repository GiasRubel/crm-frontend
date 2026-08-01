import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { kbApi } from "./kbApi";

describeApiContract("kbApi — staff wiki", [
  { name: "getAll -> GET /kb", call: () => kbApi.getAll(), method: "GET", path: "/kb" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      kbApi.getAll({
        page: 2,
        limit: 10,
        search: "reset",
        category: "Billing",
        status: "published",
        visibility: "public",
        sortBy: "views",
        sortOrder: "desc",
      }),
    method: "GET",
    path: "/kb",
    query: {
      page: "2",
      limit: "10",
      search: "reset",
      category: "Billing",
      status: "published",
      visibility: "public",
      sortBy: "views",
      sortOrder: "desc",
    },
  },
  { name: "getStats -> GET /kb/stats", call: () => kbApi.getStats(), method: "GET", path: "/kb/stats" },
  { name: "getById -> GET /kb/:id", call: () => kbApi.getById("k1"), method: "GET", path: "/kb/k1" },
  {
    name: "create -> POST /kb",
    call: () =>
      kbApi.create({
        title: "Password reset",
        body: "Steps...",
        category: "Account",
        tags: ["auth"],
        status: "draft",
        visibility: "internal",
      }),
    method: "POST",
    path: "/kb",
    body: {
      title: "Password reset",
      body: "Steps...",
      category: "Account",
      tags: ["auth"],
      status: "draft",
      visibility: "internal",
    },
  },
  {
    name: "update -> PATCH /kb/:id",
    call: () => kbApi.update("k1", { status: "published", visibility: "public" }),
    method: "PATCH",
    path: "/kb/k1",
    body: { status: "published", visibility: "public" },
  },
  {
    name: "delete -> DELETE /kb/:id",
    call: () => kbApi.delete("k1"),
    method: "DELETE",
    path: "/kb/k1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describeApiContract("kbApi — public help centre", [
  {
    name: "getPublic -> GET /kb/public with no filters",
    call: () => kbApi.getPublic(),
    method: "GET",
    path: "/kb/public",
    respond: () => Response.json([]),
  },
  {
    name: "getPublic passes search and category",
    call: () => kbApi.getPublic("reset", "Account"),
    method: "GET",
    path: "/kb/public",
    query: { search: "reset", category: "Account" },
    respond: () => Response.json([]),
  },
  {
    name: "getPublicBySlug -> GET /kb/public/:slug",
    call: () => kbApi.getPublicBySlug("password-reset"),
    method: "GET",
    path: "/kb/public/password-reset",
  },
  {
    name: "sendFeedback -> POST /kb/public/:id/feedback",
    call: () => kbApi.sendFeedback("k1", true),
    method: "POST",
    path: "/kb/public/k1/feedback",
    body: { helpful: true },
  },
]);

describe("kbApi — public query trimming", () => {
  it("trims search and category", async () => {
    const req = await captureRequest(() => kbApi.getPublic("  reset  ", "  Account  "), () =>
      Response.json([]),
    );
    expect(Object.fromEntries(req.search)).toEqual({ search: "reset", category: "Account" });
  });

  it("drops whitespace-only values", async () => {
    const req = await captureRequest(() => kbApi.getPublic("   ", "  "), () => Response.json([]));
    expect(req.search.toString()).toBe("");
  });

  it("sends helpful: false for a negative rating", async () => {
    const req = await captureRequest(() => kbApi.sendFeedback("k1", false));
    expect(JSON.parse(req.body)).toEqual({ helpful: false });
  });
});
