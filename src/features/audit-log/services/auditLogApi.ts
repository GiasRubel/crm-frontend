import { apiClient } from "@/lib/api-client";
import { AuditAction, AuditEntityType, AuditLogListResponse } from "../types";

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: AuditEntityType | "";
  action?: AuditAction | "";
  entityId?: string;
}

function queryString(query: AuditLogQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.action) params.set("action", query.action);
  if (query.entityId) params.set("entityId", query.entityId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const auditLogApi = {
  getAll: (query: AuditLogQuery = {}) =>
    apiClient.get<AuditLogListResponse>(`/audit-logs${queryString(query)}`),
};
