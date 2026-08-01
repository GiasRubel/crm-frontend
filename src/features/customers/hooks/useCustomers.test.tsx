import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../../test/msw/server";
import {
  expectInvalidates,
  renderFeatureHook,
  renderFeatureHookWithProps,
} from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import type { Customer, CustomerListResponse, CustomerQuery } from "../types";
import { useCustomers, useDebouncedValue } from "./useCustomers";

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: "c1",
  keycloakId: "kc-c1",
  email: "ann@acme.com",
  firstName: "Ann",
  lastName: "Bee",
  phone: "555-0100",
  company: "Acme",
  status: "active",
  createdBy: "u1",
  assignedToId: null,
  assignedToName: null,
  assignedTeamId: null,
  assignedTeamName: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const list = (data: Customer[] = [customer()]): CustomerListResponse => ({
  data,
  meta: { total: data.length, page: 1, limit: 10, totalPages: 1 },
});

const stats = { total: 1, active: 1, inactive: 0, prospect: 0, newThisMonth: 1 };

function mockList(response: CustomerListResponse = list()) {
  server.use(
    http.get("/api/backend/customers", () => HttpResponse.json(response)),
    http.get("/api/backend/customers/stats", () => HttpResponse.json(stats)),
  );
}

describe("useCustomers — list query", () => {
  it("loads the customer list and stats", async () => {
    mockList();
    const { result } = renderFeatureHook(() => useCustomers({}));

    await waitFor(() => expect(result.current.customersQuery.isSuccess).toBe(true));
    expect(result.current.customersQuery.data?.data[0].email).toBe("ann@acme.com");

    await waitFor(() => expect(result.current.statsQuery.isSuccess).toBe(true));
    expect(result.current.statsQuery.data).toEqual(stats);
  });

  it("forwards the query object to the API as filters", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/customers", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list());
      }),
      http.get("/api/backend/customers/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useCustomers({ search: "acme", status: "active", page: 2 }));
    await waitFor(() => expect(result.current.customersQuery.isSuccess).toBe(true));

    expect(seen?.searchParams.get("search")).toBe("acme");
    expect(seen?.searchParams.get("status")).toBe("active");
    expect(seen?.searchParams.get("page")).toBe("2");
  });

  it("surfaces an ApiError with its status when the request fails", async () => {
    server.use(
      http.get("/api/backend/customers", () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
      http.get("/api/backend/customers/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(result.current.customersQuery.isError).toBe(true));

    const error = result.current.customersQuery.error as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.message).toBe("Forbidden");
  });

  it("keeps the previous page's data visible while the next page loads", async () => {
    mockList(list([customer({ id: "c1", firstName: "Page1" })]));
    const { result, rerender } = renderFeatureHookWithProps(useCustomers, {} as CustomerQuery);
    await waitFor(() => expect(result.current.customersQuery.data?.data[0].firstName).toBe("Page1"));

    // Gate page 2's response so we can observe the in-flight state.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get("/api/backend/customers", async () => {
        await gate;
        return HttpResponse.json(list([customer({ id: "c2", firstName: "Page2" })]));
      }),
    );

    rerender({ page: 2 });
    // Still showing page 1 rather than flashing an empty table.
    await waitFor(() => expect(result.current.customersQuery.isPlaceholderData).toBe(true));
    expect(result.current.customersQuery.data?.data[0].firstName).toBe("Page1");

    release();
    await waitFor(() => expect(result.current.customersQuery.data?.data[0].firstName).toBe("Page2"));
  });

  it("uses a JSON hash so structurally different query objects are separate cache entries", async () => {
    const calls: string[] = [];
    server.use(
      http.get("/api/backend/customers", ({ request }) => {
        calls.push(new URL(request.url).search);
        return HttpResponse.json(list());
      }),
      http.get("/api/backend/customers/stats", () => HttpResponse.json(stats)),
    );

    const { result, rerender } = renderFeatureHookWithProps<CustomerQuery, ReturnType<typeof useCustomers>>(
      useCustomers,
      { search: "a" },
    );
    await waitFor(() => expect(result.current.customersQuery.isSuccess).toBe(true));

    rerender({ search: "b" });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls).toEqual(["?search=a", "?search=b"]);
  });
});

