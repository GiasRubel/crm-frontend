import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useMyTeams, useTeams } from "./useTeams";

const team = { id: "t1", name: "West", regions: ["CA"], memberIds: ["u1"], isActive: true };
const list = { data: [team], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, active: 1, inactive: 0, unassignedCustomers: 0 };

function mockBase() {
  server.use(
    http.get("/api/backend/teams", () => HttpResponse.json(list)),
    http.get("/api/backend/teams/stats", () => HttpResponse.json(stats)),
  );
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useTeams({}));
  await waitFor(() => expect(harness.result.current.teamsQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useTeams — queries", () => {
  it("loads teams and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.teamsQuery.data?.data[0].name).toBe("West");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("forwards the isActive=false filter rather than dropping it as falsy", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/teams", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/teams/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useTeams({ isActive: false }));
    await waitFor(() => expect(result.current.teamsQuery.isSuccess).toBe(true));
    expect(seen?.searchParams.get("isActive")).toBe("false");
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/teams", () => HttpResponse.json({ message: "Nope" }, { status: 403 })),
      http.get("/api/backend/teams/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useTeams({}));
    await waitFor(() => expect(result.current.teamsQuery.isError).toBe(true));
    expect((result.current.teamsQuery.error as ApiError).status).toBe(403);
  });
});

describe("useTeams — mutations", () => {
  // Team membership drives record visibility and the assignment labels shown
  // on customers, so both caches go stale together.
  it("createTeam invalidates teams AND customers", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/teams", () => HttpResponse.json(team)));

    await act(async () => {
      await harness.result.current.createTeamMutation.mutateAsync({ name: "East" });
    });

    await expectInvalidates(harness, ["teams", "customers"]);
  });

  it("updateTeam invalidates teams and customers", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/teams/:id", () => HttpResponse.json(team)));

    await act(async () => {
      await harness.result.current.updateTeamMutation.mutateAsync({
        id: "t1",
        data: { memberIds: ["u1", "u2"] },
      });
    });

    await expectInvalidates(harness, ["teams", "customers"]);
  });

  it("deleteTeam invalidates teams and customers", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/teams/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteTeamMutation.mutateAsync("t1");
    });

    await expectInvalidates(harness, ["teams", "customers"]);
  });
});

describe("useMyTeams", () => {
  it("loads the signed-in user's teams from /teams/my", async () => {
    let path: string | undefined;
    server.use(
      http.get("/api/backend/teams/my", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json([team]);
      }),
    );

    const { result } = renderFeatureHook(() => useMyTeams());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(path).toBe("/api/backend/teams/my");
    expect(result.current.data).toEqual([team]);
  });
});
