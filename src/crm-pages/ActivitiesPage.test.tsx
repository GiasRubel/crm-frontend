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
import type { Activity } from "@/features/activities/types";
import { ActivitiesPage } from "./ActivitiesPage";

const activity = (overrides: Partial<Activity> = {}): Activity =>
  ({
    id: "a1",
    type: "task",
    subject: "Follow up with Acme",
    description: "Check on the renewal",
    status: "pending",
    priority: "high",
    direction: null,
    dueAt: "2026-08-10T09:00:00.000Z",
    startAt: null,
    endAt: null,
    remindAt: null,
    relatedType: "lead",
    relatedId: "l1",
    relatedName: "Ann Bee",
    assignedToId: "kc-admin",
    assignedToName: "Ada Admin",
    assignedTeamId: null,
    assignedTeamName: null,
    createdBy: "u1",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Activity;

const stats = { total: 5, pending: 3, completed: 1, overdue: 1, dueToday: 2 };

const mockPage = (items: Activity[] = [activity()], total = items.length) =>
  mockGets({
    "/activities": paged(items, { total }),
    "/activities/stats": stats,
    "/users/staff": [],
  });

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<ActivitiesPage />, { auth });

describe("ActivitiesPage — loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/activities");
    mockGets({ "/activities/stats": stats, "/users/staff": [] });
    renderPage();
    expect(await screen.findByText("Fetching activities...")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByText("No activities found")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/activities", 500, "Activities unavailable");
    mockGets({ "/activities/stats": stats, "/users/staff": [] });
    renderPage();
    expect(await screen.findByText("Activities unavailable")).toBeInTheDocument();
  });
});

describe("ActivitiesPage — populated list", () => {
  it("renders the subject and the linked record", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Follow up with Acme")).toBeInTheDocument();
    expect(screen.getByText(/Ann Bee/)).toBeInTheDocument();
  });

  it("renders the assignee", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByText(/Ada Admin/)).toBeInTheDocument();
  });
});

describe("ActivitiesPage — filters", () => {
  it("debounces the search term", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    server.use(
      http.get("/api/backend/activities", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([activity()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search subject/), "renewal");

    await waitFor(() => expect(searches).toContain("renewal"));
    expect(searches.filter((s) => s === "renewal")).toHaveLength(1);
  });

  it("sends the type filter", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    let seen: string | null = null;
    server.use(
      http.get("/api/backend/activities", ({ request }) => {
        seen = new URL(request.url).searchParams.get("type");
        return HttpResponse.json(paged([activity()]));
      }),
    );

    const select = screen
      .getAllByRole("combobox")
      .find((el) => [...(el as HTMLSelectElement).options].some((o) => o.value === "meeting"));
    await user.selectOptions(select!, "meeting");

    await waitFor(() => expect(seen).toBe("meeting"));
  });
});

describe("ActivitiesPage — create dialog", () => {
  it("requires a subject", async () => {
    mockPage();
    const write = captureWrite("post", "/activities");
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    await user.click(screen.getByRole("button", { name: /New Activity/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Activity$/ }));

    expect(await screen.findByText("Subject is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid activity", async () => {
    mockPage();
    const write = captureWrite("post", "/activities", () => HttpResponse.json(activity()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    await user.click(screen.getByRole("button", { name: /New Activity/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Subject/), "Call the customer");
    await user.click(screen.getByRole("button", { name: /^Create Activity$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ subject: "Call the customer" });
    expect(write.body).toHaveProperty("type");
  });
});

describe("ActivitiesPage — status changes", () => {
  it("completes an activity from the row menu", async () => {
    mockPage();
    const write = captureWrite("patch", "/activities/:id/status", () => HttpResponse.json(activity()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    // Completion is a one-click row button, not a menu item.
    await user.click(screen.getByRole("button", { name: "Mark as done" }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/activities/a1/status");
    expect(write.body).toEqual({ status: "completed" });
  });

  it("offers no one-click completion for an already-completed activity", async () => {
    mockPage([activity({ status: "completed" })]);
    renderPage();
    await screen.findByText("Follow up with Acme");

    expect(screen.queryByRole("button", { name: "Mark as done" })).not.toBeInTheDocument();
  });
});

describe("ActivitiesPage — role gating", () => {
  it("hides reassignment from a non-admin", async () => {
    mockPage();
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Follow up with Acme");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    expect(screen.queryByRole("menuitem", { name: /Reassign/ })).not.toBeInTheDocument();
  });

  it("offers reassignment to an admin", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    expect(await screen.findByRole("menuitem", { name: /Reassign/ })).toBeInTheDocument();
  });
});

describe("ActivitiesPage — delete", () => {
  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/activities/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("Follow up with Acme");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    expect(await screen.findByText("Delete activity?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Activity$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/activities/a1");
  });
});
