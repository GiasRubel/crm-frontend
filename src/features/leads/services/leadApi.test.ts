import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { leadApi } from "./leadApi";

describeApiContract("leadApi", [
  { name: "getAll -> GET /leads", call: () => leadApi.getAll(), method: "GET", path: "/leads" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      leadApi.getAll({
        page: 3,
        limit: 10,
        search: "acme",
        status: "qualified",
        source: "referral",
        rating: "hot",
        sortBy: "score",
        sortOrder: "desc",
      }),
    method: "GET",
    path: "/leads",
    query: {
      page: "3",
      limit: "10",
      search: "acme",
      status: "qualified",
      source: "referral",
      rating: "hot",
      sortBy: "score",
      sortOrder: "desc",
    },
  },
  { name: "getStats -> GET /leads/stats", call: () => leadApi.getStats(), method: "GET", path: "/leads/stats" },
  { name: "getById -> GET /leads/:id", call: () => leadApi.getById("l1"), method: "GET", path: "/leads/l1" },
  {
    name: "create -> POST /leads",
    call: () => leadApi.create({ firstName: "Ann", lastName: "Bee", email: "a@b.com", source: "manual" }),
    method: "POST",
    path: "/leads",
    body: { firstName: "Ann", lastName: "Bee", email: "a@b.com", source: "manual" },
  },
  {
    name: "capture -> POST /leads/capture (public endpoint)",
    call: () =>
      leadApi.capture({ firstName: "Ann", lastName: "Bee", email: "a@b.com", source: "web_form", website: "" }),
    method: "POST",
    path: "/leads/capture",
    body: { firstName: "Ann", lastName: "Bee", email: "a@b.com", source: "web_form", website: "" },
  },
  {
    name: "update -> PATCH /leads/:id",
    call: () => leadApi.update("l1", { status: "contacted" }),
    method: "PATCH",
    path: "/leads/l1",
    body: { status: "contacted" },
  },
  {
    name: "addEngagement -> POST /leads/:id/engagements",
    call: () => leadApi.addEngagement("l1", { type: "call", note: "left voicemail", points: 5 }),
    method: "POST",
    path: "/leads/l1/engagements",
    body: { type: "call", note: "left voicemail", points: 5 },
  },
  {
    name: "assign -> PATCH /leads/:id/assign",
    call: () => leadApi.assign("l1", { assignedToId: "u1" }),
    method: "PATCH",
    path: "/leads/l1/assign",
    body: { assignedToId: "u1" },
  },
  {
    name: "convert -> POST /leads/:id/convert",
    call: () =>
      leadApi.convert("l1", {
        phone: "555",
        createOpportunity: true,
        opportunityName: "Acme deal",
        amount: 5000,
        stage: "discovery",
      }),
    method: "POST",
    path: "/leads/l1/convert",
    body: {
      phone: "555",
      createOpportunity: true,
      opportunityName: "Acme deal",
      amount: 5000,
      stage: "discovery",
    },
  },
  {
    name: "convert without an opportunity",
    call: () => leadApi.convert("l1", { createOpportunity: false }),
    method: "POST",
    path: "/leads/l1/convert",
    body: { createOpportunity: false },
  },
  {
    name: "delete -> DELETE /leads/:id",
    call: () => leadApi.delete("l1"),
    method: "DELETE",
    path: "/leads/l1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describe("leadApi — capture honeypot", () => {
  it("sends the honeypot field verbatim so the backend can drop bot submissions", async () => {
    const req = await captureRequest(() =>
      leadApi.capture({ firstName: "Bot", lastName: "Net", email: "b@n.com", website: "http://spam" }),
    );
    expect(JSON.parse(req.body).website).toBe("http://spam");
  });
});

describe("leadApi — query string construction", () => {
  it("omits blank filters", async () => {
    const req = await captureRequest(() =>
      leadApi.getAll({ search: "  ", status: "", source: "", rating: "" }),
    );
    expect(req.search.toString()).toBe("");
  });
});
