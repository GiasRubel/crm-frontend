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
  paged,
} from "../../test/utils/pageHarness";
import {
  adminUser,
  customerUser,
  renderWithProviders,
  staffUser,
} from "../../test/utils/renderWithProviders";
import type { Ticket } from "@/features/tickets/types";
import { TicketsPage } from "./TicketsPage";

const ticket = (overrides: Partial<Ticket> = {}): Ticket =>
  ({
    id: "t1",
    number: 1001,
    subject: "Cannot log in",
    description: "500 error on submit",
    status: "open",
    priority: "high",
    type: "problem",
    customerId: "c1",
    customerName: "Ann Bee",
    comments: [],
    relatedArticleIds: [],
    assignedToId: null,
    assignedToName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Ticket;

const stats = { total: 6, open: 3, pending: 1, resolved: 1, closed: 1, unassigned: 2 };

const mockStaffPage = (tickets: Ticket[] = [ticket()], total = tickets.length) =>
  mockGets({ "/tickets": paged(tickets, { total }), "/tickets/stats": stats });

const renderStaff = (auth = { user: adminUser }) => renderWithProviders(<TicketsPage />, { auth });

describe("TicketsPage — role routing", () => {
  it("renders the staff helpdesk for an admin", async () => {
    mockStaffPage();
    renderStaff();
    expect(await screen.findByRole("heading", { name: "Tickets" })).toBeInTheDocument();
  });

  it("renders the staff helpdesk for a sales rep", async () => {
    mockStaffPage();
    renderStaff({ user: staffUser });
    expect(await screen.findByRole("heading", { name: "Tickets" })).toBeInTheDocument();
  });

  it("renders the customer portal for a Customer, never the staff queue", async () => {
    mockGets({ "/tickets/my": [ticket()] });
    renderWithProviders(<TicketsPage />, { auth: { user: customerUser } });

    expect(await screen.findByRole("heading", { name: "Support" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tickets" })).not.toBeInTheDocument();
  });

  it("the portal reads /tickets/my, not the staff list endpoint", async () => {
    const paths: string[] = [];
    server.use(
      http.get("/api/backend/tickets/my", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json([ticket()]);
      }),
    );

    renderWithProviders(<TicketsPage />, { auth: { user: customerUser } });
    await screen.findByRole("heading", { name: "Support" });

    await waitFor(() => expect(paths).toContain("/api/backend/tickets/my"));
    expect(paths.some((p) => p === "/api/backend/tickets")).toBe(false);
  });
});

describe("TicketsPage — staff loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/tickets");
    mockGets({ "/tickets/stats": stats });
    renderStaff();
    expect(await screen.findByText(/Fetching tickets/)).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockStaffPage([]);
    renderStaff();
    expect(await screen.findByText("No tickets found")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/tickets", 500, "Helpdesk unavailable");
    mockGets({ "/tickets/stats": stats });
    renderStaff();
    expect(await screen.findByText("Helpdesk unavailable")).toBeInTheDocument();
  });
});

describe("TicketsPage — staff queue", () => {
  it("renders the ticket subject and requesting customer", async () => {
    mockStaffPage();
    renderStaff();

    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
    expect(screen.getByText("Ann Bee")).toBeInTheDocument();
  });

  it("renders the queue stats", async () => {
    mockStaffPage();
    renderStaff();
    await screen.findByText("Cannot log in");

    // Stat cards show Open / In Progress / Unassigned / Urgent — not the total.
    // (Several of those words also appear as filter options and row badges, so
    // assert on the card labels specifically.)
    const cardLabels = [...document.querySelectorAll("p.uppercase")].map((el) => el.textContent);
    expect(cardLabels).toEqual(expect.arrayContaining(["Open", "In Progress", "Unassigned", "Urgent"]));
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("debounces the search term", async () => {
    const searches: string[] = [];
    mockStaffPage();
    const { user } = renderStaff();
    await screen.findByText("Cannot log in");

    server.use(
      http.get("/api/backend/tickets", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([ticket()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search number/), "login");

    await waitFor(() => expect(searches).toContain("login"));
    expect(searches.filter((s) => s === "login")).toHaveLength(1);
  });
});

describe("TicketsPage — staff status changes", () => {
  it("resolves a ticket from the row menu", async () => {
    mockStaffPage();
    const write = captureWrite("patch", "/tickets/:id/status", () => HttpResponse.json(ticket()) as unknown as Response);
    const { user } = renderStaff();
    await screen.findByText("Cannot log in");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Mark resolved/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/tickets/t1/status");
    expect(write.body).toEqual({ status: "resolved" });
  });

  it("reopens a closed ticket", async () => {
    mockStaffPage([ticket({ status: "closed" })]);
    const write = captureWrite("patch", "/tickets/:id/status", () => HttpResponse.json(ticket()) as unknown as Response);
    const { user } = renderStaff();
    await screen.findByText("Cannot log in");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Reopen/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toEqual({ status: "open" });
  });
});

describe("TicketsPage — staff role gating", () => {
  it("hides delete from a non-admin", async () => {
    mockStaffPage();
    const { user } = renderStaff({ user: staffUser });
    await screen.findByText("Cannot log in");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    expect(await screen.findByRole("menuitem", { name: /Open conversation/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Delete ticket/ })).not.toBeInTheDocument();
  });

  it("offers delete to an admin", async () => {
    mockStaffPage();
    const { user } = renderStaff();
    await screen.findByText("Cannot log in");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    expect(await screen.findByRole("menuitem", { name: /Delete ticket/ })).toBeInTheDocument();
  });

  it("requires confirmation before deleting", async () => {
    mockStaffPage();
    const write = captureWrite("delete", "/tickets/:id");
    const { user } = renderStaff();
    await screen.findByText("Cannot log in");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete ticket/ }));

    expect(await screen.findByText("Delete ticket?")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });
});

describe("TicketsPage — customer portal", () => {
  it("lists the signed-in customer's own tickets", async () => {
    mockGets({ "/tickets/my": [ticket()] });
    renderWithProviders(<TicketsPage />, { auth: { user: customerUser } });

    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
  });

  it("shows a loading state first", async () => {
    mockPending("/tickets/my");
    renderWithProviders(<TicketsPage />, { auth: { user: customerUser } });

    expect(await screen.findByText(/Loading your tickets/)).toBeInTheDocument();
  });

  it("creates a ticket without letting the customer choose the customer id", async () => {
    mockGets({ "/tickets/my": [] });
    const write = captureWrite("post", "/tickets/my", () => HttpResponse.json(ticket()) as unknown as Response);
    const { user } = renderWithProviders(<TicketsPage />, { auth: { user: customerUser } });
    await screen.findByRole("heading", { name: "Support" });

    await user.click(screen.getByRole("button", { name: /New Ticket/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Subject/), "Cannot export");
    await user.type(fieldByLabel(dialog, /What happened/), "The CSV button does nothing");
    await user.click(screen.getByRole("button", { name: /^Create Ticket$|^Submit/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ subject: "Cannot export" });
    expect(write.body).not.toHaveProperty("customerId");
  });

  it("blocks an empty portal submission with zod messages", async () => {
    mockGets({ "/tickets/my": [] });
    const write = captureWrite("post", "/tickets/my");
    const { user } = renderWithProviders(<TicketsPage />, { auth: { user: customerUser } });
    await screen.findByRole("heading", { name: "Support" });

    await user.click(screen.getByRole("button", { name: /New Ticket/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Ticket$|^Submit/ }));

    expect(await screen.findByText("Subject is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });
});
