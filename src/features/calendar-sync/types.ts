export type CalendarProvider = "google" | "microsoft";
export type CalendarConnectionStatus = "active" | "error" | "disconnected";

export const CALENDAR_PROVIDER_LABELS: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  microsoft: "Microsoft 365 (Outlook)",
};

export interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  providerAccountEmail: string | null;
  status: CalendarConnectionStatus;
  lastError: string | null;
  lastSyncedAt: string | null;
  createdAt: string | null;
}
