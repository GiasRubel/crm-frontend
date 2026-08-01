import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useAutomations } from "./useAutomations";

const rule = { id: "r1", name: "Notify on new lead", kind: "trigger", isActive: true, actions: [] };
const run = { id: "run1", ruleId: "r1", ruleName: "Notify on new lead", status: "success", logs: [] };
const rules = { data: [rule], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const runs = { data: [run], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { totalRules: 1, activeRules: 1, runsToday: 3, failuresToday: 0 };

function mockBase() {
  server.use(
    http.get("/api/backend/automations", () => HttpResponse.json(rules)),
    http.get("/api/backend/automations/stats", () => HttpResponse.json(stats)),
    http.get("/api/backend/automations/runs", () => HttpResponse.json(runs)),
  );
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useAutomations({}, {}));
  await waitFor(() => expect(harness.result.current.rulesQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useAutomations — queries", () => {
  it("loads rules, stats and the run log together", async () => {
    const { result } = await readyHarness();
    expect(result.current.rulesQuery.data?.data[0].name).toBe("Notify on new lead");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
    await waitFor(() => expect(result.current.runsQuery.data?.data[0].id).toBe("run1"));
  });

  it("keeps the rule list and run log on separate query keys and endpoints", async () => {
    const paths: string[] = [];
    server.use(
      http.get("/api/backend/automations", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(rules);
      }),
      http.get("/api/backend/automations/runs", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(runs);
      }),
      http.get("/api/backend/automations/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useAutomations({}, {}));
    await waitFor(() => expect(result.current.runsQuery.isSuccess).toBe(true));

    expect(paths.sort()).toEqual(["/api/backend/automations", "/api/backend/automations/runs"]);
  });

  it("forwards independent filters to the rule list and the run log", async () => {
    let ruleUrl: URL | undefined;
    let runUrl: URL | undefined;
    server.use(
      http.get("/api/backend/automations", ({ request }) => {
        ruleUrl = new URL(request.url);
        return HttpResponse.json(rules);
      }),
      http.get("/api/backend/automations/runs", ({ request }) => {
        runUrl = new URL(request.url);
        return HttpResponse.json(runs);
      }),
      http.get("/api/backend/automations/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() =>
      useAutomations({ kind: "sla", isActive: "true" }, { status: "failed", ruleId: "r1" }),
    );
    await waitFor(() => expect(result.current.runsQuery.isSuccess).toBe(true));

    expect(Object.fromEntries(ruleUrl!.searchParams)).toEqual({ kind: "sla", isActive: "true" });
    expect(Object.fromEntries(runUrl!.searchParams)).toEqual({ status: "failed", ruleId: "r1" });
  });

  it("surfaces an ApiError from the rules query (e.g. 403 for non-admins)", async () => {
    server.use(
      http.get("/api/backend/automations", () => HttpResponse.json({ message: "Forbidden" }, { status: 403 })),
      http.get("/api/backend/automations/stats", () => HttpResponse.json(stats)),
      http.get("/api/backend/automations/runs", () => HttpResponse.json(runs)),
    );

    const { result } = renderFeatureHook(() => useAutomations({}, {}));
    await waitFor(() => expect(result.current.rulesQuery.isError).toBe(true));
    expect((result.current.rulesQuery.error as ApiError).status).toBe(403);
  });
});

describe("useAutomations — mutations", () => {
  it("createRule invalidates automations", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/automations", () => HttpResponse.json(rule)));

    await act(async () => {
      await harness.result.current.createRuleMutation.mutateAsync({
        name: "New rule",
        kind: "trigger",
        triggerEvent: "lead.created",
        actions: [{ type: "create_task", taskSubject: "Call" }],
      });
    });

    await expectInvalidates(harness, ["automations"]);
  });

  it("toggling a rule active invalidates automations", async () => {
    const harness = await readyHarness();
    let body: unknown;
    server.use(
      http.patch("/api/backend/automations/:id", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(rule);
      }),
    );

    await act(async () => {
      await harness.result.current.updateRuleMutation.mutateAsync({ id: "r1", data: { isActive: false } });
    });

    expect(body).toEqual({ isActive: false });
    await expectInvalidates(harness, ["automations"]);
  });

  it("deleteRule invalidates automations", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/automations/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteRuleMutation.mutateAsync("r1");
    });

    await expectInvalidates(harness, ["automations"]);
  });
});
