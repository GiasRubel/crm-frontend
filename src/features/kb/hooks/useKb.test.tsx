import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useKb } from "./useKb";

const article = { id: "k1", title: "Password reset", slug: "password-reset", status: "published", visibility: "public" };
const list = { data: [article], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, draft: 0, published: 1, archived: 0, publicCount: 1 };

function mockBase() {
  server.use(
    http.get("/api/backend/kb", () => HttpResponse.json(list)),
    http.get("/api/backend/kb/stats", () => HttpResponse.json(stats)),
  );
}

async function readyHarness() {
  mockBase();
  const harness = renderFeatureHook(() => useKb({}));
  await waitFor(() => expect(harness.result.current.articlesQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useKb — queries", () => {
  it("loads articles and stats", async () => {
    const { result } = await readyHarness();
    expect(result.current.articlesQuery.data?.data[0].title).toBe("Password reset");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("forwards status and visibility filters", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/kb", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/kb/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useKb({ status: "draft", visibility: "internal" }));
    await waitFor(() => expect(result.current.articlesQuery.isSuccess).toBe(true));

    expect(Object.fromEntries(seen!.searchParams)).toEqual({ status: "draft", visibility: "internal" });
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/kb", () => HttpResponse.json({ message: "Nope" }, { status: 500 })),
      http.get("/api/backend/kb/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useKb({}));
    await waitFor(() => expect(result.current.articlesQuery.isError).toBe(true));
    expect((result.current.articlesQuery.error as ApiError).status).toBe(500);
  });
});

describe("useKb — mutations", () => {
  it("createArticle invalidates kb", async () => {
    const harness = await readyHarness();
    server.use(http.post("/api/backend/kb", () => HttpResponse.json(article)));

    await act(async () => {
      await harness.result.current.createArticleMutation.mutateAsync({ title: "New", body: "Body" });
    });

    await expectInvalidates(harness, ["kb"]);
  });

  it("publishing an article invalidates kb so the public list refreshes", async () => {
    const harness = await readyHarness();
    let body: unknown;
    server.use(
      http.patch("/api/backend/kb/:id", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(article);
      }),
    );

    await act(async () => {
      await harness.result.current.updateArticleMutation.mutateAsync({
        id: "k1",
        data: { status: "published", visibility: "public" },
      });
    });

    expect(body).toEqual({ status: "published", visibility: "public" });
    await expectInvalidates(harness, ["kb"]);
  });

  it("deleteArticle invalidates kb", async () => {
    const harness = await readyHarness();
    server.use(http.delete("/api/backend/kb/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteArticleMutation.mutateAsync("k1");
    });

    await expectInvalidates(harness, ["kb"]);
  });
});
