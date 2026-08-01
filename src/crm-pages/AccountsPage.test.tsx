import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { fieldByLabel } from "../../test/utils/fields";
import {
  captureWrite,
  mockGetError,
  mockGets,
  mockPending,
  mockWriteError,
  paged,
} from "../../test/utils/pageHarness";
import { adminUser, renderWithProviders, staffUser } from "../../test/utils/renderWithProviders";
import type { Account } from "@/features/accounts/types";
import { AccountsPage } from "./AccountsPage";

const account = (overrides: Partial<Account> = {}): Account =>
  ({
    id: "a1",
    name: "Acme Corporation",
    industry: "technology",
    website: "acme.com",
    email: "info@acme.com",
    phone: "555-0100",
    size: "51-200",
    annualRevenue: 1_000_000,
    address: "1 Main St",
    description: "Long-standing partner",
    status: "active",
    contactCount: 3,
    openDealCount: 2,
    createdBy: "u1",
    assignedToId: null,
    assignedToName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Account;

const stats = { total: 8, prospect: 2, active: 5, inactive: 1, newThisMonth: 3 };

const mockPage = (accounts: Account[] = [account()], total = accounts.length) =>
  mockGets({ "/accounts": paged(accounts, { total }), "/accounts/stats": stats });

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<AccountsPage />, { auth });

describe("AccountsPage — loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/accounts");
    mockGets({ "/accounts/stats": stats });
    renderPage();
    expect(await screen.findByText("Fetching accounts...")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByText("No accounts found")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/accounts", 500, "Accounts unavailable");
    mockGets({ "/accounts/stats": stats });
    renderPage();
    expect(await screen.findByText("Accounts unavailable")).toBeInTheDocument();
  });
});

describe("AccountsPage — populated list", () => {
  it("renders the company name and website", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Acme Corporation")).toBeInTheDocument();
    expect(screen.getByText(/acme\.com/)).toBeInTheDocument();
  });

  it("renders the linked contact and deal counts on the row", async () => {
    mockPage([account({ contactCount: 17, openDealCount: 42 })]);
    renderPage();
    await screen.findByText("Acme Corporation");

    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("AccountsPage — filters", () => {
  it("debounces the search term", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    server.use(
      http.get("/api/backend/accounts", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([account()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search by name/), "acme");

    await waitFor(() => expect(searches).toContain("acme"));
    expect(searches.filter((s) => s === "acme")).toHaveLength(1);
  });

  it("sends the industry filter", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    let seen: string | null = null;
    server.use(
      http.get("/api/backend/accounts", ({ request }) => {
        seen = new URL(request.url).searchParams.get("industry");
        return HttpResponse.json(paged([account()]));
      }),
    );

    const select = screen
      .getAllByRole("combobox")
      .find((el) => [...(el as HTMLSelectElement).options].some((o) => o.value === "technology"));
    await user.selectOptions(select!, "technology");

    await waitFor(() => expect(seen).toBe("technology"));
  });
});

describe("AccountsPage — role gating", () => {
  it("shows Add Account to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Account/ })).toBeInTheDocument();
  });

  // Unlike CustomersPage, the Add button here is NOT admin-gated — any signed-in
  // staff user can create an account. Pinning the current behaviour.
  it("also shows Add Account to a non-admin staff user", async () => {
    mockPage();
    renderPage({ user: staffUser });
    await screen.findByText("Acme Corporation");
    expect(screen.getByRole("button", { name: /Add Account/ })).toBeInTheDocument();
  });

  it("hides assignment from a non-admin", async () => {
    mockPage();
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Acme Corporation");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    expect(await screen.findByRole("menuitem", { name: /360° view/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Assign owner/ })).not.toBeInTheDocument();
  });
});

describe("AccountsPage — 360° summary", () => {
  it("only fetches the summary once the dialog is opened", async () => {
    mockPage();
    let called = false;
    server.use(
      http.get("/api/backend/accounts/:id/summary", () => {
        called = true;
        return HttpResponse.json({
          account: account(),
          contacts: [],
          opportunities: [],
          metrics: { contactCount: 3, openDealCount: 2, openValue: 50_000, wonValue: 10_000, lostValue: 0 },
        });
      }),
    );

    const { user } = renderPage();
    await screen.findByText("Acme Corporation");
    expect(called).toBe(false);

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /360° view/ }));

    await waitFor(() => expect(called).toBe(true));
    expect(await screen.findByText("Account 360° View")).toBeInTheDocument();
  });
});

describe("AccountsPage — create dialog", () => {
  it("requires a company name", async () => {
    mockPage();
    const write = captureWrite("post", "/accounts");
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    await user.click(screen.getByRole("button", { name: /Add Account/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Account$|^Add Account$/ }));

    expect(await screen.findByText("Company name is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid account", async () => {
    mockPage();
    const write = captureWrite("post", "/accounts", () => HttpResponse.json(account()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    await user.click(screen.getByRole("button", { name: /Add Account/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Company Name/), "Globex");
    await user.click(screen.getByRole("button", { name: /^Create Account$|^Add Account$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ name: "Globex" });
  });

  it("reports a server rejection without closing the dialog", async () => {
    mockPage();
    mockWriteError("post", "/accounts", 409, "An account with that name exists");
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    await user.click(screen.getByRole("button", { name: /Add Account/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(fieldByLabel(dialog, /Company Name/), "Globex");
    await user.click(screen.getByRole("button", { name: /^Create Account$|^Add Account$/ }));

    expect(await screen.findByText("An account with that name exists")).toBeInTheDocument();
  });
});

describe("AccountsPage — edit and delete", () => {
  it("pre-fills the edit form", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Edit account/ }));

    const dialog = await screen.findByRole("dialog");
    expect(fieldByLabel(dialog, /Company Name/)).toHaveValue("Acme Corporation");
  });

  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/accounts/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("Acme Corporation");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete account/ }));
    expect(await screen.findByText("Delete account?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Account$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/accounts/a1");
  });
});
