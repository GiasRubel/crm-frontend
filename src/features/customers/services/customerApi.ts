import { apiClient } from "@/lib/api-client";
import {
  AssignCustomerDto,
  CreateCustomerDto,
  Customer,
  CustomerListResponse,
  CustomerQuery,
  CustomerStats,
  UpdateCustomerDto,
} from "../types";

function toQueryString(query: CustomerQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const customerApi = {
  getAll: (query: CustomerQuery = {}) =>
    apiClient.get<CustomerListResponse>(`/customers${toQueryString(query)}`),
  getStats: () => apiClient.get<CustomerStats>("/customers/stats"),
  getById: (id: string) => apiClient.get<Customer>(`/customers/${id}`),
  getMe: () => apiClient.get<Customer>("/customers/me"),
  create: (data: CreateCustomerDto) => apiClient.post<Customer>("/customers", data),
  update: (id: string, data: UpdateCustomerDto) =>
    apiClient.patch<Customer>(`/customers/${id}`, data),
  assign: (id: string, data: AssignCustomerDto) =>
    apiClient.patch<Customer>(`/customers/${id}/assign`, data),
  delete: (id: string) => apiClient.delete<void>(`/customers/${id}`),
  resendInvitation: (id: string) => apiClient.post<void>(`/customers/${id}/resend`, {}),
  exportCsv: (query: CustomerQuery = {}) => apiClient.getBlob(`/customers/export${toQueryString(query)}`),
};
