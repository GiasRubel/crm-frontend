import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useContacts } from "./useContacts";

const contact = { id: "c1", firstName: "Ann", lastName: "Bee", email: "a@b.com", accountId: "a1" };
const list = { data: [contact], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, primary: 1, doNotContact: 0, newThisMonth: 1 };

function mockBase() {
  server.use(
    http.get("/api/backend/contacts", () => HttpResponse.json(list)),
    http.get("/api/backend/contacts/stats", () => HttpResponse.json(stats)),
  );
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useContacts({}));
  await waitFor(() => expect(harness.result.current.contactsQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useContacts — queries", () => {
  it("loads contacts and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.contactsQuery.data?.data[0].email).toBe("a@b.com");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("scopes the list to an account when accountId is set", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/contacts", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/contacts/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useContacts({ accountId: "a1" }));
    await waitFor(() => expect(result.current.contactsQuery.isSuccess).toBe(true));
    expect(seen?.searchParams.get("accountId")).toBe("a1");
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/contacts", () => HttpResponse.json({ message: "Nope" }, { status: 500 })),
      http.get("/api/backend/contacts/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useContacts({}));
    await waitFor(() => expect(result.current.contactsQuery.isError).toBe(true));
    expect((result.current.contactsQuery.error as ApiError).status).toBe(500);
  });
});

describe("useContacts — mutations", () => {
  it("createContact invalidates contacts AND accounts — the account's contact count changes", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/contacts", () => HttpResponse.json(contact)));

    await act(async () => {
      await harness.result.current.createContactMutation.mutateAsync({
        firstName: "New",
        lastName: "Contact",
        email: "n@c.com",
      });
    });

    await expectInvalidates(harness, ["contacts", "accounts"]);
  });

  it("updateContact invalidates contacts and accounts", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/contacts/:id", () => HttpResponse.json(contact)));

    await act(async () => {
      await harness.result.current.updateContactMutation.mutateAsync({ id: "c1", data: { jobTitle: "CTO" } });
    });

    await expectInvalidates(harness, ["contacts", "accounts"]);
  });

  it("addInteraction invalidates only contacts — no account field changes", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/contacts/:id/interactions", () => HttpResponse.json(contact)));

    await act(async () => {
      await harness.result.current.addInteractionMutation.mutateAsync({
        id: "c1",
        data: { type: "call", note: "Intro" },
      });
    });

    await expectInvalidates(harness, ["contacts"]);
  });

  it("assignContact invalidates contacts and accounts", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/contacts/:id/assign", () => HttpResponse.json(contact)));

    await act(async () => {
      await harness.result.current.assignContactMutation.mutateAsync({ id: "c1", data: { assignedToId: "u1" } });
    });

    await expectInvalidates(harness, ["contacts", "accounts"]);
  });

  it("deleteContact invalidates contacts and accounts", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/contacts/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteContactMutation.mutateAsync("c1");
    });

    await expectInvalidates(harness, ["contacts", "accounts"]);
  });
});
