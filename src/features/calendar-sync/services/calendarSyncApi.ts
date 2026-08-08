import { apiClient } from "@/lib/api-client";
import { CalendarConnection, CalendarProvider } from "../types";

export const calendarSyncApi = {
  getConnections: () =>
    apiClient.get<CalendarConnection[]>("/calendar-sync/connections"),
  getAuthorizeUrl: (provider: CalendarProvider) =>
    apiClient.get<{ url: string }>(`/calendar-sync/${provider}/authorize`),
  syncNow: (id: string) =>
    apiClient.post<CalendarConnection>(`/calendar-sync/${id}/sync-now`, {}),
  disconnect: (id: string) =>
    apiClient.delete<void>(`/calendar-sync/${id}`),
};
