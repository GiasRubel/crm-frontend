import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarSyncApi } from "../services/calendarSyncApi";
import { CalendarProvider } from "../types";

const CALENDAR_SYNC_KEY = "calendar-sync";

export const useCalendarSync = () => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [CALENDAR_SYNC_KEY] });

  const connectionsQuery = useQuery({
    queryKey: [CALENDAR_SYNC_KEY, "connections"],
    queryFn: () => calendarSyncApi.getConnections(),
  });

  const connectMutation = useMutation({
    mutationFn: (provider: CalendarProvider) =>
      calendarSyncApi.getAuthorizeUrl(provider),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const syncNowMutation = useMutation({
    mutationFn: (id: string) => calendarSyncApi.syncNow(id),
    onSuccess: invalidate,
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => calendarSyncApi.disconnect(id),
    onSuccess: invalidate,
  });

  return {
    connectionsQuery,
    connectMutation,
    syncNowMutation,
    disconnectMutation,
  };
};
