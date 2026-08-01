import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import type { CreateSavedReportRequest, RunReportRequest } from "../types";
import { useDashboard, useDatasets, useSavedReports, useTeamPerformance } from "./useReports";

const dashboard = { pipeline: { stages: [], totalOpen: 0 }, leadFunnel: [], revenue: [] };
const teamPerformance = { reps: [], teams: [] };
const datasets = { datasets: [{ key: "opportunities", label: "Opportunities", fields: [] }] };
const savedReport = { id: "s1", name: "Won by rep", dataset: "opportunities", shared: true };
const reportResult = { mode: "aggregate", dataset: "opportunities", rows: [], total: 0 };

const runRequest: RunReportRequest = { dataset: "opportunities", groupBy: "stage" };

describe("useDashboard", () => {
  it("loads the analytics dashboard", async () => {
    server.use(http.get("/api/backend/reports/dashboard", () => HttpResponse.json(dashboard)));

    const { result } = renderFeatureHook(() => useDashboard());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(dashboard);
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/reports/dashboard", () =>
        HttpResponse.json({ message: "Nope" }, { status: 500 }),
      ),
    );

    const { result } = renderFeatureHook(() => useDashboard());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe("useTeamPerformance", () => {
  it("loads the rep/team leaderboard", async () => {
    server.use(
      http.get("/api/backend/reports/team-performance", () => HttpResponse.json(teamPerformance)),
    );

    const { result } = renderFeatureHook(() => useTeamPerformance());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(teamPerformance);
  });
});

describe("useDatasets", () => {
  it("loads the builder's dataset registry", async () => {
    server.use(http.get("/api/backend/reports/datasets", () => HttpResponse.json(datasets)));

    const { result } = renderFeatureHook(() => useDatasets());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(datasets);
  });

  it("is cached for 30 minutes — the registry rarely changes", async () => {
    server.use(http.get("/api/backend/reports/datasets", () => HttpResponse.json(datasets)));

    const { result, queryClient } = renderFeatureHook(() => useDatasets());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = queryClient.getQueryCache().find({ queryKey: ["reports", "datasets"] });
    expect((state?.options as { staleTime?: number } | undefined)?.staleTime).toBe(1000 * 60 * 30);
  });
});

describe("useSavedReports — query", () => {
  it("loads saved report definitions", async () => {
    server.use(http.get("/api/backend/reports/saved", () => HttpResponse.json([savedReport])));

    const { result } = renderFeatureHook(() => useSavedReports());
    await waitFor(() => expect(result.current.savedQuery.isSuccess).toBe(true));
    expect(result.current.savedQuery.data).toEqual([savedReport]);
  });
});

async function readyHarness() {
  server.use(http.get("/api/backend/reports/saved", () => HttpResponse.json([savedReport])));
  const harness = renderFeatureHook(() => useSavedReports());
  await waitFor(() => expect(harness.result.current.savedQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useSavedReports — mutations", () => {
  it("runReport posts the builder payload and does NOT invalidate — running changes nothing", async () => {
    const harness = await readyHarness();
    let body: unknown;
    server.use(
      http.post("/api/backend/reports/run", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(reportResult);
      }),
    );

    await act(async () => {
      await harness.result.current.runReportMutation.mutateAsync(runRequest);
    });

    expect(body).toEqual(runRequest);
    expect(harness.result.current.runReportMutation.data).toEqual(reportResult);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("createSaved invalidates the saved-report list", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/reports/saved", () => HttpResponse.json(savedReport)));

    const dto: CreateSavedReportRequest = { ...runRequest, name: "Won by rep" };
    await act(async () => {
      await harness.result.current.createSavedMutation.mutateAsync(dto);
    });

    await expectInvalidates(harness, ["reports"]);
    expect(harness.invalidate.mock.calls[0][0]).toMatchObject({ queryKey: ["reports", "saved"] });
  });

  it("updateSaved uses PUT and invalidates", async () => {
    const harness = await readyHarness();
    let method: string | undefined;
    server.use(
      http.put("/api/backend/reports/saved/:id", ({ request }) => {
        method = request.method;
        return HttpResponse.json(savedReport);
      }),
    );

    await act(async () => {
      await harness.result.current.updateSavedMutation.mutateAsync({
        id: "s1",
        dto: { ...runRequest, name: "Renamed" },
      });
    });

    expect(method).toBe("PUT");
    await expectInvalidates(harness, ["reports"]);
  });

  it("deleteSaved invalidates", async () => {
    const harness = await readyHarness();
    server.use(
      http.delete("/api/backend/reports/saved/:id", () => new HttpResponse(null, { status: 204 })),
    );

    await act(async () => {
      await harness.result.current.deleteSavedMutation.mutateAsync("s1");
    });

    await expectInvalidates(harness, ["reports"]);
  });

  it("a rejected run surfaces the ApiError", async () => {
    const harness = await readyHarness();
    server.use(
      http.post("/api/backend/reports/run", () =>
        HttpResponse.json({ message: "Unknown dataset" }, { status: 400 }),
      ),
    );

    await act(async () => {
      await harness.result.current.runReportMutation.mutateAsync(runRequest).catch(() => {});
    });

    await waitFor(() => expect(harness.result.current.runReportMutation.isError).toBe(true));
    expect((harness.result.current.runReportMutation.error as ApiError).message).toBe("Unknown dataset");
  });
});
