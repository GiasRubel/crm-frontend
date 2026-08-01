import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { customerApi } from "./customerApi";

describeApiContract("customerApi", [
  { name: "getAll -> GET /customers", call: () => customerApi.getAll(), method: "GET", path: "/customers" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      customerApi.getAll({
        page: 2,
        limit: 25,
        search: "acme",
        status: "active",
        sortBy: "lastName",
        sortOrder: "desc",
      }),
    method: "GET",
    path: "/customers",
    query: { page: "2", limit: "25", search: "acme", status: "active", sortBy: "lastName", sortOrder: "desc" },
  },
  { name: "getStats -> GET /customers/stats", call: () => customerApi.getStats(), method: "GET", path: "/customers/stats" },
  { name: "getById -> GET /customers/:id", call: () => customerApi.getById("c1"), method: "GET", path: "/customers/c1" },
  { name: "getMe -> GET /customers/me", call: () => customerApi.getMe(), method: "GET", path: "/customers/me" },
  {
    name: "create -> POST /customers",
    call: () =>
      customerApi.create({ email: "a@b.com", firstName: "Ann", lastName: "Bee", phone: "555" }),
    method: "POST",
    path: "/customers",
    body: { email: "a@b.com", firstName: "Ann", lastName: "Bee", phone: "555" },
  },
  {
    name: "update -> PATCH /customers/:id",
    call: () => customerApi.update("c1", { status: "inactive" }),
    method: "PATCH",
    path: "/customers/c1",
    body: { status: "inactive" },
  },
  {
    name: "assign -> PATCH /customers/:id/assign",
    call: () => customerApi.assign("c1", { assignedToId: "u1", assignedTeamId: null }),
    method: "PATCH",
    path: "/customers/c1/assign",
    body: { assignedToId: "u1", assignedTeamId: null },
  },
  {
    name: "delete -> DELETE /customers/:id",
    call: () => customerApi.delete("c1"),
    method: "DELETE",
    path: "/customers/c1",
    respond: () => new Response(null, { status: 204 }),
  },
  {
    name: "resendInvitation -> POST /customers/:id/resend",
    call: () => customerApi.resendInvitation("c1"),
    method: "POST",
    path: "/customers/c1/resend",
    body: {},
  },
]);

describe("customerApi — query string construction", () => {
  it("omits empty and zero-ish values rather than sending blanks", async () => {
    const req = await captureRequest(() =>
      customerApi.getAll({ page: 0, limit: 0, search: "", status: "", sortOrder: undefined }),
    );
    expect(req.search.toString()).toBe("");
  });

  it("trims whitespace around the search term", async () => {
    const req = await captureRequest(() => customerApi.getAll({ search: "  acme  " }));
    expect(req.search.get("search")).toBe("acme");
  });

  it("drops a whitespace-only search term", async () => {
    const req = await captureRequest(() => customerApi.getAll({ search: "   " }));
    expect(req.search.has("search")).toBe(false);
  });

  it("url-encodes special characters in the search term", async () => {
    const req = await captureRequest(() => customerApi.getAll({ search: "a&b c=d" }));
    expect(req.search.get("search")).toBe("a&b c=d");
  });
});
