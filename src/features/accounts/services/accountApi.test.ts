import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { accountApi } from "./accountApi";

describeApiContract("accountApi", [
  { name: "getAll -> GET /accounts", call: () => accountApi.getAll(), method: "GET", path: "/accounts" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      accountApi.getAll({
        page: 2,
        limit: 50,
        search: "acme",
        industry: "technology",
        size: "51-200",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
      }),
    method: "GET",
    path: "/accounts",
    query: {
      page: "2",
      limit: "50",
      search: "acme",
      industry: "technology",
      size: "51-200",
      status: "active",
      sortBy: "name",
      sortOrder: "asc",
    },
  },
  { name: "getStats -> GET /accounts/stats", call: () => accountApi.getStats(), method: "GET", path: "/accounts/stats" },
  { name: "getById -> GET /accounts/:id", call: () => accountApi.getById("a1"), method: "GET", path: "/accounts/a1" },
  {
    name: "getSummary -> GET /accounts/:id/summary (360-degree view)",
    call: () => accountApi.getSummary("a1"),
    method: "GET",
    path: "/accounts/a1/summary",
  },
  {
    name: "create -> POST /accounts",
    call: () => accountApi.create({ name: "Acme Inc", industry: "technology", size: "11-50" }),
    method: "POST",
    path: "/accounts",
    body: { name: "Acme Inc", industry: "technology", size: "11-50" },
  },
  {
    name: "update -> PATCH /accounts/:id",
    call: () => accountApi.update("a1", { annualRevenue: 1_000_000 }),
    method: "PATCH",
    path: "/accounts/a1",
    body: { annualRevenue: 1000000 },
  },
  {
    name: "assign -> PATCH /accounts/:id/assign",
    call: () => accountApi.assign("a1", { assignedTeamId: "t1" }),
    method: "PATCH",
    path: "/accounts/a1/assign",
    body: { assignedTeamId: "t1" },
  },
  {
    name: "delete -> DELETE /accounts/:id",
    call: () => accountApi.delete("a1"),
    method: "DELETE",
    path: "/accounts/a1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describe("accountApi — assignment semantics", () => {
  it("sends an explicit null to clear an owner (omitted would mean unchanged)", async () => {
    const req = await captureRequest(() => accountApi.assign("a1", { assignedToId: null }));
    expect(JSON.parse(req.body)).toEqual({ assignedToId: null });
  });
});
