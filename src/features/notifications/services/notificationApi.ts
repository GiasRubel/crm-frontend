import { apiClient } from "@/lib/api-client";
import { Notification } from "../types";

export const notificationApi = {
  getAll: (unreadOnly = false) =>
    apiClient.get<Notification[]>(`/notifications?limit=20${unreadOnly ? "&unreadOnly=true" : ""}`),
  getUnreadCount: () => apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => apiClient.patch<Notification>(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.patch<void>("/notifications/read-all", {}),
};
