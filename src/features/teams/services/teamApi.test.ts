import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { teamApi } from "./teamApi";

describeApiContract("teamApi", [
  { name: "getAll -> GET /teams", call: () => teamApi.getAll(), method: "GET", path: "/teams" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      teamApi.getAll({ page: 2, limit: 10, search: "west", isActive: true, sortBy: "name", sortOrder: "asc" }),
    method: "GET",
    path: "/teams",
    query: { page: "2", limit: "10", search: "west", isActive: "true", sortBy: "name", sortOrder: "asc" },
  },
  { name: "getStats -> GET /teams/stats", call: () => teamApi.getStats(), method: "GET", path: "/teams/stats" },
  { name: "getMy -> GET /teams/my", call: () => teamApi.getMy(), method: "GET", path: "/teams/my" },
  { name: "getById -> GET /teams/:id", call: () => teamApi.getById("t1"), method: "GET", path: "/teams/t1" },
  {
    name: "create -> POST /teams",
    call: () =>
      teamApi.create({ name: "West", regions: ["CA", "OR"], memberIds: ["u1", "u2"], leaderId: "u1" }),
    method: "POST",
    path: "/teams",
    body: { name: "West", regions: ["CA", "OR"], memberIds: ["u1", "u2"], leaderId: "u1" },
  },
  {
    name: "update -> PATCH /teams/:id",
    call: () => teamApi.update("t1", { isActive: false }),
    method: "PATCH",
    path: "/teams/t1",
    body: { isActive: false },
  },
  {
    name: "delete -> DELETE /teams/:id",
    call: () => teamApi.delete("t1"),
    method: "DELETE",
    path: "/teams/t1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describe("teamApi — isActive filter tri-state", () => {
  it("sends isActive=false rather than dropping it as falsy", async () => {
    const req = await captureRequest(() => teamApi.getAll({ isActive: false }));
    expect(req.search.get("isActive")).toBe("false");
  });

  it('omits isActive for the "" (any) option', async () => {
    const req = await captureRequest(() => teamApi.getAll({ isActive: "" }));
    expect(req.search.has("isActive")).toBe(false);
  });

  it("omits isActive when undefined", async () => {
    const req = await captureRequest(() => teamApi.getAll({}));
    expect(req.search.has("isActive")).toBe(false);
  });
});

describe("teamApi — leader clearing", () => {
  it("sends an explicit null leaderId to remove the team leader", async () => {
    const req = await captureRequest(() => teamApi.update("t1", { leaderId: null }));
    expect(JSON.parse(req.body)).toEqual({ leaderId: null });
  });
});
