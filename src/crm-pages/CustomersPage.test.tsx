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
import {
  adminUser,
  renderWithProviders,
  staffUser,
} from "../../test/utils/renderWithProviders";
import type { Customer } from "@/features/customers/types";
import { CustomersPage } from "./CustomersPage";

const customer = (overrides: Partial<Customer> = {}): Customer =>
  ({
    id: "c1",
    keycloakId: "kc-c1",
    email: "ann@acme.com",
    firstName: "Ann",
    lastName: "Bee",
    phone: "555-0100",
    company: "Acme Corp",
    address: "1 Main St",
    notes: "VIP account",
    status: "active",
    createdBy: "u1",
    assignedToId: null,
    assignedToName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as Customer;

const stats = { total: 12, active: 7, inactive: 2, prospect: 3, newThisMonth: 4 };

function mockPage(customers: Customer[] = [customer()], total = customers.length) {
  mockGets({
    "/customers": paged(customers, { total }),
    "/customers/stats": stats,
  });
}

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<CustomersPage />, { auth });

describe("CustomersPage — loading", () => {
  it("shows a fetching row while the list is in flight", async () => {
    mockPending("/customers");
    mockGets({ "/customers/stats": stats });
    renderPage();

    expect(await screen.findByText("Fetching customers...")).toBeInTheDocument();
  });

  it("shows em-dashes in the stat cards until stats arrive", async () => {
    mockPending("/customers");
    mockPending("/customers/stats");
    renderPage();

    await screen.findByText("Fetching customers...");
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(5);
  });
});

describe("CustomersPage — populated list", () => {
  it("renders customer name, email, phone and company", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("Ann Bee")).toBeInTheDocument();
    expect(screen.getByText("ann@acme.com")).toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders the lifecycle status badge", async () => {
    mockPage([customer({ status: "prospect" })]);
    renderPage();

    expect(await screen.findByText("Prospect")).toBeInTheDocument();
  });

  it("shows the stat card values", async () => {
    mockPage();
    renderPage();

    await screen.findByText("Ann Bee");
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it('shows "Unassigned" when the record has no owner or team', async () => {
    mockPage();
    renderPage();
    expect(await screen.findByText("Unassigned")).toBeInTheDocument();
  });

  it("shows the owner and team when assigned", async () => {
    mockPage([customer({ assignedToName: "Sam Staff", assignedTeamName: "West" })]);
    renderPage();

    expect(await screen.findByText("Sam Staff")).toBeInTheDocument();
    expect(screen.getByText("West")).toBeInTheDocument();
  });
});

describe("CustomersPage — empty state", () => {
  it("prompts an admin to add the first customer", async () => {
    mockPage([]);
    renderPage();

    expect(await screen.findByText("No customers found")).toBeInTheDocument();
    expect(screen.getByText("Add your first customer to get started.")).toBeInTheDocument();
  });

  it("tells a non-admin that customers will appear once added", async () => {
    mockPage([]);
    renderPage({ user: staffUser });

    expect(await screen.findByText("No customers found")).toBeInTheDocument();
    expect(screen.getByText("Customers will appear here once added.")).toBeInTheDocument();
  });

  it("suggests adjusting filters when a search returned nothing", async () => {
    mockPage([]);
    const { user } = renderPage();
    await screen.findByText("No customers found");

    await user.type(screen.getByPlaceholderText(/Search by name/), "zzz");

    expect(await screen.findByText("Try adjusting your search or filters.")).toBeInTheDocument();
  });
});

describe("CustomersPage — error state", () => {
  it("surfaces the API error message instead of crashing", async () => {
    mockGetError("/customers", 403, "You do not have access to customers");
    mockGets({ "/customers/stats": stats });
    renderPage();

    expect(await screen.findByText("You do not have access to customers")).toBeInTheDocument();
  });
});

describe("CustomersPage — filters", () => {
  it("debounces the search term before querying the API", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    server.use(
      http.get("/api/backend/customers", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([customer()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search by name/), "acme");

    await waitFor(() => expect(searches).toContain("acme"));
    // One request for the settled term, not one per keystroke.
    expect(searches.filter((s) => s === "acme")).toHaveLength(1);
  });

  it("sends the selected status filter", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    let seen: string | null = null;
    server.use(
      http.get("/api/backend/customers", ({ request }) => {
        seen = new URL(request.url).searchParams.get("status");
        return HttpResponse.json(paged([customer()]));
      }),
    );

    await user.selectOptions(screen.getAllByRole("combobox")[0], "prospect");
    await waitFor(() => expect(seen).toBe("prospect"));
  });

  it("toggles sort order when the same column header is clicked twice", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    const orders: (string | null)[] = [];
    server.use(
      http.get("/api/backend/customers", ({ request }) => {
        const params = new URL(request.url).searchParams;
        orders.push(`${params.get("sortBy")}:${params.get("sortOrder")}`);
        return HttpResponse.json(paged([customer()]));
      }),
    );

    await user.click(screen.getByRole("button", { name: /^Customer/ }));
    await waitFor(() => expect(orders).toContain("lastName:asc"));

    await user.click(screen.getByRole("button", { name: /^Customer/ }));
    await waitFor(() => expect(orders).toContain("lastName:desc"));
  });
});

