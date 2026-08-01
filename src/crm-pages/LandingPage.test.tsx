import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { captureLocationHref } from "../../test/utils/location";
import { type AuthOverride, renderWithProviders } from "../../test/utils/renderWithProviders";
import LandingPage from "./LandingPage";

/**
 * The landing page adapts to the backend's DEPLOYMENT_MODE. Per CLAUDE.md a
 * `null` (still loading) mode must behave like "standalone", never like "saas".
 */
const renderPage = (auth: AuthOverride) => renderWithProviders(<LandingPage />, { auth });

describe("LandingPage — standalone install", () => {
  it("renders the marketing hero", async () => {
    renderPage({ authenticated: false, deploymentMode: "standalone" });
    expect(await screen.findAllByRole("heading")).not.toHaveLength(0);
  });

  it("hides the Pricing nav link and section — there is no self-serve billing", async () => {
    renderPage({ authenticated: false, deploymentMode: "standalone" });
    await screen.findAllByRole("heading");

    expect(screen.queryByRole("heading", { name: /Simple, transparent plans/ })).not.toBeInTheDocument();
    // The nav drops the anchor; only the static footer list still mentions it.
    expect(screen.queryByRole("link", { name: "Pricing" })?.getAttribute("href")).not.toBe("#pricing");
  });

  // The footer's link list is static, so "Pricing" still shows there in
  // standalone mode even though the section it points at is never rendered.
  it("still lists Pricing in the static footer link list", async () => {
    renderPage({ authenticated: false, deploymentMode: "standalone" });
    await screen.findAllByRole("heading");

    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });
});

describe("LandingPage — saas install", () => {
  it("shows the Pricing nav link and section", async () => {
    renderPage({ authenticated: false, deploymentMode: "saas" });

    expect(await screen.findByRole("heading", { name: /Simple, transparent plans/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Pricing" }).some((a) => a.getAttribute("href") === "#pricing")).toBe(true);
  });
});

describe("LandingPage — loading-safe default", () => {
  it("treats a still-loading deployment mode as standalone, not saas", async () => {
    // No /api/auth/session handler resolves yet, so deploymentMode stays null.
    renderWithProviders(<LandingPage />, { auth: false });

    await waitFor(() => expect(screen.getAllByRole("heading").length).toBeGreaterThan(0));
    expect(screen.queryByRole("heading", { name: /Simple, transparent plans/ })).not.toBeInTheDocument();
  });
});

describe("LandingPage — authentication entry points", () => {
  it("sends an anonymous visitor to the server-side login route", async () => {
    const { assign, restore } = captureLocationHref();
    try {
      const { user } = renderPage({ authenticated: false, deploymentMode: "standalone" });
      const signIn = await screen.findAllByRole("button", { name: /Sign in|Log in/i });

      await user.click(signIn[0]);
      expect(assign).toHaveBeenCalledWith("/api/auth/login");
    } finally {
      restore();
    }
  });

  it("aliases register to login in standalone mode — no orphan Keycloak accounts", async () => {
    const { assign, restore } = captureLocationHref();
    try {
      const { user } = renderPage({ authenticated: false, deploymentMode: "standalone" });
      // In standalone the CTA reads "Sign in" and calls register(), which
      // aliases to login() so no orphan Keycloak account can be created.
      const ctas = await screen.findAllByRole("button", { name: "Sign in" });

      await user.click(ctas[ctas.length - 1]);
      expect(assign).toHaveBeenCalledWith("/api/auth/login");
      expect(assign).not.toHaveBeenCalledWith("/api/auth/login?register=true");
    } finally {
      restore();
    }
  });

  it("uses Keycloak's registration form in saas mode", async () => {
    const { assign, restore } = captureLocationHref();
    try {
      const { user } = renderPage({ authenticated: false, deploymentMode: "saas" });
      const ctas = await screen.findAllByRole("button", { name: /Get started/i });

      await user.click(ctas[0]);
      expect(assign).toHaveBeenCalledWith("/api/auth/login?register=true");
    } finally {
      restore();
    }
  });
});
