import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useActivities } from "./useActivities";

const activity = { id: "a1", type: "task", subject: "Follow up", status: "pending", priority: "high" };
const list = { data: [activity], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, pending: 1, completed: 0, overdue: 0, dueToday: 1 };

function mockBase() {
  server.use(
    http.get("/api/backend/activities", () => HttpResponse.json(list)),
    http.get("/api/backend/activities/stats", () => HttpResponse.json(stats)),
  );
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useActivities({}));
  await waitFor(() => expect(harness.result.current.activitiesQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useActivities — queries", () => {
  it("loads activities and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.activitiesQuery.data?.data[0].subject).toBe("Follow up");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it('forwards the "assigned to me" and due filters', async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/activities", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/activities/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() =>
      useActivities({ assignedToId: "kc-1", due: "overdue" }),
    );
    await waitFor(() => expect(result.current.activitiesQuery.isSuccess).toBe(true));

    expect(Object.fromEntries(seen!.searchParams)).toEqual({ assignedToId: "kc-1", due: "overdue" });
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/activities", () => HttpResponse.json({ message: "Nope" }, { status: 500 })),
      http.get("/api/backend/activities/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useActivities({}));
    await waitFor(() => expect(result.current.activitiesQuery.isError).toBe(true));
    expect((result.current.activitiesQuery.error as ApiError).status).toBe(500);
  });
});

describe("useActivities — mutations", () => {
  it("createActivity invalidates activities, leads and contacts", async () => {
    // Logging a communication feeds lead scores and contact histories.
    const harness = await readyHarness();
    server.use(http.post("/api/backend/activities", () => HttpResponse.json(activity)));

    await act(async () => {
      await harness.result.current.createActivityMutation.mutateAsync({ type: "call", subject: "Intro" });
    });

    await expectInvalidates(harness, ["activities", "leads", "contacts"]);
  });

  it("setStatus invalidates activities, leads and contacts", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/activities/:id/status", () => HttpResponse.json(activity)));

    await act(async () => {
      await harness.result.current.setStatusMutation.mutateAsync({
        id: "a1",
        data: { status: "completed" },
      });
    });

    await expectInvalidates(harness, ["activities", "leads", "contacts"]);
  });

  it("updateActivity invalidates only activities — editing a subject changes no score", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/activities/:id", () => HttpResponse.json(activity)));

    await act(async () => {
      await harness.result.current.updateActivityMutation.mutateAsync({
        id: "a1",
        data: { subject: "Renamed" },
      });
    });

    await expectInvalidates(harness, ["activities"]);
  });

  it("assignActivity invalidates only activities", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/activities/:id/assign", () => HttpResponse.json(activity)));

    await act(async () => {
      await harness.result.current.assignActivityMutation.mutateAsync({
        id: "a1",
        data: { assignedToId: "u1" },
      });
    });

    await expectInvalidates(harness, ["activities"]);
  });

  it("deleteActivity invalidates only activities", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/activities/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteActivityMutation.mutateAsync("a1");
    });

    await expectInvalidates(harness, ["activities"]);
  });
});
