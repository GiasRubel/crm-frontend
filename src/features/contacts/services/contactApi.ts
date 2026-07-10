import { apiClient } from "@/lib/api-client";
import {
  AddInteractionDto,
  AssignContactDto,
  Contact,
  ContactListResponse,
  ContactQuery,
  ContactStats,
  CreateContactDto,
  UpdateContactDto,
} from "../types";

function toQueryString(query: ContactQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.preferredChannel)
    params.set("preferredChannel", query.preferredChannel);
  if (query.doNotContact) params.set("doNotContact", query.doNotContact);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const contactApi = {
  getAll: (query: ContactQuery = {}) =>
    apiClient.get<ContactListResponse>(`/contacts${toQueryString(query)}`),
  getStats: () => apiClient.get<ContactStats>("/contacts/stats"),
  getById: (id: string) => apiClient.get<Contact>(`/contacts/${id}`),
  create: (data: CreateContactDto) =>
    apiClient.post<Contact>("/contacts", data),
  update: (id: string, data: UpdateContactDto) =>
    apiClient.patch<Contact>(`/contacts/${id}`, data),
  addInteraction: (id: string, data: AddInteractionDto) =>
    apiClient.post<Contact>(`/contacts/${id}/interactions`, data),
  assign: (id: string, data: AssignContactDto) =>
    apiClient.patch<Contact>(`/contacts/${id}/assign`, data),
  delete: (id: string) => apiClient.delete<void>(`/contacts/${id}`),
};
