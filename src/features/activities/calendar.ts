import { Activity } from "./types";
import { activityApi } from "./services/activityApi";

/** 20260710T143000Z — the compact UTC format calendar URLs expect. */
function toCalendarDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * "Add to Google Calendar" deep link — opens Google's event template
 * pre-filled from the activity. Timed activities use startAt/endAt; tasks
 * fall back to dueAt with a 30-minute block.
 */
export function googleCalendarUrl(activity: Activity): string | null {
  const start = activity.startAt ?? activity.dueAt;
  if (!start) return null;
  const end =
    activity.endAt ??
    new Date(new Date(start).getTime() + 30 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: activity.subject,
    dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
  });
  if (activity.description) params.set("details", activity.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Download the backend-rendered .ics file (Outlook/Exchange import). */
export async function downloadIcs(activity: Activity): Promise<void> {
  const blob = await activityApi.getIcs(activity.id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${activity.subject.replace(/[^\w\s-]/g, "").trim() || "activity"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
