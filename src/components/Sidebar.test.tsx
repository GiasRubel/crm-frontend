import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { captureLocationHref } from "../../test/utils/location";
import { setPathname } from "../../test/utils/nextNavigation";
import {
  adminUser,
  customerUser,
  renderWithProviders,
  staffUser,
} from "../../test/utils/renderWithProviders";
import { Sidebar } from "./Sidebar";

const linkNames = () =>
  screen
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"))
    .filter(Boolean);

describe("Sidebar — staff navigation", () => {
  it("shows the CRM and Support sections for a sales rep", async () => {
    renderWithProviders(<Sidebar />, { auth: { user: staffUser } });
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());

    expect(screen.getByText("Main Menu")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    for (const label of ["Leads", "Opportunities", "Customers", "Accounts", "Contacts", "Teams", "Activities"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("hides the Administration section from non-admins", async () => {
    renderWithProviders(<Sidebar />, { auth: { user: staffUser } });
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument());

    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
    expect(screen.queryByText("Automations")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });
});

describe("Sidebar — admin navigation", () => {
  it("shows Automations and Users to an Admin", async () => {
    renderWithProviders(<Sidebar />, { auth: { user: adminUser } });
    await waitFor(() => expect(screen.getByText("Administration")).toBeInTheDocument());

    expect(screen.getByText("Automations")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(linkNames()).toContain("/automations");
    expect(linkNames()).toContain("/users");
  });

  it('also accepts the "Administrator" spelling of the admin role', async () => {
    renderWithProviders(<Sidebar />, { auth: { user: { ...adminUser, role: "Administrator" } } });
    await waitFor(() => expect(screen.getByText("Administration")).toBeInTheDocument());
  });
});

describe("Sidebar — customer portal navigation", () => {
  it("shows only Dashboard, Support Tickets and Help Center", async () => {
    renderWithProviders(<Sidebar />, { auth: { user: customerUser } });
    await waitFor(() => expect(screen.getByText("Support Tickets")).toBeInTheDocument());

    expect(screen.getByText("Menu")).toBeInTheDocument();
    expect(screen.getByText("Help Center")).toBeInTheDocument();
  });

  it("hides every internal CRM destination", async () => {
    renderWithProviders(<Sidebar />, { auth: { user: customerUser } });
    await waitFor(() => expect(screen.getByText("Support Tickets")).toBeInTheDocument());

    for (const href of ["/leads", "/opportunities", "/customers", "/accounts", "/contacts", "/teams", "/activities", "/reports", "/kb", "/automations", "/users"]) {
      expect(linkNames()).not.toContain(href);
    }
  });
});

describe("Sidebar — active route highlighting", () => {
  it("marks the current route as active", async () => {
    setPathname("/leads");
    renderWithProviders(<Sidebar />, { auth: { user: staffUser } });
    await waitFor(() => expect(screen.getByText("Leads")).toBeInTheDocument());

    const leadsLink = screen.getByRole("link", { name: /Leads/ });
    expect(within(leadsLink).getByRole("button")).toHaveClass("bg-indigo-50");
  });

  it("keeps the parent nav item active on a nested route", async () => {
    setPathname("/leads/abc123");
    renderWithProviders(<Sidebar />, { auth: { user: staffUser } });
    await waitFor(() => expect(screen.getByText("Leads")).toBeInTheDocument());

    const leadsLink = screen.getByRole("link", { name: /Leads/ });
    expect(within(leadsLink).getByRole("button")).toHaveClass("bg-indigo-50");
  });

  it("does not activate a sibling route with a shared prefix", async () => {
    setPathname("/contacts");
    renderWithProviders(<Sidebar />, { auth: { user: staffUser } });
    await waitFor(() => expect(screen.getByText("Contacts")).toBeInTheDocument());

    const customersLink = screen.getByRole("link", { name: /Customers/ });
    expect(within(customersLink).getByRole("button")).not.toHaveClass("bg-indigo-50");
  });
});

describe("Sidebar — logout", () => {
  it("sends the browser to the server-side logout route", async () => {
    const { assign, restore } = captureLocationHref();
    try {
      const { user } = renderWithProviders(<Sidebar />, { auth: { user: staffUser } });
      await waitFor(() => expect(screen.getByText("Logout")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /Logout/ }));
      expect(assign).toHaveBeenCalledWith("/api/auth/logout");
    } finally {
      restore();
    }
  });
});
