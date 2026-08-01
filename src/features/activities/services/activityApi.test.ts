import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../test/msw/server";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { activityApi } from "./activityApi";

describeApiContract("activityApi", [
  { name: "getAll -> GET /activities", call: () => activityApi.getAll(), method: "GET", path: "/activities" },
  {
    name: "getAll encodes every supported filter",
    call: () =>
      activityApi.getAll({
        page: 2,
        limit: 20,
        search: "call",
        type: "call",
        status: "pending",
        priority: "high",
        due: "today",
        assignedToId: "u1",
        sortBy: "dueAt",
        sortOrder: "asc",
      }),
    method: "GET",
    path: "/activities",
    query: {
      page: "2",
      limit: "20",
      search: "call",
      type: "call",
      status: "pending",
      priority: "high",
      due: "today",
      assignedToId: "u1",
      sortBy: "dueAt",
      sortOrder: "asc",
    },
  },
  { name: "getStats -> GET /activities/stats", call: () => activityApi.getStats(), method: "GET", path: "/activities/stats" },
  { name: "getById -> GET /activities/:id", call: () => activityApi.getById("a1"), method: "GET", path: "/activities/a1" },
  {
    name: "create -> POST /activities",
    call: () =>
      activityApi.create({
        type: "task",
        subject: "Follow up",
        priority: "high",
        dueAt: "2026-08-10T09:00:00.000Z",
        relatedType: "lead",
        relatedId: "l1",
      }),
    method: "POST",
    path: "/activities",
    body: {
      type: "task",
      subject: "Follow up",
      priority: "high",
      dueAt: "2026-08-10T09:00:00.000Z",
      relatedType: "lead",
      relatedId: "l1",
    },
  },
  {
    name: "update -> PATCH /activities/:id",
    call: () => activityApi.update("a1", { subject: "Renamed" }),
    method: "PATCH",
    path: "/activities/a1",
    body: { subject: "Renamed" },
  },
  {
    name: "setStatus -> PATCH /activities/:id/status",
    call: () => activityApi.setStatus("a1", { status: "completed" }),
    method: "PATCH",
    path: "/activities/a1/status",
    body: { status: "completed" },
  },
  {
    name: "assign -> PATCH /activities/:id/assign",
    call: () => activityApi.assign("a1", { assignedToId: "u1", assignedTeamId: null }),
    method: "PATCH",
    path: "/activities/a1/assign",
    body: { assignedToId: "u1", assignedTeamId: null },
  },
  {
    name: "delete -> DELETE /activities/:id",
    call: () => activityApi.delete("a1"),
    method: "DELETE",
    path: "/activities/a1",
    respond: () => new Response(null, { status: 204 }),
  },
  {
    name: "getIcs -> GET /activities/:id/ics",
    call: () => activityApi.getIcs("a1"),
    method: "GET",
    path: "/activities/a1/ics",
    respond: () => new Response("BEGIN:VCALENDAR", { headers: { "content-type": "text/calendar" } }),
  },
]);

describe("activityApi — related-record filter", () => {
  it("sends relatedType and relatedId together", async () => {
    const req = await captureRequest(() =>
      activityApi.getAll({ relatedType: "opportunity", relatedId: "o1" }),
    );
    expect(Object.fromEntries(req.search)).toEqual({ relatedType: "opportunity", relatedId: "o1" });
  });

  it("sends neither when only relatedType is given — a half filter would match everything", async () => {
    const req = await captureRequest(() => activityApi.getAll({ relatedType: "opportunity" }));
    expect(req.search.toString()).toBe("");
  });

  it("sends neither when only relatedId is given", async () => {
    const req = await captureRequest(() => activityApi.getAll({ relatedId: "o1" }));
    expect(req.search.toString()).toBe("");
  });
});

describe("activityApi.getIcs", () => {
  it("returns the calendar payload as a blob rather than parsed JSON", async () => {
    server.use(
      http.get("/api/backend/activities/a1/ics", () =>
        HttpResponse.text("BEGIN:VCALENDAR\nSUMMARY:Follow up\nEND:VCALENDAR", {
          headers: { "Content-Type": "text/calendar" },
        }),
      ),
    );

    const blob = await activityApi.getIcs("a1");
    expect(blob.type).toBe("text/calendar");
    await expect(blob.text()).resolves.toContain("SUMMARY:Follow up");
  });
});
