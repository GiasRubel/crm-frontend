import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../services/notificationApi";

const NOTIFICATIONS_KEY = "notifications";
const UNREAD_COUNT_KEY = "notifications-unread-count";

/** Notification bell data: polls in the background so the badge stays fresh. */
export const useNotifications = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
  };

  const listQuery = useQuery({
    queryKey: [NOTIFICATIONS_KEY],
    queryFn: () => notificationApi.getAll(),
    refetchInterval: 30_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: [UNREAD_COUNT_KEY],
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: invalidate,
  });

  return { listQuery, unreadCountQuery, markReadMutation, markAllReadMutation };
};
