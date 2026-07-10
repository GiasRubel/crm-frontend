import { apiClient } from "@/lib/api-client";
import {
  Account,
  AccountListResponse,
  AccountQuery,
  AccountStats,
  AccountSummary,
  AssignAccountDto,
  CreateAccountDto,
  UpdateAccountDto,
} from "../types";

function toQueryString(query: AccountQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.industry) params.set("industry", query.industry);
  if (query.size) params.set("size", query.size);
  if (query.status) params.set("status", query.status);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const accountApi = {
  getAll: (query: AccountQuery = {}) =>
    apiClient.get<AccountListResponse>(`/accounts${toQueryString(query)}`),
  getStats: () => apiClient.get<AccountStats>("/accounts/stats"),
  getById: (id: string) => apiClient.get<Account>(`/accounts/${id}`),
  /** 360-degree view: profile + linked contacts + linked deals + totals. */
  getSummary: (id: string) =>
    apiClient.get<AccountSummary>(`/accounts/${id}/summary`),
  create: (data: CreateAccountDto) =>
    apiClient.post<Account>("/accounts", data),
  update: (id: string, data: UpdateAccountDto) =>
    apiClient.patch<Account>(`/accounts/${id}`, data),
  assign: (id: string, data: AssignAccountDto) =>
    apiClient.patch<Account>(`/accounts/${id}/assign`, data),
  delete: (id: string) => apiClient.delete<void>(`/accounts/${id}`),
};
