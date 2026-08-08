import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useCustomRoles, useMyPermissions, useSetUserCustomRole } from "./useRoles";

const role = {
  id: "r1",
  name: "Junior Rep",
  description: "Limited access",
  permissions: [{ entityType: "lead", actions: ["read"], scope: "own" }],
  fieldRestrictions: [],
  userCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockBase() {
  server.use(http.get("/api/backend/roles", () => HttpResponse.json([role])));
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useCustomRoles());
  await waitFor(() => expect(harness.result.current.listQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useCustomRoles — queries", () => {
  it("loads the org's custom roles", async () => {
    const { result } = await readyHarness();
    expect(result.current.listQuery.data?.[0].name).toBe("Junior Rep");
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(http.get("/api/backend/roles", () => HttpResponse.json({ message: "Nope" }, { status: 403 })));

    const { result } = renderFeatureHook(() => useCustomRoles());
    await waitFor(() => expect(result.current.listQuery.isError).toBe(true));
    expect((result.current.listQuery.error as ApiError).status).toBe(403);
  });
});

describe("useCustomRoles — mutations", () => {
  it("createRole invalidates custom-roles", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/roles", () => HttpResponse.json(role)));

    await act(async () => {
      await harness.result.current.createMutation.mutateAsync({ name: "New Role" });
    });

    await expectInvalidates(harness, ["custom-roles"]);
  });

  it("updateRole invalidates custom-roles", async () => {
    const harness = await readyHarness();
    server.use(http.patch("/api/backend/roles/:id", () => HttpResponse.json(role)));

    await act(async () => {
      await harness.result.current.updateMutation.mutateAsync({ id: "r1", dto: { description: "x" } });
    });

    await expectInvalidates(harness, ["custom-roles"]);
  });

  it("deleteRole invalidates custom-roles", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/roles/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteMutation.mutateAsync("r1");
    });

    await expectInvalidates(harness, ["custom-roles"]);
  });
});

describe("useMyPermissions", () => {
  it("loads the signed-in user's effective permission matrix", async () => {
    const matrix = { lead: { actions: ["read"], scope: "own" } };
    server.use(http.get("/api/backend/users/me/permissions", () => HttpResponse.json(matrix)));

    const { result } = renderFeatureHook(() => useMyPermissions());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(matrix);
  });
});

describe("useSetUserCustomRole", () => {
  it("invalidates the staff directory and custom-roles on success", async () => {
    const harness = renderFeatureHook(() => useSetUserCustomRole());
    server.use(
      http.patch("/api/backend/users/:id/custom-role", () =>
        HttpResponse.json({ id: "u2", customRoleId: "r1", customRoleName: "Junior Rep" }),
      ),
    );

    await act(async () => {
      await harness.result.current.mutateAsync({ userId: "u2", customRoleId: "r1" });
    });

    await expectInvalidates(harness, ["users", "custom-roles"]);
  });
});
