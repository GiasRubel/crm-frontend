import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/keycloak-provider";
import { useTheme } from "@/providers/theme-provider";
import { customerUser, renderWithProviders, staffUser } from "./renderWithProviders";

/** Guards the shared harness itself — if this breaks, every other suite lies. */

function AuthProbe() {
  const { isLoading, authenticated, user, deploymentMode, subscriptionStatus } = useAuth();
  if (isLoading) return <p>loading</p>;
  return (
    <dl>
      <dd data-testid="authenticated">{String(authenticated)}</dd>
      <dd data-testid="role">{user?.role ?? "none"}</dd>
      <dd data-testid="mode">{deploymentMode ?? "null"}</dd>
      <dd data-testid="subscription">{subscriptionStatus ?? "null"}</dd>
    </dl>
  );
}

function ThemeProbe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

describe("renderWithProviders", () => {
  it("renders a shadcn primitive inside the full provider stack", () => {
    renderWithProviders(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("provides the theme context", () => {
    renderWithProviders(<ThemeProbe />);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("defaults to an authenticated admin in standalone mode", async () => {
    renderWithProviders(<AuthProbe />);
    expect(await screen.findByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("role")).toHaveTextContent("Admin");
    expect(screen.getByTestId("mode")).toHaveTextContent("standalone");
    // standalone installs skip the billing probe and pin the status to active
    expect(screen.getByTestId("subscription")).toHaveTextContent("active");
  });

  it("honours a role override", async () => {
    renderWithProviders(<AuthProbe />, { auth: { user: staffUser } });
    expect(await screen.findByTestId("role")).toHaveTextContent("SalesRep");
  });

  it("honours an unauthenticated override", async () => {
    renderWithProviders(<AuthProbe />, { auth: { authenticated: false } });
    expect(await screen.findByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });

  it("fetches the real subscription status in saas mode", async () => {
    renderWithProviders(<AuthProbe />, {
      auth: { user: customerUser, deploymentMode: "saas", subscriptionStatus: "past_due" },
    });
    expect(await screen.findByTestId("subscription")).toHaveTextContent("past_due");
  });

  it("exposes a fresh QueryClient per render with retries disabled", () => {
    const { queryClient } = renderWithProviders(<Button>x</Button>);
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    const { queryClient: other } = renderWithProviders(<Button>y</Button>);
    expect(other).not.toBe(queryClient);
  });
});
