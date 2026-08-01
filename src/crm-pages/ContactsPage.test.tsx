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
import type { Contact } from "@/features/contacts/types";
import { ContactsPage } from "./ContactsPage";

const contact = (overrides: Partial<Contact> = {}): Contact =>
  ({
    id: "c1",
    firstName: "Ann",
    lastName: "Bee",
    email: "ann@acme.com",
    phone: "555-0100",
    jobTitle: "Head of Ops",
    department: "Operations",
    city: "Berlin",
    country: "Germany",
    accountId: "a1",
    accountName: "Acme Corporation",
    isPrimary: true,
    preferredChannel: "email",
    emailOptIn: true,
    phoneOptIn: false,
    smsOptIn: false,
    doNotContact: false,
    notes: "Prefers morning calls",
    interactions: [],
    assignedToId: null,
    assignedToName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Contact;

const stats = { total: 11, primary: 4, doNotContact: 1, newThisMonth: 2 };

const mockPage = (contacts: Contact[] = [contact()], total = contacts.length) =>
  mockGets({ "/contacts": paged(contacts, { total }), "/contacts/stats": stats });

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<ContactsPage />, { auth });

describe("ContactsPage — loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/contacts");
    mockGets({ "/contacts/stats": stats });
    renderPage();
    expect(await screen.findByText("Fetching contacts...")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByText("No contacts found")).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/contacts", 500, "Contacts unavailable");
    mockGets({ "/contacts/stats": stats });
    renderPage();
    expect(await screen.findByText("Contacts unavailable")).toBeInTheDocument();
  });
});

describe("ContactsPage — populated list", () => {
  it("renders the person's name, email and job title", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Ann Bee")).toBeInTheDocument();
    expect(screen.getByText("ann@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Head of Ops")).toBeInTheDocument();
  });

  it("renders the linked company", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByText("Acme Corporation")).toBeInTheDocument();
  });
});

describe("ContactsPage — filters", () => {
  it("debounces the search term", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    server.use(
      http.get("/api/backend/contacts", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([contact()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search by name/), "ann");

    await waitFor(() => expect(searches).toContain("ann"));
    expect(searches.filter((s) => s === "ann")).toHaveLength(1);
  });
});

describe("ContactsPage — role gating", () => {
  it("shows Add Contact to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Contact/ })).toBeInTheDocument();
  });

  it("hides assignment from a non-admin but keeps interaction logging", async () => {
    mockPage();
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    expect(await screen.findByRole("menuitem", { name: /Log interaction/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Assign owner/ })).not.toBeInTheDocument();
  });
});

describe("ContactsPage — create dialog", () => {
  it("blocks an empty submission with zod messages", async () => {
    mockPage();
    const write = captureWrite("post", "/contacts");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Contact/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Contact$|^Add Contact$/ }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid contact", async () => {
    mockPage();
    const write = captureWrite("post", "/contacts", () => HttpResponse.json(contact()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Contact/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    await user.type(fieldByLabel(dialog, /Email/), "new@acme.com");
    await user.click(screen.getByRole("button", { name: /^Create Contact$|^Add Contact$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ firstName: "New", lastName: "Person", email: "new@acme.com" });
  });
});

describe("ContactsPage — interactions", () => {
  it("logs an interaction against the contact", async () => {
    mockPage();
    const write = captureWrite(
      "post",
      "/contacts/:id/interactions",
      () => HttpResponse.json(contact()) as unknown as Response,
    );
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Log interaction/ }));
    await screen.findByRole("heading", { name: "Log Interaction" });

    await user.click(screen.getByRole("button", { name: /^Log Interaction$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/contacts/c1/interactions");
    expect(write.body).toHaveProperty("type");
  });
});

describe("ContactsPage — delete", () => {
  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/contacts/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete contact/ }));
    expect(await screen.findByText("Delete contact?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Contact$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/contacts/c1");
  });
});
