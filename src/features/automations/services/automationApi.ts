import { apiClient } from "@/lib/api-client";
import {
  AutomationRule,
  AutomationStats,
  CreateAutomationRuleDto,
  RuleKind,
  RuleListResponse,
  RunListResponse,
  RunStatus,
  UpdateAutomationRuleDto,
} from "../types";

export interface RuleQuery {
  page?: number;
  limit?: number;
  kind?: RuleKind | "";
  isActive?: "true" | "false" | "";
}

export interface RunQuery {
  page?: number;
  limit?: number;
  ruleId?: string;
  status?: RunStatus | "";
}

function ruleQueryString(query: RuleQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.kind) params.set("kind", query.kind);
  if (query.isActive) params.set("isActive", query.isActive);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function runQueryString(query: RunQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.ruleId) params.set("ruleId", query.ruleId);
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const automationApi = {
  getAll: (query: RuleQuery = {}) =>
    apiClient.get<RuleListResponse>(`/automations${ruleQueryString(query)}`),
  getStats: () => apiClient.get<AutomationStats>("/automations/stats"),
  getRuns: (query: RunQuery = {}) =>
    apiClient.get<RunListResponse>(
      `/automations/runs${runQueryString(query)}`,
    ),
  getById: (id: string) => apiClient.get<AutomationRule>(`/automations/${id}`),
  create: (data: CreateAutomationRuleDto) =>
    apiClient.post<AutomationRule>("/automations", data),
  update: (id: string, data: UpdateAutomationRuleDto) =>
    apiClient.patch<AutomationRule>(`/automations/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/automations/${id}`),
};
