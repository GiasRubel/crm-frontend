import { apiClient } from "@/lib/api-client";
import {
  AddCommentDto,
  AssignTicketDto,
  CreateMyTicketDto,
  CreateTicketDto,
  Ticket,
  TicketListResponse,
  TicketQuery,
  TicketStats,
  TicketStatus,
  UpdateTicketDto,
} from "../types";

function toQueryString(query: TicketQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.openOnly) params.set("openOnly", query.openOnly);
  if (query.type) params.set("type", query.type);
  if (query.priority) params.set("priority", query.priority);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.assignedToId) params.set("assignedToId", query.assignedToId);
  if (query.unassigned) params.set("unassigned", query.unassigned);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const ticketApi = {
  // Staff helpdesk
  getAll: (query: TicketQuery = {}) =>
    apiClient.get<TicketListResponse>(`/tickets${toQueryString(query)}`),
  getStats: () => apiClient.get<TicketStats>("/tickets/stats"),
  getById: (id: string) => apiClient.get<Ticket>(`/tickets/${id}`),
  create: (data: CreateTicketDto) => apiClient.post<Ticket>("/tickets", data),
  update: (id: string, data: UpdateTicketDto) =>
    apiClient.patch<Ticket>(`/tickets/${id}`, data),
  setStatus: (id: string, status: TicketStatus) =>
    apiClient.patch<Ticket>(`/tickets/${id}/status`, { status }),
  addComment: (id: string, data: AddCommentDto) =>
    apiClient.post<Ticket>(`/tickets/${id}/comments`, data),
  assign: (id: string, data: AssignTicketDto) =>
    apiClient.patch<Ticket>(`/tickets/${id}/assign`, data),
  delete: (id: string) => apiClient.delete<void>(`/tickets/${id}`),

  // Customer portal (AppRole.Customer)
  getMy: () => apiClient.get<Ticket[]>("/tickets/my"),
  getMyById: (id: string) => apiClient.get<Ticket>(`/tickets/my/${id}`),
  createMy: (data: CreateMyTicketDto) =>
    apiClient.post<Ticket>("/tickets/my", data),
  addMyComment: (id: string, body: string) =>
    apiClient.post<Ticket>(`/tickets/my/${id}/comments`, { body }),
};
