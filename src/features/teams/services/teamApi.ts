import { apiClient } from "@/lib/api-client";
import {
  CreateTeamDto,
  Team,
  TeamListResponse,
  TeamQuery,
  TeamStats,
  UpdateTeamDto,
} from "../types";

function toQueryString(query: TeamQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.isActive !== undefined && query.isActive !== "")
    params.set("isActive", String(query.isActive));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const teamApi = {
  getAll: (query: TeamQuery = {}) =>
    apiClient.get<TeamListResponse>(`/teams${toQueryString(query)}`),
  getStats: () => apiClient.get<TeamStats>("/teams/stats"),
  getMy: () => apiClient.get<Team[]>("/teams/my"),
  getById: (id: string) => apiClient.get<Team>(`/teams/${id}`),
  create: (data: CreateTeamDto) => apiClient.post<Team>("/teams", data),
  update: (id: string, data: UpdateTeamDto) =>
    apiClient.patch<Team>(`/teams/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/teams/${id}`),
};
