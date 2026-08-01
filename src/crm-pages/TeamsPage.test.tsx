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
import { adminUser, renderWithProviders, staffUser } from "../../test/utils/renderWithProviders";
import type { Team } from "@/features/teams/types";
import { TeamsPage } from "./TeamsPage";

const team = (overrides: Partial<Team> = {}): Team =>
  ({
    id: "t1",
    name: "EMEA Sales",
    description: "Europe, Middle East and Africa",
    regions: ["EMEA", "Germany"],
    members: [{ keycloakId: "kc-staff", firstName: "Sam", lastName: "Staff", email: "sam@x.com", role: "SalesRep" }],
    leaderId: "kc-staff",
    leaderName: "Sam Staff",
    customerCount: 12,
    isActive: true,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Team;

const stats = { total: 3, active: 2, inactive: 1, unassignedCustomers: 4 };

const mockPage = (teams: Team[] = [team()], total = teams.length) =>
  mockGets({
    "/teams": paged(teams, { total }),
    "/teams/stats": stats,
    "/users/staff": [
      { id: "u2", keycloakId: "kc-staff", email: "sam@x.com", firstName: "Sam", lastName: "Staff", role: "SalesRep" },
    ],
  });

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<TeamsPage />, { auth });

describe("TeamsPage — loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/teams");
    mockGets({ "/teams/stats": stats, "/users/staff": [] });
    renderPage();
    expect(await screen.findByText("Fetching teams...")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByText("No teams found")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/teams", 500, "Teams unavailable");
    mockGets({ "/teams/stats": stats, "/users/staff": [] });
    renderPage();
    expect(await screen.findByText("Teams unavailable")).toBeInTheDocument();
  });
});

describe("TeamsPage — populated list", () => {
  it("renders the team name and its territories", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("EMEA Sales")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
  });

  it("renders the team leader", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByText(/Sam Staff/)).toBeInTheDocument();
  });
});

describe("TeamsPage — filters", () => {
  it("debounces the search term", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("EMEA Sales");

    server.use(
      http.get("/api/backend/teams", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([team()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search by name/), "emea");

    await waitFor(() => expect(searches).toContain("emea"));
    expect(searches.filter((s) => s === "emea")).toHaveLength(1);
  });
});

describe("TeamsPage — role gating", () => {
  it("shows Add Team to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Team/ })).toBeInTheDocument();
  });

  it("hides Add Team from a non-admin", async () => {
    mockPage();
    renderPage({ user: staffUser });
    await screen.findByText("EMEA Sales");
    expect(screen.queryByRole("button", { name: /Add Team/ })).not.toBeInTheDocument();
  });
});

describe("TeamsPage — create dialog", () => {
  it("requires a team name", async () => {
    mockPage();
    const write = captureWrite("post", "/teams");
    const { user } = renderPage();
    await screen.findByText("EMEA Sales");

    await user.click(screen.getByRole("button", { name: /Add Team/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Team$/ }));

    expect(await screen.findByText("Team name is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid team", async () => {
    mockPage();
    const write = captureWrite("post", "/teams", () => HttpResponse.json(team()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("EMEA Sales");

    await user.click(screen.getByRole("button", { name: /Add Team/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Team Name/), "APAC Sales");
    await user.click(screen.getByRole("button", { name: /^Create Team$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ name: "APAC Sales" });
  });
});

describe("TeamsPage — delete", () => {
  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/teams/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("EMEA Sales");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    expect(await screen.findByText("Delete team?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Team$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/teams/t1");
  });
});
