import { fireEvent, screen, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { fieldByLabel } from "../../test/utils/fields";
import { captureWrite, mockGetError, mockGets, mockPending } from "../../test/utils/pageHarness";
import { adminUser, renderWithProviders, staffUser } from "../../test/utils/renderWithProviders";
import type { Opportunity } from "@/features/opportunities/types";
import { OpportunitiesPage } from "./OpportunitiesPage";

const deal = (overrides: Partial<Opportunity> = {}): Opportunity =>
  ({
    id: "o1",
    name: "Acme renewal",
    customerId: "c1",
    customerName: "Ann Bee",
    accountId: null,
    accountName: null,
    amount: 25_000,
    stage: "discovery",
    probability: 20,
    expectedCloseDate: "2026-06-30T00:00:00.000Z",
    notes: "Multi-year",
    lostReason: null,
    assignedToId: null,
    assignedToName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Opportunity;

const board = (items: Opportunity[] = [deal()]) => ({
  columns: [
    { stage: "discovery", opportunities: items, count: items.length, totalAmount: 25_000 },
    { stage: "proposal", opportunities: [], count: 0, totalAmount: 0 },
    { stage: "negotiation", opportunities: [], count: 0, totalAmount: 0 },
    { stage: "closed_won", opportunities: [], count: 0, totalAmount: 0 },
    { stage: "closed_lost", opportunities: [], count: 0, totalAmount: 0 },
  ],
});

const stats = { total: 1, open: 1, won: 0, lost: 0, totalValue: 25_000, weightedValue: 5_000 };

const mockPage = (items: Opportunity[] = [deal()]) =>
  mockGets({
    "/opportunities/board": board(items),
    "/opportunities/stats": stats,
    "/customers": { data: [{ id: "c1", firstName: "Ann", lastName: "Bee" }], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } },
    "/accounts": { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
  });

const renderPage = (auth = { user: adminUser }) =>
  renderWithProviders(<OpportunitiesPage />, { auth });

describe("OpportunitiesPage — loading and error", () => {
  it("shows a loading state for the pipeline", async () => {
    mockPending("/opportunities/board");
    mockGets({ "/opportunities/stats": stats });
    renderPage();
    expect(await screen.findByText("Loading pipeline...")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/opportunities/board", 500, "Pipeline unavailable");
    mockGets({ "/opportunities/stats": stats });
    renderPage();
    expect(await screen.findByText("Pipeline unavailable")).toBeInTheDocument();
  });
});

describe("OpportunitiesPage — Kanban board", () => {
  it("renders a deal card in its stage column", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Acme renewal")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });

  it("formats the deal amount as currency", async () => {
    mockPage();
    renderPage();
    await screen.findByText("Acme renewal");
    expect(screen.getAllByText(/\$25,000/).length).toBeGreaterThan(0);
  });

  it("renders every pipeline stage column, including the closed ones", async () => {
    mockPage();
    renderPage();
    await screen.findByText("Acme renewal");

    for (const label of ["Discovery", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders an empty board without crashing", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByText("Discovery")).toBeInTheDocument();
  });
});

describe("OpportunitiesPage — role gating", () => {
  it("shows Add Opportunity to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Opportunity/ })).toBeInTheDocument();
  });

  it("hides delete from a non-admin", async () => {
    mockPage();
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Acme renewal");

    await user.click(screen.getByRole("button", { name: "Deal actions" }));

    expect(await screen.findByRole("menuitem", { name: /Edit deal/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Delete/ })).not.toBeInTheDocument();
  });
});

describe("OpportunitiesPage — create dialog", () => {
  it("requires a deal name and a customer", async () => {
    mockPage();
    const write = captureWrite("post", "/opportunities");
    const { user } = renderPage();
    await screen.findByText("Acme renewal");

    await user.click(screen.getByRole("button", { name: /Add Opportunity/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Opportunity$|^Add Opportunity$|^Create Deal$/ }));

    expect(await screen.findByText("Deal name is required")).toBeInTheDocument();
    expect(screen.getByText("Pick a customer")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid deal", async () => {
    mockPage();
    const write = captureWrite("post", "/opportunities", () => HttpResponse.json(deal()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Acme renewal");

    await user.click(screen.getByRole("button", { name: /Add Opportunity/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Deal Name/), "Globex expansion");
    await user.selectOptions(fieldByLabel(dialog, /Customer/), "c1");
    const amount = fieldByLabel(dialog, /Amount/);
    await user.clear(amount);
    await user.type(amount, "5000");
    await user.click(screen.getByRole("button", { name: /^Create Opportunity$|^Add Opportunity$|^Create Deal$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ name: "Globex expansion", customerId: "c1", amount: 5000 });
  });
});

describe("OpportunitiesPage — stage moves", () => {
  it("requires a lost reason before closing a deal as lost", async () => {
    mockPage();
    const write = captureWrite("patch", "/opportunities/:id/stage");
    const { user } = renderPage();
    await screen.findByText("Acme renewal");

    await user.click(screen.getByRole("button", { name: "Deal actions" }));
    // "Move to stage" opens a Radix submenu holding the stage options.
    await user.click(await screen.findByRole("menuitem", { name: /Move to stage/ }));
    // Radix sub-menu items close on user-event's pointer sequence, so click directly.
    fireEvent.click(await screen.findByRole("menuitem", { name: "Closed Lost" }));

    expect(await screen.findByText("Mark deal as lost")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("sends the stage and lost reason once confirmed", async () => {
    mockPage();
    const write = captureWrite("patch", "/opportunities/:id/stage", () => HttpResponse.json(deal()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Acme renewal");

    await user.click(screen.getByRole("button", { name: "Deal actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Move to stage/ }));
    // Radix sub-menu items close on user-event's pointer sequence, so click directly.
    fireEvent.click(await screen.findByRole("menuitem", { name: "Closed Lost" }));
    await screen.findByText("Mark deal as lost");

    await user.type(await screen.findByPlaceholderText(/Chose a competitor/), "Budget cut");
    await user.click(await screen.findByRole("button", { name: /^Mark as Lost$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toEqual({ stage: "closed_lost", lostReason: "Budget cut" });
  });
});

describe("OpportunitiesPage — delete", () => {
  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/opportunities/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("Acme renewal");

    await user.click(screen.getByRole("button", { name: "Deal actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete deal/ }));
    expect(await screen.findByText("Delete deal?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Deal$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/opportunities/o1");
  });
});
