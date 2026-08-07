import { apiClient } from "@/lib/api-client";
import {
  AssignOpportunityDto,
  CreateOpportunityDto,
  MoveStageDto,
  Opportunity,
  OpportunityBoard,
  OpportunityListResponse,
  OpportunityQuery,
  OpportunityStats,
  UpdateOpportunityDto,
} from "../types";

function toQueryString(query: OpportunityQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.stage) params.set("stage", query.stage);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const opportunityApi = {
  getAll: (query: OpportunityQuery = {}) =>
    apiClient.get<OpportunityListResponse>(
      `/opportunities${toQueryString(query)}`,
    ),
  getBoard: () => apiClient.get<OpportunityBoard>("/opportunities/board"),
  getStats: () => apiClient.get<OpportunityStats>("/opportunities/stats"),
  getById: (id: string) => apiClient.get<Opportunity>(`/opportunities/${id}`),
  create: (data: CreateOpportunityDto) =>
    apiClient.post<Opportunity>("/opportunities", data),
  update: (id: string, data: UpdateOpportunityDto) =>
    apiClient.patch<Opportunity>(`/opportunities/${id}`, data),
  moveStage: (id: string, data: MoveStageDto) =>
    apiClient.patch<Opportunity>(`/opportunities/${id}/stage`, data),
  assign: (id: string, data: AssignOpportunityDto) =>
    apiClient.patch<Opportunity>(`/opportunities/${id}/assign`, data),
  delete: (id: string) => apiClient.delete<void>(`/opportunities/${id}`),
  exportCsv: (query: OpportunityQuery = {}) => apiClient.getBlob(`/opportunities/export${toQueryString(query)}`),
};