describe("CustomersPage — pagination", () => {
  it("shows the range and page counter", async () => {
    mockPage([customer()], 25);
    renderPage();

    // The range is derived from page/limit, not the number of rows returned.
    expect(await screen.findByText(/1–10 of 25 customers/)).toBeInTheDocument();
    expect(document.querySelector("span.font-bold")?.textContent?.trim()).toBe("1 / 3");
  });

  it("requests the next page", async () => {
    mockPage([customer()], 25);
    const { user } = renderPage();
    await screen.findByText(/1–10 of 25 customers/);

    let seen: string | null = null;
    server.use(
      http.get("/api/backend/customers", ({ request }) => {
        seen = new URL(request.url).searchParams.get("page");
        return HttpResponse.json(paged([customer()], { total: 25, page: 2 }));
      }),
    );

    const next = document.querySelector<HTMLButtonElement>("button:has(svg.lucide-chevron-right)");
    await user.click(next!);
    await waitFor(() => expect(seen).toBe("2"));
  });

  it("hides the pagination footer when there are no records", async () => {
    mockPage([]);
    renderPage();
    await screen.findByText("No customers found");

    expect(screen.queryByText(/of 0 customers/)).not.toBeInTheDocument();
  });
});

describe("CustomersPage — role gating", () => {
  it("shows Add Customer to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Customer/ })).toBeInTheDocument();
  });

  it("hides Add Customer from a non-admin", async () => {
    mockPage();
    renderPage({ user: staffUser });
    await screen.findByText("Ann Bee");

    expect(screen.queryByRole("button", { name: /Add Customer/ })).not.toBeInTheDocument();
  });

  it("offers only View details in the row menu for a non-admin", async () => {
    mockPage();
    const { user } = renderPage({ user: staffUser });
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    expect(await screen.findByRole("menuitem", { name: /View details/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Edit profile/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Delete customer/ })).not.toBeInTheDocument();
  });

  it("offers the full action set to an admin", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));

    for (const name of [/View details/, /Edit profile/, /Assign owner/, /Resend invitation/, /Delete customer/]) {
      expect(await screen.findByRole("menuitem", { name })).toBeInTheDocument();
    }
  });
});

