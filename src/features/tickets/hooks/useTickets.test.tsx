import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { expectInvalidates, renderFeatureHook } from "../../../../test/utils/hookHarness";
import { ApiError } from "@/lib/api-client";
import { useMyTickets, useTickets } from "./useTickets";

const ticket = { id: "t1", number: 1001, subject: "Cannot log in", status: "open", priority: "high" };
const list = { data: [ticket], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
const stats = { total: 1, open: 1, pending: 0, resolved: 0, closed: 0, unassigned: 0 };

function mockStaffBase() {
  server.use(
    http.get("/api/backend/tickets", () => HttpResponse.json(list)),
    http.get("/api/backend/tickets/stats", () => HttpResponse.json(stats)),
  );
}

async function readyStaff() {
  mockStaffBase();
  const harness = renderFeatureHook(() => useTickets({}));
  await waitFor(() => expect(harness.result.current.ticketsQuery.isSuccess).toBe(true));
  harness.invalidate.mockClear();
  return harness;
}

describe("useTickets — staff helpdesk queries", () => {
  it("loads the staff ticket list and stats", async () => {
    const { result } = await readyStaff();
    expect(result.current.ticketsQuery.data?.data[0].subject).toBe("Cannot log in");
    await waitFor(() => expect(result.current.statsQuery.data).toEqual(stats));
  });

  it("hits the staff endpoint, never the portal one", async () => {
    const paths: string[] = [];
    server.use(
      http.get("/api/backend/tickets", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/tickets/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useTickets({}));
    await waitFor(() => expect(result.current.ticketsQuery.isSuccess).toBe(true));
    expect(paths).toEqual(["/api/backend/tickets"]);
  });

  it("forwards queue filters (unassigned, openOnly, priority)", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("/api/backend/tickets", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json(list);
      }),
      http.get("/api/backend/tickets/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() =>
      useTickets({ unassigned: "true", openOnly: "true", priority: "urgent" }),
    );
    await waitFor(() => expect(result.current.ticketsQuery.isSuccess).toBe(true));

    expect(Object.fromEntries(seen!.searchParams)).toEqual({
      unassigned: "true",
      openOnly: "true",
      priority: "urgent",
    });
  });

  it("surfaces an ApiError on failure", async () => {
    server.use(
      http.get("/api/backend/tickets", () => HttpResponse.json({ message: "Nope" }, { status: 403 })),
      http.get("/api/backend/tickets/stats", () => HttpResponse.json(stats)),
    );

    const { result } = renderFeatureHook(() => useTickets({}));
    await waitFor(() => expect(result.current.ticketsQuery.isError).toBe(true));
    expect((result.current.ticketsQuery.error as ApiError).status).toBe(403);
  });
});

describe("useTickets — staff mutations", () => {
  it("createTicket invalidates tickets", async () => {
    const harness = await readyStaff();
    server.use(http.post("/api/backend/tickets", () => HttpResponse.json(ticket)));

    await act(async () => {
      await harness.result.current.createTicketMutation.mutateAsync({
        subject: "New",
        description: "Broken",
        customerId: "c1",
      });
    });

    await expectInvalidates(harness, ["tickets"]);
  });

  it("updateTicket invalidates tickets", async () => {
    const harness = await readyStaff();
    server.use(http.patch("/api/backend/tickets/:id", () => HttpResponse.json(ticket)));

    await act(async () => {
      await harness.result.current.updateTicketMutation.mutateAsync({ id: "t1", data: { priority: "low" } });
    });

    await expectInvalidates(harness, ["tickets"]);
  });

  it("setStatus sends the bare status wrapped in a body and invalidates", async () => {
    const harness = await readyStaff();
    let body: unknown;
    server.use(
      http.patch("/api/backend/tickets/:id/status", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ticket);
      }),
    );

    await act(async () => {
      await harness.result.current.setStatusMutation.mutateAsync({ id: "t1", status: "resolved" });
    });

    expect(body).toEqual({ status: "resolved" });
    await expectInvalidates(harness, ["tickets"]);
  });

  it("addComment invalidates tickets", async () => {
    const harness = await readyStaff();
    server.use(http.post("/api/backend/tickets/:id/comments", () => HttpResponse.json(ticket)));

    await act(async () => {
      await harness.result.current.addCommentMutation.mutateAsync({
        id: "t1",
        data: { body: "On it", isInternal: true },
      });
    });

    await expectInvalidates(harness, ["tickets"]);
  });

  it("assignTicket invalidates tickets", async () => {
    const harness = await readyStaff();
    server.use(http.patch("/api/backend/tickets/:id/assign", () => HttpResponse.json(ticket)));

    await act(async () => {
      await harness.result.current.assignTicketMutation.mutateAsync({ id: "t1", data: { assignedToId: "u1" } });
    });

    await expectInvalidates(harness, ["tickets"]);
  });

  it("deleteTicket invalidates tickets", async () => {
    const harness = await readyStaff();
    server.use(http.delete("/api/backend/tickets/:id", () => new HttpResponse(null, { status: 204 })));

    await act(async () => {
      await harness.result.current.deleteTicketMutation.mutateAsync("t1");
    });

    await expectInvalidates(harness, ["tickets"]);
  });
});

describe("useMyTickets — customer portal", () => {
  it("does not fetch while disabled (staff sessions)", async () => {
    let called = false;
    server.use(
      http.get("/api/backend/tickets/my", () => {
        called = true;
        return HttpResponse.json([ticket]);
      }),
    );

    const { result } = renderFeatureHook(() => useMyTickets(false));
    expect(result.current.myTicketsQuery.fetchStatus).toBe("idle");
    expect(called).toBe(false);
  });

  it("fetches the portal list from /tickets/my when enabled", async () => {
    let path: string | undefined;
    server.use(
      http.get("/api/backend/tickets/my", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json([ticket]);
      }),
    );

    const { result } = renderFeatureHook(() => useMyTickets(true));
    await waitFor(() => expect(result.current.myTicketsQuery.isSuccess).toBe(true));

    expect(path).toBe("/api/backend/tickets/my");
    expect(result.current.myTicketsQuery.data).toHaveLength(1);
  });

  it("createMyTicket posts to the portal endpoint and invalidates tickets", async () => {
    let path: string | undefined;
    server.use(
      http.get("/api/backend/tickets/my", () => HttpResponse.json([ticket])),
      http.post("/api/backend/tickets/my", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(ticket);
      }),
    );

    const harness = renderFeatureHook(() => useMyTickets(true));
    await waitFor(() => expect(harness.result.current.myTicketsQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.createMyTicketMutation.mutateAsync({
        subject: "Help",
        description: "Broken",
      });
    });

    expect(path).toBe("/api/backend/tickets/my");
    await expectInvalidates(harness, ["tickets"]);
  });

  it("addMyComment wraps the bare string body and invalidates tickets", async () => {
    let body: unknown;
    server.use(
      http.get("/api/backend/tickets/my", () => HttpResponse.json([ticket])),
      http.post("/api/backend/tickets/my/:id/comments", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ticket);
      }),
    );

    const harness = renderFeatureHook(() => useMyTickets(true));
    await waitFor(() => expect(harness.result.current.myTicketsQuery.isSuccess).toBe(true));
    harness.invalidate.mockClear();

    await act(async () => {
      await harness.result.current.addMyCommentMutation.mutateAsync({ id: "t1", body: "Any update?" });
    });

    expect(body).toEqual({ body: "Any update?" });
    await expectInvalidates(harness, ["tickets"]);
  });
});
