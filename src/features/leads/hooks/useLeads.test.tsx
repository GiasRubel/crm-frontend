import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import {
  expectInvalidates,
  renderFeatureHook,
  renderFeatureHookWithProps,
} from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import type { LeadQuery } from "../types";
import { useLeads } from "./useLeads";

const lead = { id: "l1", firstName: "Ann", lastName: "Bee", email: "a@b.com", status: "new", score: 10 };
const list = { data: [lead], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, new: 1, contacted: 0, qualified: 0, unqualified: 0, converted: 0 };

function mockBase() {
  server.use(
    http.get("/api/backend/leads", () => HttpResponse.json(list)),
    http.get("/api/backend/leads/stats", () => HttpResponse.json(stats)),
  );
}

async function readyHarness(query: LeadQuery = {}) {
  mockBase();
  const harness = renderFeatureHook(() => useLeads(query));
  await waitFor(() => expect(harness.result.current.leadsQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useLeads — queries", () => {
  it("loads the lead list and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.leadsQuery.data?.data[0].email).toBe("a@b.com");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("forwards filters to the API", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/leads", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/leads/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useLeads({ status: "qualified", rating: "hot" }));
    await waitFor(() => expect(result.current.leadsQuery.isSuccess).toBe(true));

    expect(seen?.searchParams.get("status")).toBe("qualified");
    expect(seen?.searchParams.get("rating")).toBe("hot");
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/leads", () => HttpResponse.json({ message: "Nope" }, { status: 403 })),
      http.get("/api/backend/leads/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useLeads({}));
    await waitFor(() => expect(result.current.leadsQuery.isError).toBe(true));
    expect((result.current.leadsQuery.error as ApiError).status).toBe(403);
  });

  it("refetches when the filter object changes (JSON-hashed query key)", async () => {
    const searches: string[] = [];
    server.use(
      http.get("/api/backend/leads", ({ request }) => {
        searches.push(new URL(request.url).search);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/leads/stats", () => HttpResponse.json(stats)),
    );

    const { result, rerender } = renderFeatureHookWithProps<LeadQuery, ReturnType<typeof useLeads>>(
      useLeads,
      { status: "new" },
    );
    await waitFor(() => expect(result.current.leadsQuery.isSuccess).toBe(true));

    rerender({ status: "contacted" });
    await waitFor(() => expect(searches).toEqual(["?status=new", "?status=contacted"]));
  });

  it("keeps the previous page while the next one loads", async () => {
    mockBase();
    const { result, rerender } = renderFeatureHookWithProps<LeadQuery, ReturnType<typeof useLeads>>(
      useLeads,
      {},
    );
    await waitFor(() => expect(result.current.leadsQuery.isSuccess).toBe(true));

    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get("/api/backend/leads", async () => {
        await gate;
        return HttpResponse.json(list);
      }),
    );

    rerender({ page: 2 });
    await waitFor(() => expect(result.current.leadsQuery.isPlaceholderData).toBe(true));
    expect(result.current.leadsQuery.data?.data).toHaveLength(1);
    release();
  });
});

describe("useLeads — mutations", () => {
  it("createLead invalidates leads", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/leads", () => HttpResponse.json(lead)));

    await act(async () => {
      await harness.result.current.createLeadMutation.mutateAsync({
        firstName: "New",
        lastName: "Lead",
        email: "n@l.com",
      });
    });

    await expectInvalidates(harness, ["leads"]);
  });

  it("updateLead patches by id and invalidates leads", async () => {
    const harness = await readyHarness();
    let path: string | undefined;
    server.use(
      http.patch("/api/backend/leads/:id", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(lead);
      }),
    );

    await act(async () => {
      await harness.result.current.updateLeadMutation.mutateAsync({ id: "l1", data: { status: "contacted" } });
    });

    expect(path).toBe("/api/backend/leads/l1");
    await expectInvalidates(harness, ["leads"]);
  });

  it("addEngagement invalidates leads so the recalculated score is refetched", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/leads/:id/engagements", () => HttpResponse.json(lead)));

    await act(async () => {
      await harness.result.current.addEngagementMutation.mutateAsync({
        id: "l1",
        data: { type: "call", points: 5 },
      });
    });

    await expectInvalidates(harness, ["leads"]);
  });

  it("assignLead invalidates leads", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/leads/:id/assign", () => HttpResponse.json(lead)));

    await act(async () => {
      await harness.result.current.assignLeadMutation.mutateAsync({ id: "l1", data: { assignedToId: "u1" } });
    });

    await expectInvalidates(harness, ["leads"]);
  });

  it("convertLead invalidates leads, customers AND opportunities", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/leads/:id/convert", () => HttpResponse.json(lead)));

    await act(async () => {
      await harness.result.current.convertLeadMutation.mutateAsync({
        id: "l1",
        data: { createOpportunity: true, opportunityName: "Deal", amount: 1000 },
      });
    });

    // Conversion creates a customer and (usually) an opportunity — all three
    // caches are stale afterwards.
    await expectInvalidates(harness, ["leads", "customers", "opportunities"]);
  });

  it("deleteLead invalidates leads", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/leads/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteLeadMutation.mutateAsync("l1");
    });

    await expectInvalidates(harness, ["leads"]);
  });

  it("a failed conversion invalidates nothing", async () => {
    const harness = await readyHarness();
    server.use(
      http.post("/api/backend/leads/:id/convert", () =>
        HttpResponse.json({ message: "Lead already converted" }, { status: 409 }),
      ),
    );

    await act(async () => {
      await harness.result.current.convertLeadMutation
        .mutateAsync({ id: "l1", data: {} })
        .catch(() => {});
    });

    await waitFor(() => expect(harness.result.current.convertLeadMutation.isError).toBe(true));
    expect((harness.result.current.convertLeadMutation.error as ApiError).status).toBe(409);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});
