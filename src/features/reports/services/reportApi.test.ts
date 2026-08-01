import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import type { RunReportRequest } from "../types";
import { reportApi } from "./reportApi";

const runRequest: RunReportRequest = {
  dataset: "opportunities",
  filters: [{ field: "stage", operator: "eq", value: "closed_won" }],
  dateRange: { field: "createdAt", from: "2026-07-01", to: "2026-07-31" },
  groupBy: "assignedToName",
  metrics: [{ fn: "sum", field: "amount", alias: "revenue" }],
  sortBy: "revenue",
  sortOrder: "desc",
  page: 1,
  limit: 50,
};

describeApiContract("reportApi", [
  { name: "getDatasets -> GET /reports/datasets", call: () => reportApi.getDatasets(), method: "GET", path: "/reports/datasets" },
  { name: "getDashboard -> GET /reports/dashboard", call: () => reportApi.getDashboard(), method: "GET", path: "/reports/dashboard" },
  {
    name: "getTeamPerformance -> GET /reports/team-performance",
    call: () => reportApi.getTeamPerformance(),
    method: "GET",
    path: "/reports/team-performance",
  },
  {
    name: "run -> POST /reports/run with the full builder payload",
    call: () => reportApi.run(runRequest),
    method: "POST",
    path: "/reports/run",
    body: runRequest,
  },
  { name: "getSaved -> GET /reports/saved", call: () => reportApi.getSaved(), method: "GET", path: "/reports/saved" },
  { name: "getSavedById -> GET /reports/saved/:id", call: () => reportApi.getSavedById("s1"), method: "GET", path: "/reports/saved/s1" },
  {
    name: "createSaved -> POST /reports/saved",
    call: () => reportApi.createSaved({ ...runRequest, name: "Won by rep", shared: true }),
    method: "POST",
    path: "/reports/saved",
    body: { ...runRequest, name: "Won by rep", shared: true },
  },
  {
    name: "updateSaved -> PUT /reports/saved/:id (not PATCH)",
    call: () => reportApi.updateSaved("s1", { ...runRequest, name: "Renamed" }),
    method: "PUT",
    path: "/reports/saved/s1",
    body: { ...runRequest, name: "Renamed" },
  },
  {
    name: "deleteSaved -> DELETE /reports/saved/:id",
    call: () => reportApi.deleteSaved("s1"),
    method: "DELETE",
    path: "/reports/saved/s1",
    respond: () => new Response(null, { status: 204 }),
  },
  {
    name: "runSaved -> POST /reports/saved/:id/run",
    call: () => reportApi.runSaved("s1"),
    method: "POST",
    path: "/reports/saved/s1/run",
    body: {},
  },
  {
    name: "runSaved passes pagination and sort overrides as query params",
    call: () => reportApi.runSaved("s1", { page: 2, limit: 100, sortBy: "amount", sortOrder: "asc" }),
    method: "POST",
    path: "/reports/saved/s1/run",
    query: { page: "2", limit: "100", sortBy: "amount", sortOrder: "asc" },
    body: {},
  },
]);

describe("reportApi — run overrides", () => {
  it("sends no query string when overrides are omitted", async () => {
    const req = await captureRequest(() => reportApi.runSaved("s1"));
    expect(req.search.toString()).toBe("");
  });

  it("sends an empty JSON body so the saved definition is used as-is", async () => {
    const req = await captureRequest(() => reportApi.runSaved("s1", { page: 2 }));
    expect(JSON.parse(req.body)).toEqual({});
  });

  it("preserves nested filter and metric arrays exactly", async () => {
    const req = await captureRequest(() => reportApi.run(runRequest));
    const sent = JSON.parse(req.body) as RunReportRequest;
    expect(sent.filters).toEqual(runRequest.filters);
    expect(sent.metrics).toEqual(runRequest.metrics);
    expect(sent.dateRange).toEqual(runRequest.dateRange);
  });
});
