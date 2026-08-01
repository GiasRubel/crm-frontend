import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, type RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, vi, type MockInstance } from "vitest";
import { createTestQueryClient } from "./renderWithProviders";

export type InvalidateSpy = MockInstance<QueryClient["invalidateQueries"]>;

export interface FeatureHookResult<T> extends RenderHookResult<T, unknown> {
  queryClient: QueryClient;
  /** Spy on invalidateQueries — mutation onSuccess wiring is asserted through it. */
  invalidate: InvalidateSpy;
  /** Top-level key strings passed to invalidateQueries, in call order. */
  invalidatedKeys: () => string[];
}

/**
 * Renders a feature hook inside a fresh QueryClient and instruments cache
 * invalidation. Network stays real (msw) so services are exercised end to end.
 */
export function renderFeatureHook<T>(
  hook: () => T,
  queryClient: QueryClient = createTestQueryClient(),
): FeatureHookResult<T> {
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    ...renderHook(hook, { wrapper }),
    queryClient,
    invalidate,
    invalidatedKeys: () =>
      invalidate.mock.calls.map((call) => String((call[0] as { queryKey?: unknown[] } | undefined)?.queryKey?.[0])),
  };
}

export interface FeatureHookWithPropsResult<P, T> extends RenderHookResult<T, P> {
  queryClient: QueryClient;
  invalidate: InvalidateSpy;
  invalidatedKeys: () => string[];
}

/**
 * Same as `renderFeatureHook` but keeps the hook's argument as a rerenderable
 * prop, sharing one QueryClient across rerenders — needed to observe
 * `keepPreviousData` and query-key hashing when filters change.
 */
export function renderFeatureHookWithProps<P, T>(
  hook: (props: P) => T,
  initialProps: P,
  queryClient: QueryClient = createTestQueryClient(),
): FeatureHookWithPropsResult<P, T> {
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    ...renderHook(hook, { wrapper, initialProps }),
    queryClient,
    invalidate,
    invalidatedKeys: () =>
      invalidate.mock.calls.map((call) => String((call[0] as { queryKey?: unknown[] } | undefined)?.queryKey?.[0])),
  };
}

/**
 * Asserts a mutation's onSuccess invalidated exactly the given top-level keys
 * (order-insensitive, duplicates collapsed).
 */
export async function expectInvalidates(
  harness: Pick<FeatureHookResult<unknown>, "invalidate" | "invalidatedKeys">,
  keys: string[],
) {
  await waitFor(() => expect(harness.invalidate).toHaveBeenCalled());
  expect([...new Set(harness.invalidatedKeys())].sort()).toEqual([...new Set(keys)].sort());
}
