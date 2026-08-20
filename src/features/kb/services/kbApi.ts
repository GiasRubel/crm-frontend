import { apiClient } from "@/lib/api-client";
import { ORGANIZATION_SLUG } from "@/lib/organization";
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
  // organizationSlug is required on every public route — see lib/organization.ts.
  getPublic: (search?: string, category?: string) => {
    const params = new URLSearchParams({
      organizationSlug: ORGANIZATION_SLUG,
    });
    if (search?.trim()) params.set("search", search.trim());
    if (category?.trim()) params.set("category", category.trim());
    return apiClient.get<PublicKbArticle[]>(`/kb/public?${params.toString()}`);
  },
  getPublicBySlug: (slug: string) =>
    apiClient.get<PublicKbArticle>(
      `/kb/public/${slug}?organizationSlug=${encodeURIComponent(ORGANIZATION_SLUG)}`,
    ),
  sendFeedback: (id: string, helpful: boolean) =>
    apiClient.post<void>(`/kb/public/${id}/feedback`, {
      helpful,
      organizationSlug: ORGANIZATION_SLUG,
    }),
};
