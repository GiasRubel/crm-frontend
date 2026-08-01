import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { opportunityApi } from "./opportunityApi";

describeApiContract("opportunityApi", [
  { name: "getAll -> GET /opportunities", call: () => opportunityApi.getAll(), method: "GET", path: "/opportunities" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      opportunityApi.getAll({
        page: 2,
        limit: 15,
        search: "acme",
        stage: "proposal",
        customerId: "c1",
        accountId: "a1",
        sortBy: "amount",
        sortOrder: "desc",
      }),
    method: "GET",
    path: "/opportunities",
    query: {
      page: "2",
      limit: "15",
      search: "acme",
      stage: "proposal",
      customerId: "c1",
      accountId: "a1",
      sortBy: "amount",
      sortOrder: "desc",
    },
  },
  {
    name: "getBoard -> GET /opportunities/board (Kanban)",
    call: () => opportunityApi.getBoard(),
    method: "GET",
    path: "/opportunities/board",
  },
  { name: "getStats -> GET /opportunities/stats", call: () => opportunityApi.getStats(), method: "GET", path: "/opportunities/stats" },
  { name: "getById -> GET /opportunities/:id", call: () => opportunityApi.getById("o1"), method: "GET", path: "/opportunities/o1" },
  {
    name: "create -> POST /opportunities",
    call: () =>
      opportunityApi.create({
        name: "Acme renewal",
        customerId: "c1",
        amount: 25_000,
        stage: "discovery",
        probability: 20,
      }),
    method: "POST",
    path: "/opportunities",
    body: { name: "Acme renewal", customerId: "c1", amount: 25000, stage: "discovery", probability: 20 },
  },
  {
    name: "update -> PATCH /opportunities/:id",
    call: () => opportunityApi.update("o1", { amount: 30_000 }),
    method: "PATCH",
    path: "/opportunities/o1",
    body: { amount: 30000 },
  },
  {
    name: "moveStage -> PATCH /opportunities/:id/stage",
    call: () => opportunityApi.moveStage("o1", { stage: "negotiation" }),
    method: "PATCH",
    path: "/opportunities/o1/stage",
    body: { stage: "negotiation" },
  },
  {
    name: "moveStage to closed_lost carries the required lostReason",
    call: () => opportunityApi.moveStage("o1", { stage: "closed_lost", lostReason: "Price" }),
    method: "PATCH",
    path: "/opportunities/o1/stage",
    body: { stage: "closed_lost", lostReason: "Price" },
  },
  {
    name: "assign -> PATCH /opportunities/:id/assign",
    call: () => opportunityApi.assign("o1", { assignedToId: "u1" }),
    method: "PATCH",
    path: "/opportunities/o1/assign",
    body: { assignedToId: "u1" },
  },
  {
    name: "delete -> DELETE /opportunities/:id",
    call: () => opportunityApi.delete("o1"),
    method: "DELETE",
    path: "/opportunities/o1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describe("opportunityApi — account linkage", () => {
  it("sends an explicit null accountId to unlink the deal from its company", async () => {
    const req = await captureRequest(() => opportunityApi.update("o1", { accountId: null }));
    expect(JSON.parse(req.body)).toEqual({ accountId: null });
  });
});
