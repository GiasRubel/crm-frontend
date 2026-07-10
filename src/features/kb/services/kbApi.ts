import { apiClient } from "@/lib/api-client";
import {
  CreateKbArticleDto,
  KbArticle,
  KbListResponse,
  KbQuery,
  KbStats,
  PublicKbArticle,
  UpdateKbArticleDto,
} from "../types";

function toQueryString(query: KbQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.category?.trim()) params.set("category", query.category.trim());
  if (query.status) params.set("status", query.status);
  if (query.visibility) params.set("visibility", query.visibility);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const kbApi = {
  // Staff wiki
  getAll: (query: KbQuery = {}) =>
    apiClient.get<KbListResponse>(`/kb${toQueryString(query)}`),
  getStats: () => apiClient.get<KbStats>("/kb/stats"),
  getById: (id: string) => apiClient.get<KbArticle>(`/kb/${id}`),
  create: (data: CreateKbArticleDto) => apiClient.post<KbArticle>("/kb", data),
  update: (id: string, data: UpdateKbArticleDto) =>
    apiClient.patch<KbArticle>(`/kb/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/kb/${id}`),

  // Public FAQ (also used by the unauthenticated /faq page)
  getPublic: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search?.trim()) params.set("search", search.trim());
    if (category?.trim()) params.set("category", category.trim());
    const qs = params.toString();
    return apiClient.get<PublicKbArticle[]>(`/kb/public${qs ? `?${qs}` : ""}`);
  },
  getPublicBySlug: (slug: string) =>
    apiClient.get<PublicKbArticle>(`/kb/public/${slug}`),
  sendFeedback: (id: string, helpful: boolean) =>
    apiClient.post<void>(`/kb/public/${id}/feedback`, { helpful }),
};
