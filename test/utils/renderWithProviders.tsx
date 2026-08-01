import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactElement, ReactNode } from "react";
import { KeycloakProvider, type UserProfile } from "@/providers/keycloak-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { server } from "../msw/server";

/** A fresh client per test: no retries (errors surface immediately) and no cache bleed. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export const adminUser: UserProfile = {
  id: "u-admin",
  keycloakId: "kc-admin",
  email: "admin@example.com",
  username: "admin",
  firstName: "Ada",
  lastName: "Admin",
  role: "Admin",
};

export const staffUser: UserProfile = { ...adminUser, id: "u-staff", keycloakId: "kc-staff", username: "sam", email: "sam@example.com", firstName: "Sam", lastName: "Staff", role: "SalesRep" };

export const customerUser: UserProfile = { ...adminUser, id: "u-cust", keycloakId: "kc-cust", username: "cass", email: "cass@example.com", firstName: "Cass", lastName: "Customer", role: "Customer" };

export interface AuthOverride {
  authenticated?: boolean;
  user?: UserProfile | null;
  deploymentMode?: "standalone" | "saas";
  /** Subscription probe result; only fetched in saas mode for non-PlatformAdmins. */
  subscriptionStatus?: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
}

/**
 * Auth is driven through msw rather than by mocking the provider module: the
 * browser's only auth input is `GET /api/auth/session`, so overriding that
 * handler exercises the real `KeycloakProvider` code path.
 */
export function mockAuthSession(auth: AuthOverride = {}) {
  const {
    authenticated = true,
    user = authenticated ? adminUser : null,
    deploymentMode = "standalone",
    subscriptionStatus = "active",
  } = auth;

  server.use(
    http.get("/api/auth/session", () =>
      HttpResponse.json({ authenticated, user, deploymentMode }),
    ),
    http.get("/api/backend/subscriptions/me", () =>
      HttpResponse.json({ status: subscriptionStatus }),
    ),
  );
}

interface Options extends Omit<RenderOptions, "wrapper"> {
  auth?: AuthOverride | false;
  queryClient?: QueryClient;
}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Renders through the same provider stack as `src/providers/index.tsx`, minus
 * the production QueryClient defaults (see `createTestQueryClient`).
 */
export function renderWithProviders(
  ui: ReactElement,
  { auth, queryClient = createTestQueryClient(), ...options }: Options = {},
): RenderWithProvidersResult {
  if (auth !== false) mockAuthSession(auth ?? {});

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <KeycloakProvider>{children}</KeycloakProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

  return {
    ...render(ui, { wrapper, ...options }),
    queryClient,
    user: userEvent.setup(),
  };
}

/** Wrapper for `renderHook` on feature hooks — Query only, no auth fetch. */
export function queryWrapper(queryClient = createTestQueryClient()) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}
