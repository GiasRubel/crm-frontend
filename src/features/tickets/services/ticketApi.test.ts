import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { ticketApi } from "./ticketApi";

describeApiContract("ticketApi — staff helpdesk", [
  { name: "getAll -> GET /tickets", call: () => ticketApi.getAll(), method: "GET", path: "/tickets" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      ticketApi.getAll({
        page: 2,
        limit: 20,
        search: "login",
        status: "open",
        openOnly: "true",
        type: "problem",
        priority: "high",
        customerId: "c1",
        assignedToId: "u1",
        unassigned: "true",
        sortBy: "priority",
        sortOrder: "desc",
      }),
    method: "GET",
    path: "/tickets",
    query: {
      page: "2",
      limit: "20",
      search: "login",
      status: "open",
      openOnly: "true",
      type: "problem",
      priority: "high",
      customerId: "c1",
      assignedToId: "u1",
      unassigned: "true",
      sortBy: "priority",
      sortOrder: "desc",
    },
  },
  { name: "getStats -> GET /tickets/stats", call: () => ticketApi.getStats(), method: "GET", path: "/tickets/stats" },
  { name: "getById -> GET /tickets/:id", call: () => ticketApi.getById("t1"), method: "GET", path: "/tickets/t1" },
  {
    name: "create -> POST /tickets",
    call: () =>
      ticketApi.create({
        subject: "Cannot log in",
        description: "500 on submit",
        customerId: "c1",
        type: "problem",
        priority: "high",
      }),
    method: "POST",
    path: "/tickets",
    body: {
      subject: "Cannot log in",
      description: "500 on submit",
      customerId: "c1",
      type: "problem",
      priority: "high",
    },
  },
  {
    name: "update -> PATCH /tickets/:id",
    call: () => ticketApi.update("t1", { priority: "urgent", relatedArticleIds: ["kb1"] }),
    method: "PATCH",
    path: "/tickets/t1",
    body: { priority: "urgent", relatedArticleIds: ["kb1"] },
  },
  {
    name: "setStatus -> PATCH /tickets/:id/status wraps the bare status",
    call: () => ticketApi.setStatus("t1", "resolved"),
    method: "PATCH",
    path: "/tickets/t1/status",
    body: { status: "resolved" },
  },
  {
    name: "addComment -> POST /tickets/:id/comments",
    call: () => ticketApi.addComment("t1", { body: "Looking into it", isInternal: true }),
    method: "POST",
    path: "/tickets/t1/comments",
    body: { body: "Looking into it", isInternal: true },
  },
  {
    name: "assign -> PATCH /tickets/:id/assign",
    call: () => ticketApi.assign("t1", { assignedToId: "u1" }),
    method: "PATCH",
    path: "/tickets/t1/assign",
    body: { assignedToId: "u1" },
  },
  {
    name: "delete -> DELETE /tickets/:id",
    call: () => ticketApi.delete("t1"),
    method: "DELETE",
    path: "/tickets/t1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describeApiContract("ticketApi — customer portal", [
  {
    name: "getMy -> GET /tickets/my (never the staff list endpoint)",
    call: () => ticketApi.getMy(),
    method: "GET",
    path: "/tickets/my",
  },
  { name: "getMyById -> GET /tickets/my/:id", call: () => ticketApi.getMyById("t1"), method: "GET", path: "/tickets/my/t1" },
  {
    name: "createMy -> POST /tickets/my (no customerId — the server infers it)",
    call: () => ticketApi.createMy({ subject: "Help", description: "Broken", type: "question" }),
    method: "POST",
    path: "/tickets/my",
    body: { subject: "Help", description: "Broken", type: "question" },
  },
  {
    name: "addMyComment -> POST /tickets/my/:id/comments wraps the bare body",
    call: () => ticketApi.addMyComment("t1", "Any update?"),
    method: "POST",
    path: "/tickets/my/t1/comments",
    body: { body: "Any update?" },
  },
]);

describe("ticketApi — portal isolation", () => {
  it("a portal comment cannot be marked internal", async () => {
    const req = await captureRequest(() => ticketApi.addMyComment("t1", "hello"));
    expect(JSON.parse(req.body)).not.toHaveProperty("isInternal");
  });

  it("a portal create carries no customerId the caller could forge", async () => {
    const req = await captureRequest(() => ticketApi.createMy({ subject: "s", description: "d" }));
    expect(JSON.parse(req.body)).not.toHaveProperty("customerId");
  });
});
