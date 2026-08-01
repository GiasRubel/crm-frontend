import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../test/msw/server";
import type { Activity } from "./types";
import { downloadIcs, googleCalendarUrl } from "./calendar";

const activity = (overrides: Partial<Activity> = {}): Activity =>
  ({
    id: "a1",
    type: "meeting",
    subject: "Kickoff call",
    status: "pending",
    priority: "normal",
    ...overrides,
  }) as Activity;

describe("googleCalendarUrl", () => {
  it("returns null when the activity has no start or due date", () => {
    expect(googleCalendarUrl(activity())).toBeNull();
  });

  it("uses startAt and endAt for a timed activity", () => {
    const url = new URL(
      googleCalendarUrl(
        activity({ startAt: "2026-07-10T14:30:00.000Z", endAt: "2026-07-10T15:30:00.000Z" }),
      )!,
    );

    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Kickoff call");
    expect(url.searchParams.get("dates")).toBe("20260710T143000Z/20260710T153000Z");
  });

  it("falls back to dueAt with a 30-minute block for a task", () => {
    const url = new URL(googleCalendarUrl(activity({ type: "task", dueAt: "2026-07-10T09:00:00.000Z" }))!);
    expect(url.searchParams.get("dates")).toBe("20260710T090000Z/20260710T093000Z");
  });

  it("prefers startAt over dueAt when both are present", () => {
    const url = new URL(
      googleCalendarUrl(
        activity({ startAt: "2026-07-11T08:00:00.000Z", dueAt: "2026-07-10T09:00:00.000Z" }),
      )!,
    );
    expect(url.searchParams.get("dates")).toBe("20260711T080000Z/20260711T083000Z");
  });

  it("includes the description as details when present", () => {
    const url = new URL(
      googleCalendarUrl(activity({ startAt: "2026-07-10T14:30:00.000Z", description: "Agenda & notes" }))!,
    );
    expect(url.searchParams.get("details")).toBe("Agenda & notes");
  });

  it("omits details when the activity has no description", () => {
    const url = new URL(googleCalendarUrl(activity({ startAt: "2026-07-10T14:30:00.000Z" }))!);
    expect(url.searchParams.has("details")).toBe(false);
  });

  it("url-encodes subjects containing reserved characters", () => {
    const url = new URL(
      googleCalendarUrl(activity({ subject: "Q3 review & planning", startAt: "2026-07-10T14:30:00.000Z" }))!,
    );
    expect(url.searchParams.get("text")).toBe("Q3 review & planning");
  });
});

describe("downloadIcs", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    click = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);

    server.use(
      http.get("/api/backend/activities/:id/ics", () =>
        HttpResponse.text("BEGIN:VCALENDAR\nEND:VCALENDAR", {
          headers: { "Content-Type": "text/calendar" },
        }),
      ),
    );
  });

  it("fetches the .ics blob and triggers a browser download", async () => {
    await downloadIcs(activity());

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });

  it("names the file after the activity subject", async () => {
    let downloadName: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    await downloadIcs(activity({ subject: "Kickoff call" }));
    expect(downloadName).toBe("Kickoff call.ics");
  });

  it("strips filesystem-hostile characters from the filename", async () => {
    let downloadName: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    await downloadIcs(activity({ subject: "Q3: review/plan?" }));
    expect(downloadName).toBe("Q3 reviewplan.ics");
  });

  it('falls back to "activity.ics" when the subject has no usable characters', async () => {
    let downloadName: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    await downloadIcs(activity({ subject: "///" }));
    expect(downloadName).toBe("activity.ics");
  });

  it("cleans up the object URL and removes the temporary link", async () => {
    await downloadIcs(activity());

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("propagates a failed download instead of silently doing nothing", async () => {
    server.use(
      http.get("/api/backend/activities/:id/ics", () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 }),
      ),
    );

    await expect(downloadIcs(activity())).rejects.toThrow("Not found");
    expect(click).not.toHaveBeenCalled();
  });
});
