import { apiClient } from "@/lib/api-client";
import {
  Activity,
  ActivityListResponse,
  ActivityQuery,
  ActivityStats,
  AssignActivityDto,
  CreateActivityDto,
  SetActivityStatusDto,
  UpdateActivityDto,
} from "../types";

function toQueryString(query: ActivityQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.due) params.set("due", query.due);
  if (query.assignedToId) params.set("assignedToId", query.assignedToId);
  if (query.relatedType && query.relatedId) {
    params.set("relatedType", query.relatedType);
    params.set("relatedId", query.relatedId);
  }
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const activityApi = {
  getAll: (query: ActivityQuery = {}) =>
    apiClient.get<ActivityListResponse>(`/activities${toQueryString(query)}`),
  getStats: () => apiClient.get<ActivityStats>("/activities/stats"),
  getById: (id: string) => apiClient.get<Activity>(`/activities/${id}`),
  create: (data: CreateActivityDto) =>
    apiClient.post<Activity>("/activities", data),
  update: (id: string, data: UpdateActivityDto) =>
    apiClient.patch<Activity>(`/activities/${id}`, data),
  setStatus: (id: string, data: SetActivityStatusDto) =>
    apiClient.patch<Activity>(`/activities/${id}/status`, data),
  assign: (id: string, data: AssignActivityDto) =>
    apiClient.patch<Activity>(`/activities/${id}/assign`, data),
  delete: (id: string) => apiClient.delete<void>(`/activities/${id}`),
  /** iCalendar (.ics) file for import into Outlook/Exchange/Google Calendar. */
  getIcs: (id: string) => apiClient.getBlob(`/activities/${id}/ics`),
};
