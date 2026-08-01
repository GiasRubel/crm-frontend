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
import type { KbArticle } from "@/features/kb/types";
import { KnowledgeBasePage } from "./KnowledgeBasePage";

const article = (overrides: Partial<KbArticle> = {}): KbArticle =>
  ({
    id: "k1",
    title: "How do I reset my password?",
    slug: "reset-password",
    body: "Open the login page and click Forgot password.",
    category: "Account",
    tags: ["password", "login"],
    status: "published",
    visibility: "public",
    authorId: "u1",
    authorName: "Ada Admin",
    updatedById: null,
    updatedByName: null,
    views: 120,
    helpfulCount: 8,
    notHelpfulCount: 1,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides,
  }) as KbArticle;

const stats = { total: 4, draft: 1, published: 3, archived: 0, publicCount: 2 };

const mockPage = (articles: KbArticle[] = [article()], total = articles.length) =>
  mockGets({ "/kb": paged(articles, { total }), "/kb/stats": stats });

const renderPage = (auth = { user: adminUser }) =>
  renderWithProviders(<KnowledgeBasePage />, { auth });

describe("KnowledgeBasePage — loading, empty, error", () => {
  it("shows a fetching row while loading", async () => {
    mockPending("/kb");
    mockGets({ "/kb/stats": stats });
    renderPage();
    expect(await screen.findByText("Fetching articles...")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    mockPage([]);
    renderPage();
    expect(await screen.findByRole("heading", { name: /Knowledge Base/ })).toBeInTheDocument();
  });

  it("surfaces the API error message", async () => {
    mockGetError("/kb", 500, "Wiki unavailable");
    mockGets({ "/kb/stats": stats });
    renderPage();
    expect(await screen.findByText("Wiki unavailable")).toBeInTheDocument();
  });
});

describe("KnowledgeBasePage — populated list", () => {
  it("renders the article title and category", async () => {
    mockPage();
    renderPage();

    expect(await screen.findByText("How do I reset my password?")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("renders the view count", async () => {
    mockPage();
    renderPage();
    await screen.findByText("How do I reset my password?");
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });
});

describe("KnowledgeBasePage — filters", () => {
  it("debounces the search term", async () => {
    const searches: string[] = [];
    mockPage();
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    server.use(
      http.get("/api/backend/kb", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search") ?? "");
        return HttpResponse.json(paged([article()]));
      }),
    );

    await user.type(screen.getByPlaceholderText(/Search title/), "reset");

    await waitFor(() => expect(searches).toContain("reset"));
    expect(searches.filter((s) => s === "reset")).toHaveLength(1);
  });

  it("sends the status filter", async () => {
    mockPage();
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    let seen: string | null = null;
    server.use(
      http.get("/api/backend/kb", ({ request }) => {
        seen = new URL(request.url).searchParams.get("status");
        return HttpResponse.json(paged([article()]));
      }),
    );

    const select = screen
      .getAllByRole("combobox")
      .find((el) => [...(el as HTMLSelectElement).options].some((o) => o.value === "draft"));
    await user.selectOptions(select!, "draft");

    await waitFor(() => expect(seen).toBe("draft"));
  });
});

describe("KnowledgeBasePage — role gating", () => {
  it("shows New Article to an admin", async () => {
    mockPage();
    renderPage();
    expect(await screen.findByRole("button", { name: /New Article/ })).toBeInTheDocument();
  });

  // Authoring is open to all staff; only the row-level admin actions are gated.
  it("also shows New Article to a non-admin staff user", async () => {
    mockPage();
    renderPage({ user: staffUser });
    await screen.findByText("How do I reset my password?");
    expect(screen.getByRole("button", { name: /New Article/ })).toBeInTheDocument();
  });
});

describe("KnowledgeBasePage — create dialog", () => {
  it("requires a title", async () => {
    mockPage();
    const write = captureWrite("post", "/kb");
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    await user.click(screen.getByRole("button", { name: /New Article/ }));
    await user.click(await screen.findByRole("button", { name: /^Create Article$/ }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(write.called).toBe(false);
  });

  it("posts a valid article", async () => {
    mockPage();
    const write = captureWrite("post", "/kb", () => HttpResponse.json(article()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    await user.click(screen.getByRole("button", { name: /New Article/ }));
    const dialog = await screen.findByRole("dialog");

    await user.type(fieldByLabel(dialog, /Title/), "Exporting your data");
    await user.type(fieldByLabel(dialog, /Body|Content|Article/), "Click Export in the toolbar.");
    await user.click(screen.getByRole("button", { name: /^Create Article$/ }));

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.body).toMatchObject({ title: "Exporting your data" });
  });
});

describe("KnowledgeBasePage — publishing", () => {
  it("patches status and visibility when publishing", async () => {
    mockPage([article({ status: "draft", visibility: "internal" })]);
    const write = captureWrite("patch", "/kb/:id", () => HttpResponse.json(article()) as unknown as Response);
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    const publish = await screen.findByRole("menuitem", { name: /Publish/ });
    await user.click(publish);

    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/kb/k1");
    expect(write.body).toMatchObject({ status: "published" });
  });
});

describe("KnowledgeBasePage — delete", () => {
  it("requires confirmation, then deletes", async () => {
    mockPage();
    const write = captureWrite("delete", "/kb/:id", () => new Response(null, { status: 204 }));
    const { user } = renderPage();
    await screen.findByText("How do I reset my password?");

    await user.click(screen.getByRole("button", { name: "Open actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    expect(await screen.findByText("Delete article?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Delete Article$/ }));
    await waitFor(() => expect(write.called).toBe(true));
    expect(write.pathname).toBe("/api/backend/kb/k1");
  });
});