describe("CustomersPage — create dialog", () => {
  it("opens with an empty form", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));

    expect(await screen.findByText("Add New Customer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Customer" })).toBeInTheDocument();
  });

  it("blocks submission and shows zod messages for empty required fields", async () => {
    mockPage();
    const write = captureWrite("post", "/customers");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    await user.click(await screen.findByRole("button", { name: "Create Customer" }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("rejects an invalid email before anything is sent", async () => {
    mockPage();
    const write = captureWrite("post", "/customers");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    const email = fieldByLabel(dialog, /Email Address/);
    await user.type(email, "not-an-email");
    await user.type(fieldByLabel(dialog, /Phone Number/), "5551234");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    // The field is `type="email"`, so the browser's native constraint blocks
    // submit before react-hook-form/zod ever run — no inline zod message is
    // rendered, but nothing is sent either.
    expect((email as HTMLInputElement).validity.valid).toBe(false);
    expect(write.called).toBe(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the zod email message when the value clears native validation but not zod", async () => {
    mockPage();
    const write = captureWrite("post", "/customers");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    // Accepted by the browser's lax email check, rejected by zod's stricter one.
    await user.type(fieldByLabel(dialog, /Email Address/), "ann@localhost");
    await user.type(fieldByLabel(dialog, /Phone Number/), "5551234");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("rejects a malformed phone number", async () => {
    mockPage();
    const write = captureWrite("post", "/customers");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    await user.type(fieldByLabel(dialog, /Email Address/), "new@acme.com");
    await user.type(fieldByLabel(dialog, /Phone Number/), "abc");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid payload and reports the emailed invitation", async () => {
    mockPage();
    const write = captureWrite("post", "/customers", () => HttpResponse.json(customer()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    await user.type(fieldByLabel(dialog, /Email Address/), "new@acme.com");
    await user.type(fieldByLabel(dialog, /Phone Number/), "+1 555 123 4567");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({
      firstName: "New",
      lastName: "Person",
      email: "new@acme.com",
      phone: "+1 555 123 4567",
      status: "active",
    });
    expect(await screen.findByText(/password setup invitation was emailed to new@acme.com/)).toBeInTheDocument();
  });

  it("omits blank optional fields rather than sending empty strings", async () => {
    mockPage();
    const write = captureWrite("post", "/customers", () => HttpResponse.json(customer()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    await user.type(fieldByLabel(dialog, /Email Address/), "new@acme.com");
    await user.type(fieldByLabel(dialog, /Phone Number/), "5551234");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).not.toHaveProperty("company");
    expect(write.body).not.toHaveProperty("address");
    expect(write.body).not.toHaveProperty("notes");
  });

  it("keeps the dialog open and shows the server error when creation fails", async () => {
    mockPage();
    mockWriteError("post", "/customers", 409, "A customer with that email already exists");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: /Add Customer/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Person");
    await user.type(fieldByLabel(dialog, /Email Address/), "dupe@acme.com");
    await user.type(fieldByLabel(dialog, /Phone Number/), "5551234");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    expect(await screen.findByText("A customer with that email already exists")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("CustomersPage — edit dialog", () => {
  it("pre-fills the form from the selected customer", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Edit profile/ }));

    const dialog = await screen.findByRole("dialog");
    expect(await screen.findByText("Edit Customer Profile")).toBeInTheDocument();
    expect(fieldByLabel(dialog, /First Name/)).toHaveValue("Ann");
    expect(fieldByLabel(dialog, /Email Address/)).toHaveValue("ann@acme.com");
    expect(fieldByLabel(dialog, /Company Name/)).toHaveValue("Acme Corp");
  });

  it("patches only the edited record", async () => {
    mockPage();
    const write = captureWrite("patch", "/customers/:id", () => HttpResponse.json(customer()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Edit profile/ }));

    const dialog = await screen.findByRole("dialog");
    const company = fieldByLabel(dialog, /Company Name/);
    await user.clear(company);
    await user.type(company, "Globex");
    await user.click(screen.getByRole("button", { name: "Update Customer" }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/customers/c1");
    expect(write.body).toMatchObject({ company: "Globex" });
    expect(await screen.findByText(/updated successfully/)).toBeInTheDocument();
  });
});

describe("CustomersPage — delete confirmation", () => {
  it("asks for confirmation before deleting", async () => {
    mockPage();
    const write = captureWrite("delete", "/customers/:id");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete customer/ }));

    expect(await screen.findByText("Delete customer?")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("deletes on confirm and reports the removed sign-in account", async () => {
    mockPage();
    const write = captureWrite(
      "delete",
      "/customers/:id",
      () => new Response(null, { status: 204 }),
    );
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete customer/ }));
    await user.click(await screen.findByRole("button", { name: "Delete Customer" }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/customers/c1");
    expect(await screen.findByText(/sign-in account were deleted/)).toBeInTheDocument();
  });

  it("cancels without deleting", async () => {
    mockPage();
    const write = captureWrite("delete", "/customers/:id");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete customer/ }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Delete customer?")).not.toBeInTheDocument());
    expect(write.called).toBe(false);
  });
});

describe("CustomersPage — details dialog", () => {
  it("shows the full profile including notes and Keycloak id", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /View details/ }));

    expect(await screen.findByText("Customer Details")).toBeInTheDocument();
    expect(screen.getByText("VIP account")).toBeInTheDocument();
    expect(screen.getByText("kc-c1")).toBeInTheDocument();
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
  });
});

describe("CustomersPage — assignment dialog", () => {
  const team = {
    id: "t1",
    name: "West",
    regions: ["CA"],
    members: [{ keycloakId: "kc-staff", firstName: "Sam", lastName: "Staff" }],
    isActive: true,
  };

  it("only loads teams and staff once the dialog is opened", async () => {
    mockPage();
    let teamsCalled = false;
    server.use(
      http.get("/api/backend/teams", () => {
        teamsCalled = true;
        return HttpResponse.json(paged([team]));
      }),
      http.get("/api/backend/users/staff", () => HttpResponse.json([{ ...staffUser, keycloakId: "kc-staff" }])),
    );

    const { user } = renderPage();
    await screen.findByText("Ann Bee");
    expect(teamsCalled).toBe(false);

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Assign owner/ }));

    await waitFor(() => expect(teamsCalled).toBe(true));
  });

  it("sends explicit nulls when clearing team and owner", async () => {
    mockPage([customer({ assignedTeamId: "t1", assignedToId: "kc-staff" })]);
    server.use(
      http.get("/api/backend/teams", () => HttpResponse.json(paged([team]))),
      http.get("/api/backend/users/staff", () => HttpResponse.json([{ ...staffUser, keycloakId: "kc-staff" }])),
    );
    const write = captureWrite("patch", "/customers/:id/assign", () => HttpResponse.json(customer()) as unknown as Response);

    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Assign owner/ }));
    await screen.findByText("Assign Customer");

    const dialog = screen.getByRole("dialog");
    await user.selectOptions(fieldByLabel(dialog, "Team"), "");
    await user.selectOptions(fieldByLabel(dialog, "Record Owner"), "");
    await user.click(screen.getByRole("button", { name: /Save Assignment/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toEqual({ assignedTeamId: null, assignedToId: null });
  });
});

describe("CustomersPage — resend invitation", () => {
  it("resends and confirms which address received it", async () => {
    mockPage();
    const write = captureWrite("post", "/customers/:id/resend", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Resend invitation/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(await screen.findByText("Invitation email resent to ann@acme.com.")).toBeInTheDocument();
  });

  it("reports a failure without breaking the page", async () => {
    mockPage();
    mockWriteError("post", "/customers/:id/resend", 502, "Mail server unavailable");
    const { user } = renderPage();
    await screen.findByText("Ann Bee");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Resend invitation/ }));

    expect(await screen.findByText("Mail server unavailable")).toBeInTheDocument();
    expect(screen.getByText("Ann Bee")).toBeInTheDocument();
  });
});
