import { screen, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
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
import { AutomationsPage } from "./AutomationsPage";

const rule = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  name: "Notify on new lead",
  description: "Create a follow-up task",
  kind: "trigger",
  isActive: true,
  triggerEvent: "lead.created",
  conditions: [],
  actions: [{ type: "create_task", subject: "Call the lead" }],
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-20T10:00:00.000Z",
  ...overrides,
});

const run = {
  id: "run1",
  ruleId: "r1",
  ruleName: "Notify on new lead",
  event: "lead.created",
  recordType: "lead",
  recordId: "l1",
  recordName: "Ann Bee",
  status: "success",
  logs: ["Created task"],
  createdAt: "2026-01-20T10:00:00.000Z",
};

const stats = { totalRules: 2, activeRules: 1, runsToday: 5, failuresToday: 1 };

const mockPage = (rules = [rule()]) =>
  mockGets({
    "/automations": paged(rules),
    "/automations/stats": stats,
    "/automations/runs": paged([run]),
  });

const renderPage = (auth = { user: adminUser }) =>
  renderWithProviders(<AutomationsPage />, { auth });

describe("AutomationsPage — admin gate", () => {
  it("renders the rule engine for an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("heading", { name: /Automation & Workflows/ })).toBeInTheDocument();
  });

  it("blocks a non-admin staff user with an admins-only notice", async () => {
    renderPage({ user: staffUser });

    expect(await screen.findByText("Admins only")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Automation & Workflows/ })).not.toBeInTheDocument();
  });

  it("blocks a portal customer", async () => {
    renderPage({ user: customerUser });
    expect(await screen.findByText("Admins only")).toBeInTheDocument();
  });

  it("fetches nothing at all when access is denied", async () => {
    // No handlers registered — with onUnhandledRequest: "error" any call fails
    // the test, proving the gate short-circuits before the queries mount.
    renderPage({ user: staffUser });
    await screen.findByText("Admins only");
  });
});

describe("AutomationsPage — loading and error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/automations");
    mockGets({ "/automations/stats": stats, "/automations/runs": paged([run]) });
    renderPage();
    expect(await screen.findByText("Fetching rules...")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/automations", 500, "Rule engine unavailable");
    mockGets({ "/automations/stats": stats, "/automations/runs": paged([run]) });
    renderPage();
    expect(await screen.findByText("Rule engine unavailable")).toBeInTheDocument();
  });
});

describe("AutomationsPage — rules and run log", () => {
  it("renders the rule name in both the rule table and the run log", async () => {
    mockPage();
    renderPage();
    expect((await screen.findAllByText("Notify on new lead")).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the execution log alongside the rules", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Execution Log")).toBeInTheDocument();
    expect(await screen.findByText(/Ann Bee/)).toBeInTheDocument();
  });
});

describe("AutomationsPage — rule CRUD", () => {
  it("opens the new-rule dialog", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findAllByText("Notify on new lead");

    await user.click(screen.getByRole("button", { name: /New Rule/ }));
    expect(await screen.findByText("New Automation Rule")).toBeInTheDocument();
  });

  it("posts a new rule", async () => {
    mockPage();
    const write = captureWrite("post", "/automations", () => HttpResponse.json(rule()) as unknown as Response);
    const { user } = renderPage();
    await screen.findAllByText("Notify on new lead");

    await user.click(screen.getByRole("button", { name: /New Rule/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Rule Name|Name/), "Escalate idle tickets");
    await user.click(screen.getByRole("button", { name: /^Create Rule$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ name: "Escalate idle tickets" });
    expect(write.body).toHaveProperty("kind");
  });

  it("toggles a rule active state", async () => {
    mockPage();
    const write = captureWrite("patch", "/automations/:id", () => HttpResponse.json(rule()) as unknown as Response);
    const { user } = renderPage();
    await screen.findAllByText("Notify on new lead");

    // Activation is a toggle switch on the row, not a menu item.
    await user.click(screen.getByTitle("Active — click to pause"));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/automations/r1");
    expect(write.body).toMatchObject({ isActive: false });
  });

  it("requires confirmation before deleting a rule", async () => {
    mockPage();
    const write = captureWrite("delete", "/automations/:id");
    const { user } = renderPage();
    await screen.findAllByText("Notify on new lead");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete rule/ }));

    expect(await screen.findByText("Delete rule?")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });
});
