import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { contactApi } from "./contactApi";

describeApiContract("contactApi", [
  { name: "getAll -> GET /contacts", call: () => contactApi.getAll(), method: "GET", path: "/contacts" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      contactApi.getAll({
        page: 2,
        limit: 20,
        search: "ann",
        accountId: "a1",
        preferredChannel: "email",
        doNotContact: "true",
        sortBy: "lastName",
        sortOrder: "asc",
      }),
    method: "GET",
    path: "/contacts",
    query: {
      page: "2",
      limit: "20",
      search: "ann",
      accountId: "a1",
      preferredChannel: "email",
      doNotContact: "true",
      sortBy: "lastName",
      sortOrder: "asc",
    },
  },
  { name: "getStats -> GET /contacts/stats", call: () => contactApi.getStats(), method: "GET", path: "/contacts/stats" },
  { name: "getById -> GET /contacts/:id", call: () => contactApi.getById("c1"), method: "GET", path: "/contacts/c1" },
  {
    name: "create -> POST /contacts",
    call: () =>
      contactApi.create({
        firstName: "Ann",
        lastName: "Bee",
        email: "a@b.com",
        accountId: "a1",
        isPrimary: true,
        preferredChannel: "email",
      }),
    method: "POST",
    path: "/contacts",
    body: {
      firstName: "Ann",
      lastName: "Bee",
      email: "a@b.com",
      accountId: "a1",
      isPrimary: true,
      preferredChannel: "email",
    },
  },
  {
    name: "update -> PATCH /contacts/:id",
    call: () => contactApi.update("c1", { doNotContact: true, emailOptIn: false }),
    method: "PATCH",
    path: "/contacts/c1",
    body: { doNotContact: true, emailOptIn: false },
  },
  {
    name: "addInteraction -> POST /contacts/:id/interactions",
    call: () =>
      contactApi.addInteraction("c1", { type: "call", direction: "outbound", subject: "Intro", note: "Went well" }),
    method: "POST",
    path: "/contacts/c1/interactions",
    body: { type: "call", direction: "outbound", subject: "Intro", note: "Went well" },
  },
  {
    name: "assign -> PATCH /contacts/:id/assign",
    call: () => contactApi.assign("c1", { assignedToId: "u1" }),
    method: "PATCH",
    path: "/contacts/c1/assign",
    body: { assignedToId: "u1" },
  },
  {
    name: "delete -> DELETE /contacts/:id",
    call: () => contactApi.delete("c1"),
    method: "DELETE",
    path: "/contacts/c1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describe("contactApi — account linkage", () => {
  it("sends an explicit null accountId to unlink the contact from its company", async () => {
    const req = await captureRequest(() => contactApi.update("c1", { accountId: null }));
    expect(JSON.parse(req.body)).toEqual({ accountId: null });
  });
});