describe("useCustomers — mutations", () => {
  const created = customer({ id: "c9" });

  it("createCustomer posts and invalidates the customers cache", async () => {
    mockList();
    server.use(http.post("/api/backend/customers", () => HttpResponse.json(created)));

    const harness = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(harness.result.current.customersQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.createCustomerMutation.mutateAsync({
        email: "new@acme.com",
        firstName: "New",
        lastName: "Person",
        phone: "555",
      });
    });

    await expectInvalidates(harness, ["customers"]);
  });

  it("updateCustomer patches by id and invalidates", async () => {
    mockList();
    let seenPath: string | undefined;
    server.use(
      http.patch("/api/backend/customers/:id", ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json(created);
      }),
    );

    const harness = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(harness.result.current.customersQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.updateCustomerMutation.mutateAsync({
        id: "c1",
        data: { status: "inactive" },
      });
    });

    expect(seenPath).toBe("/api/backend/customers/c1");
    await expectInvalidates(harness, ["customers"]);
  });

  it("deleteCustomer invalidates", async () => {
    mockList();
    server.use(http.delete("/api/backend/customers/:id", () => new HttpResponse(null, { status: 204 })));

    const harness = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(harness.result.current.customersQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.deleteCustomerMutation.mutateAsync("c1");
    });

    await expectInvalidates(harness, ["customers"]);
  });

  it("assignCustomer also invalidates teams — routing changes team counts", async () => {
    mockList();
    server.use(http.patch("/api/backend/customers/:id/assign", () => HttpResponse.json(created)));

    const harness = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(harness.result.current.customersQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.assignCustomerMutation.mutateAsync({
        id: "c1",
        data: { assignedTeamId: "t1" },
      });
    });

    await expectInvalidates(harness, ["customers", "teams"]);
  });

  it("resendInvitation does NOT invalidate — nothing about the record changed", async () => {
    mockList();
    server.use(http.post("/api/backend/customers/:id/resend", () => new HttpResponse(null, { status: 204 })));

    const harness = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(harness.result.current.customersQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.resendInvitationMutation.mutateAsync("c1");
    });

    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("a failed mutation surfaces the ApiError and invalidates nothing", async () => {
    mockList();
    server.use(
      http.post("/api/backend/customers", () =>
        HttpResponse.json({ message: ["email must be an email"] }, { status: 400 }),
      ),
    );

    const harness = renderFeatureHook(() => useCustomers({}));
    await waitFor(() => expect(harness.result.current.customersQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.createCustomerMutation
        .mutateAsync({ email: "bad", firstName: "A", lastName: "B", phone: "1" })
        .catch(() => {});
    });

    await waitFor(() => expect(harness.result.current.createCustomerMutation.isError).toBe(true));
    const error = harness.result.current.createCustomerMutation.error as ApiError;
    expect(error.status).toBe(400);
    expect(error.message).toBe("email must be an email");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("useDebouncedValue", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("a"));
    expect(result.current).toBe("a");
  });

  it("delays updates until the debounce window elapses", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "a" },
      });

      rerender({ value: "b" });
      expect(result.current).toBe("a");

      act(() => vi.advanceTimersByTime(299));
      expect(result.current).toBe("a");

      act(() => vi.advanceTimersByTime(1));
      expect(result.current).toBe("b");
    } finally {
      vi.useRealTimers();
    }
  });

  it("only emits the last value in a burst of keystrokes", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "" },
      });

      for (const value of ["a", "ac", "acm", "acme"]) {
        rerender({ value });
        act(() => vi.advanceTimersByTime(100));
      }
      expect(result.current).toBe("");

      act(() => vi.advanceTimersByTime(300));
      expect(result.current).toBe("acme");
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours a custom delay", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 50), {
        initialProps: { value: "a" },
      });
      rerender({ value: "b" });
      act(() => vi.advanceTimersByTime(50));
      expect(result.current).toBe("b");
    } finally {
      vi.useRealTimers();
    }
  });
});
