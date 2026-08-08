import { screen, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { fieldByLabel } from "../../test/utils/fields";
import { captureWrite, mockGetError, mockGets, mockPending, mockWriteError } from "../../test/utils/pageHarness";
import { adminUser, renderWithProviders, staffUser } from "../../test/utils/renderWithProviders";
import { UsersPage } from "./UsersPage";

const staff = [
  { id: "u1", keycloakId: "kc-admin", email: "ada@x.com", firstName: "Ada", lastName: "Admin", role: "Admin" },
  { id: "u2", keycloakId: "kc-staff", email: "sam@x.com", firstName: "Sam", lastName: "Staff", role: "SalesRep" },
];

const renderPage = (auth = { user: adminUser }) => renderWithProviders(<UsersPage />, { auth });

describe("UsersPage — loading, empty, error", () => {
  it("shows a loading state", async () => {
    mockPending("/users/staff");
    mockGets({ "/roles": [] });
    renderPage();
    expect(await screen.findByRole("heading", { name: /Team Management/ })).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockGets({ "/users/staff": [], "/roles": [] });
    renderPage();
    expect(await screen.findByText(/No team members found/)).toBeInTheDocument();
  });

  // The page has no list-level error banner; a failed fetch must still render
  // the shell and the empty row rather than crashing.
  it("degrades to the empty state when the directory fetch fails", async () => {
    mockGetError("/users/staff", 403, "Only admins can list staff");
    mockGets({ "/roles": [] });
    renderPage();

    expect(await screen.findByRole("heading", { name: /Team Management/ })).toBeInTheDocument();
    expect(await screen.findByText(/No team members found/)).toBeInTheDocument();
  });
});

describe("UsersPage — staff directory", () => {
  it("lists staff names, emails and roles", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    renderPage();

    expect(await screen.findByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText("sam@x.com")).toBeInTheDocument();
    expect(screen.getByText("SalesRep")).toBeInTheDocument();
  });

  it("filters the directory by name or email", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    const { user } = renderPage();
    await screen.findByText("Ada Admin");

    await user.type(screen.getByPlaceholderText(/Search by name or email/), "sam");

    await waitFor(() => expect(screen.queryByText("Ada Admin")).not.toBeInTheDocument());
    expect(screen.getByText("Sam Staff")).toBeInTheDocument();
  });
});

describe("UsersPage — role gating", () => {
  it("shows Add Staff Member to an admin", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    renderPage();
    expect(await screen.findByRole("button", { name: /Add Staff/ })).toBeInTheDocument();
  });

  it("hides Add Staff Member from a non-admin", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    renderPage({ user: staffUser });
    await screen.findByText("Ada Admin");
    expect(screen.queryByRole("button", { name: /Add Staff/ })).not.toBeInTheDocument();
  });
});

describe("UsersPage — invite flow", () => {
  it("posts the invite with the chosen role", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    const write = captureWrite("post", "/users", () => HttpResponse.json(staff[1]) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ada Admin");

    await user.click(screen.getByRole("button", { name: /Add Staff/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Rep");
    await user.type(fieldByLabel(dialog, /Email/), "new@x.com");
    await user.click(screen.getByRole("button", { name: /Create Account/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ email: "new@x.com", firstName: "New", lastName: "Rep" });
    expect(write.body).toHaveProperty("role");
  });

  it("never sends a password — the invite email sets it", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    const write = captureWrite("post", "/users", () => HttpResponse.json(staff[1]) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("Ada Admin");

    await user.click(screen.getByRole("button", { name: /Add Staff/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(fieldByLabel(dialog, /First Name/), "New");
    await user.type(fieldByLabel(dialog, /Last Name/), "Rep");
    await user.type(fieldByLabel(dialog, /Email/), "new@x.com");
    await user.click(screen.getByRole("button", { name: /Create Account/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).not.toHaveProperty("password");
  });

  it("reports a duplicate-email rejection", async () => {
    mockGets({ "/users/staff": staff, "/roles": [] });
    mockWriteError("post", "/users", 409, "User already exists");
    const { user } = renderPage();
    await screen.findByText("Ada Admin");

    await user.click(screen.getByRole("button", { name: /Add Staff/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(fieldByLabel(dialog, /First Name/), "Dupe");
    await user.type(fieldByLabel(dialog, /Last Name/), "User");
    await user.type(fieldByLabel(dialog, /Email/), "ada@x.com");
    await user.click(screen.getByRole("button", { name: /Create Account/ }));

    expect(await screen.findByText("User already exists")).toBeInTheDocument();
  });
});
