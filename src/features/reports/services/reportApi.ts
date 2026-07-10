import { apiClient } from "@/lib/api-client";
import {
  CreateSavedReportRequest,
  DashboardResponse,
  DatasetRegistry,
  ReportResult,
  RunReportRequest,
  SavedReport,
  TeamPerformanceResponse,
} from "../types";

export interface RunSavedOverrides {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

function toQueryString(overrides: RunSavedOverrides = {}): string {
  const params = new URLSearchParams();
  if (overrides.page) params.set("page", String(overrides.page));
  if (overrides.limit) params.set("limit", String(overrides.limit));
  if (overrides.sortBy) params.set("sortBy", overrides.sortBy);
  if (overrides.sortOrder) params.set("sortOrder", overrides.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const reportApi = {
  getDatasets: () => apiClient.get<DatasetRegistry>("/reports/datasets"),
  getDashboard: () => apiClient.get<DashboardResponse>("/reports/dashboard"),
  getTeamPerformance: () =>
    apiClient.get<TeamPerformanceResponse>("/reports/team-performance"),

  run: (dto: RunReportRequest) =>
    apiClient.post<ReportResult>("/reports/run", dto),

  getSaved: () => apiClient.get<SavedReport[]>("/reports/saved"),
  getSavedById: (id: string) =>
    apiClient.get<SavedReport>(`/reports/saved/${id}`),
  createSaved: (dto: CreateSavedReportRequest) =>
    apiClient.post<SavedReport>("/reports/saved", dto),
  updateSaved: (id: string, dto: CreateSavedReportRequest) =>
    apiClient.put<SavedReport>(`/reports/saved/${id}`, dto),
  deleteSaved: (id: string) =>
    apiClient.delete<void>(`/reports/saved/${id}`),
  runSaved: (id: string, overrides?: RunSavedOverrides) =>
    apiClient.post<ReportResult>(
      `/reports/saved/${id}/run${toQueryString(overrides)}`,
      {},
    ),
};
