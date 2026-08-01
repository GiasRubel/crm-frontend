import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { captureLocationHref } from "../../test/utils/location";
import { setPathname } from "../../test/utils/nextNavigation";
import { adminUser, renderWithProviders } from "../../test/utils/renderWithProviders";
import { Header } from "./Header";

describe("Header — page title", () => {
  it.each([
    ["/dashboard", "Dashboard"],
    ["/leads", "Leads"],
    ["/opportunities", "Opportunities"],
    ["/kb", "Knowledge Base"],
    ["/automations", "Automations"],
  ])("shows %s as %s", async (pathname, title) => {
    setPathname(pathname);
    renderWithProviders(<Header />);
    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
  });

  it('falls back to "CRM Pro" on an unmapped route', async () => {
    setPathname("/leads/abc123");
    renderWithProviders(<Header />);
    expect(await screen.findByRole("heading", { name: "CRM Pro" })).toBeInTheDocument();
  });
});

describe("Header — user identity", () => {
  it("shows the full name and role once the session resolves", async () => {
    renderWithProviders(<Header />, { auth: { user: adminUser } });

    expect(await screen.findByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows initials in the avatar fallback", async () => {
    renderWithProviders(<Header />, { auth: { user: adminUser } });
    expect(await screen.findByText("AA")).toBeInTheDocument();
  });

  it("falls back to the username when there is no first/last name", async () => {
    renderWithProviders(<Header />, {
      auth: { user: { ...adminUser, firstName: "", lastName: "" } },
    });
    expect(await screen.findByText("admin")).toBeInTheDocument();
  });

  it("falls back to the email when there is no name or username", async () => {
    renderWithProviders(<Header />, {
      auth: { user: { ...adminUser, firstName: "", lastName: "", username: "" } },
    });
    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
  });

  it('shows a "Loading..." placeholder before the session resolves', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("??")).toBeInTheDocument();
  });

  it("shows an unauthenticated header without crashing", async () => {
    renderWithProviders(<Header />, { auth: { authenticated: false } });
    await waitFor(() => expect(screen.getByText("User")).toBeInTheDocument());
  });
});

describe("Header — account menu", () => {
  it("opens the account menu on click", async () => {
    const { user } = renderWithProviders(<Header />, { auth: { user: adminUser } });
    await screen.findByText("Ada Admin");

    await user.click(screen.getByText("Ada Admin"));

    expect(await screen.findByText("My Account")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Profile/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Settings/ })).toBeInTheDocument();
  });

  it("logs out through the server-side route", async () => {
    const { assign, restore } = captureLocationHref();
    try {
      const { user } = renderWithProviders(<Header />, { auth: { user: adminUser } });
      await screen.findByText("Ada Admin");

      await user.click(screen.getByText("Ada Admin"));
      await user.click(await screen.findByRole("menuitem", { name: /Log out/ }));

      expect(assign).toHaveBeenCalledWith("/api/auth/logout");
    } finally {
      restore();
    }
  });
});

describe("Header — search", () => {
  it("renders a search input", async () => {
    renderWithProviders(<Header />);
    expect(await screen.findByPlaceholderText("Search everything...")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    const { user } = renderWithProviders(<Header />);
    const input = await screen.findByPlaceholderText("Search everything...");

    await user.type(input, "acme");
    expect(input).toHaveValue("acme");
  });
});
