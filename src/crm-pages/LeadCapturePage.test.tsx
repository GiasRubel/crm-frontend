import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fieldByLabel } from "../../test/utils/fields";
import { captureWrite, mockWriteError } from "../../test/utils/pageHarness";
import { renderWithProviders } from "../../test/utils/renderWithProviders";
import { LeadCapturePage } from "./LeadCapturePage";
import { ORGANIZATION_SLUG } from "@/lib/organization";

/** The public form lives outside (crm) — it must work with no session at all. */
const renderPage = () => renderWithProviders(<LeadCapturePage />, { auth: { authenticated: false } });

const fillRequired = async (
  user: ReturnType<typeof renderPage>["user"],
  form: HTMLElement,
  email = "ann@acme.com",
) => {
  await user.type(fieldByLabel(form, /First Name/), "Ann");
  await user.type(fieldByLabel(form, /Last Name/), "Bee");
  await user.type(fieldByLabel(form, /Email/), email);
};

describe("LeadCapturePage — public form", () => {
  it("renders without an authenticated session", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /Contact Sales/ })).toBeInTheDocument();
  });

  it("blocks submission and shows zod messages when required fields are empty", async () => {
    const write = captureWrite("post", "/leads/capture");
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("rejects a malformed phone number", async () => {
    const write = captureWrite("post", "/leads/capture");
    const { user } = renderPage();
    const form = await screen.findByRole("heading", { name: /Contact Sales/ }).then(() => document.body);

    await fillRequired(user, form);
    await user.type(fieldByLabel(form, /Phone/), "abc");
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts to the unauthenticated capture endpoint", async () => {
    const write = captureWrite("post", "/leads/capture", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await fillRequired(user, document.body);
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/leads/capture");
    expect(write.body).toMatchObject({ firstName: "Ann", lastName: "Bee", email: "ann@acme.com" });
  });

  // CaptureLeadDto requires organizationSlug: the endpoint is unauthenticated,
  // so the form is the only thing that can say which tenant the lead belongs to.
  it("names the organisation the submission belongs to", async () => {
    const write = captureWrite("post", "/leads/capture", () => new Response(null, { status: 204 }));

    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await fillRequired(user, document.body);
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    await waitFor(() => expect(write.called).toBe(true));
    expect((write.body as Record<string, unknown>).organizationSlug).toBe(
      ORGANIZATION_SLUG,
    );
  });

  it("omits the honeypot when a human leaves it empty", async () => {
    const write = captureWrite("post", "/leads/capture", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await fillRequired(user, document.body);
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    await waitFor(() => expect(write.called).toBe(true));
    expect((write.body as Record<string, unknown>).website).toBeUndefined();
  });

  it("forwards a filled honeypot so the backend can drop the bot submission", async () => {
    const write = captureWrite("post", "/leads/capture", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await fillRequired(user, document.body);
    // Hidden from humans, but a bot fills every input it finds.
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    await user.type(honeypot, "http://spam.example");
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    await waitFor(() => expect(write.called).toBe(true));
    expect((write.body as Record<string, unknown>).website).toBe("http://spam.example");
  });

  it("shows a thank-you confirmation after a successful submission", async () => {
    captureWrite("post", "/leads/capture", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await fillRequired(user, document.body);
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    expect(await screen.findByText(/Thanks for reaching out/)).toBeInTheDocument();
  });

  it("reports a server rejection instead of a silent failure", async () => {
    mockWriteError("post", "/leads/capture", 429, "Too many submissions — try again later");
    const { user } = renderPage();
    await screen.findByRole("heading", { name: /Contact Sales/ });

    await fillRequired(user, document.body);
    await user.click(screen.getByRole("button", { name: /Send|Submit|Contact/i }));

    expect(await screen.findByText("Too many submissions — try again later")).toBeInTheDocument();
    expect(screen.queryByText(/Thanks for reaching out/)).not.toBeInTheDocument();
  });
});
