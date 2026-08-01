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
import type { Lead } from "@/features/leads/types";
import { LeadsPage } from "./LeadsPage";

const lead = (overrides: Partial<Lead> = {}): Lead =>
  ({
    id: "l1",
    firstName: "Ann",
    lastName: "Bee",
    email: "ann@acme.com",
    phone: "555-0100",
    company: "Acme Corp",
    jobTitle: "Head of Ops",
    notes: "Warm intro from a partner",
    source: "referral",
    status: "new",
    rating: "hot",
    score: 45,
    estimatedValue: 25000,
    engagements: [],
    assignedToId: null,
    assignedToName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Lead;

const stats = { total: 9, new: 4, contacted: 2, qualified: 2, unqualified: 1, converted: 0 };

const mockPage = (leads: Lead[] = [lead()], total = leads.length) =>
  mockGets({ "/leads": paged(leads, { total }), "/leads/stats": stats });

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<LeadsPage />, { auth });

const openRowMenu = async (user: ReturnType<typeof renderPage>["user"]) => {
  await user.click(screen.getByRole("button", { name: "Open actions" }));
};

describe("LeadsPage — loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/leads");
    mockGets({ "/leads/stats": stats });
    renderPage();
    expect(await screen.findByText("Fetching leads...")).toBeInTheDocument();
  });

  it("shows the empty state when there are no leads", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByText("No leads found")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/leads", 500, "Lead service unavailable");
    mockGets({ "/leads/stats": stats });
    renderPage();
    expect(await screen.findByText("Lead service unavailable")).toBeInTheDocument();
  });
});

describe("LeadsPage — populated list", () => {
  it("renders the lead's name, email and company", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Ann Bee")).toBeInTheDocument();
    expect(screen.getByText("ann@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders the pipeline stats", async () => {
    mockPage();
    renderPage();
    await screen.findByText("Ann Bee");

    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("formats the estimated value as currency in the details dialog", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /View details/ }));

    expect(await screen.findByText("$25,000")).toBeInTheDocument();
  });
});

describe("LeadsPage — filters", () => {
  it("debounces search before hitting the API", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    server.use(
      http.get("/api/backend/leads", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([lead()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search by name/), "acme");

    await waitFor(() => expect(searches).toContain("acme"));
    expect(searches.filter((s) => s === "acme")).toHaveLength(1);
  });

  it("sends the status filter", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    let seen: string | null = null;
    server.use(
      http.get("/api/backend/leads", ({ request }) => {
        seen = new URL(request.url).searchParams.get("status");
        return HttpResponse.json(paged([lead()]));
      }),
    );

    const statusSelect = screen
      .getAllByRole("combobox")
      .find((el) => [...(el as HTMLSelectElement).options].some((o) => o.value === "qualified"));
    await user.selectOptions(statusSelect!, "qualified");

    await waitFor(() => expect(seen).toBe("qualified"));
  });
});

describe("LeadsPage — role gating", () => {
  it("shows Add Lead to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Lead/ })).toBeInTheDocument();
  });

  it("hides assignment and delete from a non-admin but keeps day-to-day actions", async () => {
    mockPage();
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Ann Bee");

    await openRowMenu(user);

    // A rep can still work the lead — only routing and deletion are admin-only.
    expect(await screen.findByRole("menuitem", { name: /View details/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Edit lead/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Log engagement/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Assign owner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Delete lead/ })).not.toBeInTheDocument();
  });

  it("hides every write action once a lead is converted", async () => {
    mockPage([lead({ status: "converted" })]);
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Ann Bee");

    await openRowMenu(user);

    expect(await screen.findByRole("menuitem", { name: /View details/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Edit lead/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Mark qualified/ })).not.toBeInTheDocument();
  });

  it("offers the qualification and conversion actions to an admin", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);

    for (const name of [/Log engagement/, /Edit lead/, /Assign owner/, /Mark qualified/, /Delete lead/]) {
      expect(await screen.findByRole("menuitem", { name })).toBeInTheDocument();
    }
  });
});

describe("LeadsPage — create dialog", () => {
  it("blocks submission and shows zod messages when required fields are empty", async () => {
    mockPage();
    const write = captureWrite("post", "/leads");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Lead/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Lead$|^Add Lead$/ }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid lead", async () => {
    mockPage();
    const write = captureWrite("post", "/leads", () => HttpResponse.json(lead()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Lead/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Lead");
    await user.type(fieldByLabel(dialog, /Email/), "new@lead.com");
    await user.click(screen.getByRole("button", { name: /^Create Lead$|^Add Lead$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ firstName: "New", lastName: "Lead", email: "new@lead.com" });
  });

  it("keeps the dialog open and reports a server rejection", async () => {
    mockPage();
    mockWriteError("post", "/leads", 409, "A lead with that email already exists");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Lead/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Lead");
    await user.type(fieldByLabel(dialog, /Email/), "dupe@lead.com");
    await user.click(screen.getByRole("button", { name: /^Create Lead$|^Add Lead$/ }));

    expect(await screen.findByText("A lead with that email already exists")).toBeInTheDocument();
  });
});

describe("LeadsPage — qualification shortcuts", () => {
  it("patches the status directly from the row menu", async () => {
    mockPage();
    const write = captureWrite("patch", "/leads/:id", () => HttpResponse.json(lead()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Mark qualified/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/leads/l1");
    expect(write.body).toMatchObject({ status: "qualified" });
  });
});

describe("LeadsPage — engagement dialog", () => {
  it("logs an engagement against the lead", async () => {
    mockPage();
    const write = captureWrite(
      "post",
      "/leads/:id/engagements",
      () => HttpResponse.json(lead()) as unknown as Response,
    );
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Log engagement/ }));
    await screen.findByRole("heading", { name: "Log Engagement" });

    await user.click(screen.getByRole("button", { name: /^Log Engagement$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/leads/l1/engagements");
    expect(write.body).toHaveProperty("type");
  });
});

describe("LeadsPage — conversion", () => {
  it("opens the conversion dialog for a qualified lead", async () => {
    mockPage([lead({ status: "qualified" })]);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Convert to customer/ }));

    expect(await screen.findByRole("heading", { name: "Convert Lead" })).toBeInTheDocument();
  });

  it("posts the conversion payload", async () => {
    mockPage([lead({ status: "qualified" })]);
    const write = captureWrite("post", "/leads/:id/convert", () => HttpResponse.json(lead()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Convert to customer/ }));
    await screen.findByRole("heading", { name: "Convert Lead" });
    await user.click(screen.getByRole("button", { name: /^Convert Lead$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/leads/l1/convert");
    expect(write.body).toHaveProperty("createOpportunity");
  });
});

describe("LeadsPage — delete", () => {
  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/leads/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Delete lead/ }));
    expect(await screen.findByText("Delete lead?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Lead$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/leads/l1");
  });
});
