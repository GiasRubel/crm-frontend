import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useOpportunities } from "./useOpportunities";

const opportunity = { id: "o1", name: "Acme renewal", amount: 25000, stage: "discovery", customerId: "c1" };
const board = {
  columns: [
    { stage: "discovery", opportunities: [opportunity], count: 1, totalAmount: 25000 },
    { stage: "proposal", opportunities: [], count: 0, totalAmount: 0 },
    { stage: "negotiation", opportunities: [], count: 0, totalAmount: 0 },
    { stage: "closed_won", opportunities: [], count: 0, totalAmount: 0 },
    { stage: "closed_lost", opportunities: [], count: 0, totalAmount: 0 },
  ],
};
const list = { data: [opportunity], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, open: 1, won: 0, lost: 0, totalValue: 25000, weightedValue: 5000 };

function mockBase() {
  server.use(
    http.get("/api/backend/opportunities/board", () => HttpResponse.json(board)),
    http.get("/api/backend/opportunities/stats", () => HttpResponse.json(stats)),
    http.get("/api/backend/opportunities", () => HttpResponse.json(list)),
  );
}

async function readyHarness(query?: Parameters<typeof useOpportunities>[0]) {
  mockBase();
  const harness = renderFeatureHook(() => useOpportunities(query));
  await waitFor(() => expect(harness.result.current.boardQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useOpportunities — queries", () => {
  it("always loads the Kanban board and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.boardQuery.data?.columns[0].opportunities[0].name).toBe("Acme renewal");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("skips the flat list when no query is passed (board-only pages)", async () => {
    const { result } = await readyHarness(undefined);
    expect(result.current.listQuery.fetchStatus).toBe("idle");
    expect(result.current.listQuery.data).toBeUndefined();
  });

  it("loads the flat list once a query is supplied", async () => {
    const { result } = await readyHarness({ stage: "discovery" });
    await waitFor(() => expect(result.current.listQuery.isSuccess).toBe(true));
    expect(result.current.listQuery.data?.data[0].id).toBe("o1");
  });

  it("surfaces an ApiError from the board query", async () => {
    server.use(
      http.get("/api/backend/opportunities/board", () =>
        HttpResponse.json({ message: "Nope" }, { status: 500 }),
      ),
      http.get("/api/backend/opportunities/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useOpportunities());
    await waitFor(() => expect(result.current.boardQuery.isError).toBe(true));
    expect((result.current.boardQuery.error as ApiError).status).toBe(500);
  });
});

describe("useOpportunities — mutations", () => {
  it("createOpportunity invalidates opportunities", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/opportunities", () => HttpResponse.json(opportunity)));

    await act(async () => {
      await harness.result.current.createOpportunityMutation.mutateAsync({
        name: "New deal",
        customerId: "c1",
        amount: 1000,
      });
    });

    await expectInvalidates(harness, ["opportunities"]);
  });

  it("updateOpportunity invalidates opportunities", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/opportunities/:id", () => HttpResponse.json(opportunity)));

    await act(async () => {
      await harness.result.current.updateOpportunityMutation.mutateAsync({ id: "o1", data: { amount: 2000 } });
    });

    await expectInvalidates(harness, ["opportunities"]);
  });

  it("moveStage invalidates so the board re-buckets the card", async () => {
    const harness = await readyHarness();
    let path: string | undefined;
    let body: unknown;
    server.use(
      http.patch("/api/backend/opportunities/:id/stage", async ({ request }) => {
        path = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json(opportunity);
      }),
    );

    await act(async () => {
      await harness.result.current.moveStageMutation.mutateAsync({ id: "o1", data: { stage: "proposal" } });
    });

    expect(path).toBe("/api/backend/opportunities/o1/stage");
    expect(body).toEqual({ stage: "proposal" });
    await expectInvalidates(harness, ["opportunities"]);
  });

  it("moveStage to closed_lost forwards the lost reason", async () => {
    const harness = await readyHarness();
    let body: unknown;
    server.use(
      http.patch("/api/backend/opportunities/:id/stage", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(opportunity);
      }),
    );

    await act(async () => {
      await harness.result.current.moveStageMutation.mutateAsync({
        id: "o1",
        data: { stage: "closed_lost", lostReason: "Budget" },
      });
    });

    expect(body).toEqual({ stage: "closed_lost", lostReason: "Budget" });
  });

  it("assignOpportunity invalidates opportunities", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/opportunities/:id/assign", () => HttpResponse.json(opportunity)));

    await act(async () => {
      await harness.result.current.assignOpportunityMutation.mutateAsync({
        id: "o1",
        data: { assignedToId: "u1" },
      });
    });

    await expectInvalidates(harness, ["opportunities"]);
  });

  it("deleteOpportunity invalidates opportunities", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/opportunities/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteOpportunityMutation.mutateAsync("o1");
    });

    await expectInvalidates(harness, ["opportunities"]);
  });

  it("a rejected stage move (e.g. missing lostReason) invalidates nothing", async () => {
    const harness = await readyHarness();
    server.use(
      http.patch("/api/backend/opportunities/:id/stage", () =>
        HttpResponse.json({ message: ["lostReason should not be empty"] }, { status: 400 }),
      ),
    );

    await act(async () => {
      await harness.result.current.moveStageMutation
        .mutateAsync({ id: "o1", data: { stage: "closed_lost" } })
        .catch(() => {});
    });

    await waitFor(() => expect(harness.result.current.moveStageMutation.isError).toBe(true));
    expect((harness.result.current.moveStageMutation.error as ApiError).message).toBe(
      "lostReason should not be empty",
    );
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});
