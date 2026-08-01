import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockGetError, mockGets, mockPending } from "../../test/utils/pageHarness";
import {
  adminUser,
  customerUser,
  renderWithProviders,
  staffUser,
} from "../../test/utils/renderWithProviders";
import { Dashboard } from "./Dashboard";

const dashboard = {
  totals: { customers: 42, activeCustomers: 30, openTickets: 7, pendingTasks: 5, overdueTasks: 2 },
  pipeline: {
    openCount: 12,
    openValue: 250_000,
    weightedValue: 90_000,
    wonThisMonthCount: 3,
    wonThisMonthValue: 60_000,
    winRate: 0.35,
    byStage: [
      { stage: "discovery", count: 5, totalAmount: 100_000, weightedAmount: 20_000 },
      { stage: "proposal", count: 4, totalAmount: 90_000, weightedAmount: 40_000 },
      { stage: "negotiation", count: 3, totalAmount: 60_000, weightedAmount: 30_000 },
      { stage: "closed_won", count: 3, totalAmount: 60_000, weightedAmount: 60_000 },
      { stage: "closed_lost", count: 1, totalAmount: 10_000, weightedAmount: 0 },
    ],
  },
  funnel: {
    totalLeads: 50,
    new: 20,
    contacted: 15,
    qualified: 10,
    unqualified: 3,
    converted: 2,
    conversionRate: 0.04,
  },
  revenueByMonth: [
    { month: "2026-05", wonValue: 20_000, wonCount: 1 },
    { month: "2026-06", wonValue: 40_000, wonCount: 2 },
  ],
  leadsBySource: [
    { key: "referral", label: "Referral", count: 20 },
    { key: "web_form", label: "Web form", count: 30 },
  ],
  topReps: [
    { ownerId: "kc-staff", ownerName: "Sam Staff", wonCount: 3, wonValue: 60_000, openCount: 4, openValue: 80_000, winRate: 0.4 },
  ],
};

const teamPerformance = {
  reps: dashboard.topReps,
  teams: [
    { teamId: "t1", teamName: "EMEA Sales", memberCount: 4, wonCount: 3, wonValue: 60_000, openCount: 4, openValue: 80_000, winRate: 0.4 },
  ],
};

const mockStaff = () =>
  mockGets({
    "/reports/dashboard": dashboard,
    "/reports/team-performance": teamPerformance,
  });

describe("Dashboard — loading and error", () => {
  it("shows a loading state", async () => {
    mockPending("/reports/dashboard");
    mockGets({ "/reports/team-performance": teamPerformance });
    renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    expect(await screen.findByText(/Loading your dashboard/)).toBeInTheDocument();
  });

  it("shows an error state rather than a blank page", async () => {
    mockGetError("/reports/dashboard", 500, "Analytics unavailable");
    mockGets({ "/reports/team-performance": teamPerformance });
    renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    expect(await screen.findByText(/Analytics unavailable|Failed/)).toBeInTheDocument();
  });
});

describe("Dashboard — staff view", () => {
  it("renders the headline totals", async () => {
    mockStaff();
    renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    // The card headline is activeCustomers; the total is the sub-label.
    expect(await screen.findByText("30")).toBeInTheDocument();
    expect(screen.getByText("42 total")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders pipeline values as currency", async () => {
    mockStaff();
    renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    await screen.findByText("42 total");
    expect(screen.getAllByText(/\$\d/).length).toBeGreaterThan(0);
  });

  it("renders the lead funnel counts", async () => {
    mockStaff();
    renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    await screen.findByText("42 total");
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("renders the recharts containers without crashing in jsdom", async () => {
    mockStaff();
    const { container } = renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    await screen.findByText("42 total");
    expect(container.querySelectorAll(".recharts-responsive-container").length).toBeGreaterThan(0);
  });
});

describe("Dashboard — role differences", () => {
  it("shows the team-performance panel to an admin", async () => {
    mockStaff();
    renderWithProviders(<Dashboard />, { auth: { user: adminUser } });

    expect(await screen.findByText(/EMEA Sales/)).toBeInTheDocument();
  });

  it("hides the team-performance panel from a non-admin rep", async () => {
    mockStaff();
    renderWithProviders(<Dashboard />, { auth: { user: staffUser } });

    await screen.findByText("42 total");
    expect(screen.queryByText(/EMEA Sales/)).not.toBeInTheDocument();
  });

  it("renders the customer dashboard for a portal customer, not the sales one", async () => {
    mockGets({ "/tickets/my": [] });
    renderWithProviders(<Dashboard />, { auth: { user: customerUser } });

    // The customer view never requests /reports/dashboard; with
    // onUnhandledRequest: "error" this test fails if it does.
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("42 total")).not.toBeInTheDocument();
  });
});
