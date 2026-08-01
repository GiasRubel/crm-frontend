import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { captureWrite, mockGetError, mockGets, mockPending } from "../../test/utils/pageHarness";
import { renderWithProviders } from "../../test/utils/renderWithProviders";
import { PublicFaqPage } from "./PublicFaqPage";

const article = {
  id: "k1",
  title: "How do I reset my password?",
  slug: "reset-password",
  body: "Open the login page and click Forgot password.",
  category: "Account",
  tags: ["password"],
  updatedAt: "2026-01-20T10:00:00.000Z",
};

/** The help centre lives outside (crm) — it must render with no session. */
const renderPage = () => renderWithProviders(<PublicFaqPage />, { auth: { authenticated: false } });

describe("PublicFaqPage — listing", () => {
  it("renders without an authenticated session", async () => {
    mockGets({ "/kb/public": [article] });
    renderPage();
    expect(await screen.findByRole("heading", { name: /How can we help/ })).toBeInTheDocument();
  });

  it("shows a loading state first", async () => {
    mockPending("/kb/public");
    renderPage();
    expect(await screen.findByText(/Loading help center/)).toBeInTheDocument();
  });

  it("lists published public articles", async () => {
    mockGets({ "/kb/public": [article] });
    renderPage();
    expect(await screen.findByText("How do I reset my password?")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    mockGets({ "/kb/public": [] });
    renderPage();
    expect(await screen.findByText("No articles found")).toBeInTheDocument();
  });

  it("degrades gracefully when the help centre is unavailable", async () => {
    mockGetError("/kb/public", 500, "KB unavailable");
    renderPage();
    expect(await screen.findByRole("heading", { name: /How can we help/ })).toBeInTheDocument();
  });
});

describe("PublicFaqPage — search", () => {
  it("debounces the search term before querying", async () => {
    const searches: string[] = [];
    mockGets({ "/kb/public": [article] });
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    server.use(
      http.get("/api/backend/kb/public", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json([article]);
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search the help center/), "reset");

    await waitFor(() => expect(searches).toContain("reset"));
    expect(searches.filter((s) => s === "reset")).toHaveLength(1);
  });
});

describe("PublicFaqPage — article view", () => {
  it("opens an article by slug", async () => {
    mockGets({ "/kb/public": [article] });
    server.use(
      http.get("/api/backend/kb/public/reset-password", () => HttpResponse.json(article)),
    );

    const { user } = renderPage();
    await user.click(await screen.findByText("How do I reset my password?"));

    expect(await screen.findByText(/Open the login page/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All articles/ })).toBeInTheDocument();
  });

  it("returns to the list", async () => {
    mockGets({ "/kb/public": [article] });
    server.use(
      http.get("/api/backend/kb/public/reset-password", () => HttpResponse.json(article)),
    );

    const { user } = renderPage();
    await user.click(await screen.findByText("How do I reset my password?"));
    await screen.findByRole("button", { name: /All articles/ });

    await user.click(screen.getByRole("button", { name: /All articles/ }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /All articles/ })).not.toBeInTheDocument(),
    );
  });

  it("handles an article that has since been unpublished", async () => {
    mockGets({ "/kb/public": [article] });
    mockGetError("/kb/public/reset-password", 404, "Not found");

    const { user } = renderPage();
    await user.click(await screen.findByText("How do I reset my password?"));

    expect(await screen.findByText(/no longer available/)).toBeInTheDocument();
  });
});

describe("PublicFaqPage — feedback", () => {
  it("submits a helpful rating for the open article", async () => {
    mockGets({ "/kb/public": [article] });
    server.use(
      http.get("/api/backend/kb/public/reset-password", () => HttpResponse.json(article)),
    );
    const write = captureWrite(
      "post",
      "/kb/public/:id/feedback",
      () => new Response(null, { status: 204 }),
    );

    const { user } = renderPage();
    await user.click(await screen.findByText("How do I reset my password?"));
    await screen.findByText(/Open the login page/);

    const yes = await screen.findByRole("button", { name: /Yes|Helpful/i });
    await user.click(yes);

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/kb/public/k1/feedback");
    expect(write.body).toEqual({ helpful: true });
  });
});
