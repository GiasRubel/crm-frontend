import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockGets } from "../../test/utils/pageHarness";
import { adminUser, renderWithProviders } from "../../test/utils/renderWithProviders";
import { ReportsPage } from "./ReportsPage";

const dashboard = {
  totals: { customers: 42, activeCustomers: 30, openTickets: 7, pendingTasks: 5, overdueTasks: 2 },
  pipeline: {
    openCount: 12,
    openValue: 250_000,
    weightedValue: 90_000,
    wonThisMonthCount: 3,
    wonThisMonthValue: 60_000,
    winRate: 0.35,
    byStage: [{ stage: "discovery", count: 5, totalAmount: 100_000, weightedAmount: 20_000 }],
  },
  funnel: { totalLeads: 50, new: 20, contacted: 15, qualified: 10, unqualified: 3, converted: 2, conversionRate: 0.04 },
  revenueByMonth: [{ month: "2026-06", wonValue: 40_000, wonCount: 2 }],
  leadsBySource: [{ key: "referral", label: "Referral", count: 20 }],
  topReps: [],
};

const teamPerformance = { reps: [], teams: [] };

const datasets = {
  datasets: [
    {
      key: "opportunities",
      label: "Opportunities",
      fields: [{ key: "amount", label: "Amount", type: "number" }],
    },
  ],
};

function mockAnalytics() {
  mockGets({
    "/reports/dashboard": dashboard,
    "/reports/team-performance": teamPerformance,
  });
}

function mockBuilder() {
  mockGets({
    "/reports/datasets": datasets,
    "/reports/saved": [],
  });
}

const renderPage = () => renderWithProviders(<ReportsPage />, { auth: { user: adminUser } });

describe("ReportsPage", () => {
  it("renders the module heading", async () => {
    mockAnalytics();
    renderPage();
    expect(await screen.findByRole("heading", { name: /Reporting & Analytics/ })).toBeInTheDocument();
  });

  it("opens on the Dashboards tab", async () => {
    mockAnalytics();
    renderPage();

    expect(await screen.findByRole("button", { name: /Dashboards/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Report Builder/ })).toBeInTheDocument();
  });

  it("switches to the report builder tab", async () => {
    mockAnalytics();
    mockBuilder();
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Reporting & Analytics/ });

    await user.click(screen.getByRole("button", { name: /Report Builder/ }));

    // The builder loads the dataset registry; analytics content is unmounted.
    expect(await screen.findByText(/Opportunities/)).toBeInTheDocument();
  });

  it("switches back to the dashboards tab", async () => {
    mockAnalytics();
    mockBuilder();
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Reporting & Analytics/ });

    await user.click(screen.getByRole("button", { name: /Report Builder/ }));
    await screen.findByText(/Opportunities/);
    await user.click(screen.getByRole("button", { name: /Dashboards/ }));

    expect(await screen.findByRole("heading", { name: /Reporting & Analytics/ })).toBeInTheDocument();
  });
});
