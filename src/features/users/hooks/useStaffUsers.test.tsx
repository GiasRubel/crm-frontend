import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useCreateStaffUser, useStaffUsers } from "./useStaffUsers";

const staff = [
  { id: "u1", keycloakId: "kc-1", email: "ada@x.com", firstName: "Ada", lastName: "Admin", role: "Admin" },
  { id: "u2", keycloakId: "kc-2", email: "sam@x.com", firstName: "Sam", lastName: "Staff", role: "User" },
];

describe("useStaffUsers", () => {
  it("loads the staff directory used by owner/member pickers", async () => {
    let path: string | undefined;
    server.use(
      http.get("/api/backend/users/staff", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(staff);
      }),
    );

    const { result } = renderFeatureHook(() => useStaffUsers());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(path).toBe("/api/backend/users/staff");
    expect(result.current.data).toHaveLength(2);
  });

  it("is cached for 60s — pickers re-mount constantly across dialogs", async () => {
    server.use(http.get("/api/backend/users/staff", () => HttpResponse.json(staff)));

    const { result, queryClient } = renderFeatureHook(() => useStaffUsers());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const entry = queryClient.getQueryCache().find({ queryKey: ["users", "staff"] });
    expect((entry?.options as { staleTime?: number } | undefined)?.staleTime).toBe(60_000);
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/users/staff", () => HttpResponse.json({ message: "Nope" }, { status: 403 })),
    );

    const { result } = renderFeatureHook(() => useStaffUsers());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(403);
  });
});

describe("useCreateStaffUser", () => {
  it("posts the invite and invalidates the staff directory", async () => {
    let body: unknown;
    server.use(
      http.get("/api/backend/users/staff", () => HttpResponse.json(staff)),
      http.post("/api/backend/users", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(staff[1]);
      }),
    );

    const harness = renderFeatureHook(() => useCreateStaffUser());

    await act(async () => {
      await harness.result.current.mutateAsync({
        email: "new@x.com",
        firstName: "New",
        lastName: "Rep",
        role: "User",
      });
    });

    expect(body).toEqual({ email: "new@x.com", firstName: "New", lastName: "Rep", role: "User" });
    await waitFor(() => expect(harness.invalidate).toHaveBeenCalled());
    expect(harness.invalidate.mock.calls[0][0]).toMatchObject({ queryKey: ["users", "staff"] });
  });

  it("surfaces a duplicate-email rejection and invalidates nothing", async () => {
    server.use(
      http.post("/api/backend/users", () =>
        HttpResponse.json({ message: "User already exists" }, { status: 409 }),
      ),
    );

    const harness = renderFeatureHook(() => useCreateStaffUser());

    await act(async () => {
      await harness.result.current
        .mutateAsync({ email: "dupe@x.com", firstName: "D", lastName: "U", role: "User" })
        .catch(() => {});
    });

    await waitFor(() => expect(harness.result.current.isError).toBe(true));
    expect((harness.result.current.error as ApiError).status).toBe(409);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});
