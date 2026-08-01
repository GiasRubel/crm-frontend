import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useAccountSummary, useAccounts } from "./useAccounts";

const account = { id: "a1", name: "Acme Inc", status: "active", contactCount: 2, openDealCount: 1 };
const list = { data: [account], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, prospect: 0, active: 1, inactive: 0, newThisMonth: 1 };

function mockBase() {
  server.use(
    http.get("/api/backend/accounts", () => HttpResponse.json(list)),
    http.get("/api/backend/accounts/stats", () => HttpResponse.json(stats)),
  );
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useAccounts({}));
  await waitFor(() => expect(harness.result.current.accountsQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useAccounts — queries", () => {
  it("loads accounts and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.accountsQuery.data?.data[0].name).toBe("Acme Inc");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("forwards industry, size and status filters", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/accounts", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/accounts/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() =>
      useAccounts({ industry: "technology", size: "11-50", status: "active" }),
    );
    await waitFor(() => expect(result.current.accountsQuery.isSuccess).toBe(true));

    expect(Object.fromEntries(seen!.searchParams)).toEqual({
      industry: "technology",
      size: "11-50",
      status: "active",
    });
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/accounts", () => HttpResponse.json({ message: "Nope" }, { status: 500 })),
      http.get("/api/backend/accounts/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useAccounts({}));
    await waitFor(() => expect(result.current.accountsQuery.isError).toBe(true));
    expect((result.current.accountsQuery.error as ApiError).status).toBe(500);
  });
});

describe("useAccounts — mutations", () => {
  it("createAccount invalidates accounts", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/accounts", () => HttpResponse.json(account)));

    await act(async () => {
      await harness.result.current.createAccountMutation.mutateAsync({ name: "New Co" });
    });

    await expectInvalidates(harness, ["accounts"]);
  });

  it("updateAccount invalidates accounts", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/accounts/:id", () => HttpResponse.json(account)));

    await act(async () => {
      await harness.result.current.updateAccountMutation.mutateAsync({ id: "a1", data: { name: "Renamed" } });
    });

    await expectInvalidates(harness, ["accounts"]);
  });

  it("assignAccount invalidates accounts", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/accounts/:id/assign", () => HttpResponse.json(account)));

    await act(async () => {
      await harness.result.current.assignAccountMutation.mutateAsync({ id: "a1", data: { assignedToId: "u1" } });
    });

    await expectInvalidates(harness, ["accounts"]);
  });

  it("deleteAccount also invalidates contacts and opportunities — deletion unlinks them", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/accounts/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteAccountMutation.mutateAsync("a1");
    });

    await expectInvalidates(harness, ["accounts", "contacts", "opportunities"]);
  });
});

describe("useAccountSummary", () => {
  const summary = { account, contacts: [], opportunities: [], totalOpenValue: 0, totalWonValue: 0 };

  it("does not fetch while no account is selected", async () => {
    let called = false;
    server.use(
      http.get("/api/backend/accounts/:id/summary", () => {
        called = true;
        return HttpResponse.json(summary);
      }),
    );

    const { result } = renderFeatureHook(() => useAccountSummary(null));
    expect(result.current.fetchStatus).toBe("idle");
    expect(called).toBe(false);
  });

  it("fetches the 360-degree summary once an account is selected", async () => {
    let path: string | undefined;
    server.use(
      http.get("/api/backend/accounts/:id/summary", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(summary);
      }),
    );

    const { result } = renderFeatureHook(() => useAccountSummary("a1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(path).toBe("/api/backend/accounts/a1/summary");
    expect(result.current.data).toEqual(summary);
  });
});
