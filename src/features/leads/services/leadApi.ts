import { apiClient } from "@/lib/api-client";
import { ImportResult } from "@/features/import-export/types";
import {
  AddEngagementDto,
  AssignLeadDto,
  CaptureLeadDto,
  ConvertLeadDto,
  CreateLeadDto,
  Lead,
  LeadListResponse,
  LeadQuery,
  LeadStats,
  UpdateLeadDto,
} from "../types";

function toQueryString(query: LeadQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.source) params.set("source", query.source);
  if (query.rating) params.set("rating", query.rating);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const leadApi = {
  getAll: (query: LeadQuery = {}) =>
    apiClient.get<LeadListResponse>(`/leads${toQueryString(query)}`),
  getStats: () => apiClient.get<LeadStats>("/leads/stats"),
  getById: (id: string) => apiClient.get<Lead>(`/leads/${id}`),
  create: (data: CreateLeadDto) => apiClient.post<Lead>("/leads", data),
  /** Public endpoint — works without a signed-in user (returns no body). */
  capture: (data: CaptureLeadDto) => apiClient.post<void>("/leads/capture", data),
  update: (id: string, data: UpdateLeadDto) =>
    apiClient.patch<Lead>(`/leads/${id}`, data),
  addEngagement: (id: string, data: AddEngagementDto) =>
    apiClient.post<Lead>(`/leads/${id}/engagements`, data),
  assign: (id: string, data: AssignLeadDto) =>
    apiClient.patch<Lead>(`/leads/${id}/assign`, data),
  convert: (id: string, data: ConvertLeadDto) =>
    apiClient.post<Lead>(`/leads/${id}/convert`, data),
  delete: (id: string) => apiClient.delete<void>(`/leads/${id}`),
  exportCsv: (query: LeadQuery = {}) => apiClient.getBlob(`/leads/export${toQueryString(query)}`),
  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<ImportResult>("/leads/import", formData);
  },
};
