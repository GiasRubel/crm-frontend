// Mirrors crm-backend/src/reports/* response DTOs and the dataset registry.

// ── Dataset registry (GET /reports/datasets) ─────────────────────────────────

export type ReportFieldType = "string" | "number" | "date" | "enum" | "boolean";

export type ReportOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "between"
  | "exists";

export type ReportMetricFn = "count" | "sum" | "avg" | "min" | "max";

export type ReportGranularity = "day" | "week" | "month" | "quarter" | "year";

export interface ReportField {
  key: string;
  label: string;
  type: ReportFieldType;
  enumValues?: string[];
  isObjectId?: boolean;
  groupable?: boolean;
  aggregatable?: boolean;
  sortable?: boolean;
}

export interface ReportDataset {
  key: string;
  label: string;
  model: string;
  description: string;
  fields: ReportField[];
  defaultColumns: string[];
  defaultDateField: string;
}

export interface DatasetRegistry {
  datasets: ReportDataset[];
  operators: ReportOperator[];
  operatorsByType: Record<ReportFieldType, ReportOperator[]>;
  metricFns: ReportMetricFn[];
  granularities: ReportGranularity[];
}

export const OPERATOR_LABELS: Record<ReportOperator, string> = {
  eq: "is",
  ne: "is not",
  gt: "greater than",
  gte: "≥",
  lt: "less than",
  lte: "≤",
  in: "is any of",
  nin: "is none of",
  contains: "contains",
  between: "between",
  exists: "exists",
};

export const METRIC_LABELS: Record<ReportMetricFn, string> = {
  count: "Count",
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
};

// ── Run report (POST /reports/run) ───────────────────────────────────────────

export interface ReportFilter {
  field: string;
  operator: ReportOperator;
  value?: unknown;
}

export interface ReportDateRange {
  field?: string;
  from?: string;
  to?: string;
}

export interface ReportMetric {
  fn: ReportMetricFn;
  field?: string;
  alias?: string;
}

export interface RunReportRequest {
  dataset: string;
  filters?: ReportFilter[];
  dateRange?: ReportDateRange;
  groupBy?: string;
  groupByGranularity?: ReportGranularity;
  metrics?: ReportMetric[];
  columns?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ReportAggregateRow {
  group: string | number | null;
  groupLabel: string;
  metrics: Record<string, number>;
}

export interface ReportResult {
  mode: "rows" | "aggregate";
  dataset: string;
  // rows mode
  columns?: string[];
  rows?: Record<string, unknown>[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
  // aggregate mode
  groupBy?: string;
  groupByGranularity?: string;
  metricAliases?: string[];
  aggregate?: ReportAggregateRow[];
}

// ── Saved reports ────────────────────────────────────────────────────────────

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  dataset: string;
  filters: ReportFilter[];
  dateRange?: ReportDateRange;
  groupBy?: string;
  groupByGranularity?: ReportGranularity;
  metrics: ReportMetric[];
  columns: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  shared: boolean;
  createdBy: string;
  createdByName: string | null;
  canManage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportRequest extends RunReportRequest {
  name: string;
  description?: string;
  shared?: boolean;
}

// ── Dashboard (GET /reports/dashboard) ───────────────────────────────────────

export type OpportunityStage =
  | "discovery"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface DashboardStageBucket {
  stage: OpportunityStage;
  count: number;
  totalAmount: number;
  weightedAmount: number;
}

export interface DashboardPipeline {
  openCount: number;
  openValue: number;
  weightedValue: number;
  wonThisMonthCount: number;
  wonThisMonthValue: number;
  winRate: number;
  byStage: DashboardStageBucket[];
}

export interface DashboardFunnel {
  totalLeads: number;
  new: number;
  contacted: number;
  qualified: number;
  unqualified: number;
  converted: number;
  conversionRate: number;
}

export interface RevenuePoint {
  month: string;
  wonValue: number;
  wonCount: number;
}

export interface BreakdownSlice {
  key: string;
  label: string;
  count: number;
}

export interface RepPerformance {
  ownerId: string;
  ownerName: string;
  wonCount: number;
  wonValue: number;
  openCount: number;
  openValue: number;
  winRate: number;
}

export interface DashboardTotals {
  customers: number;
  activeCustomers: number;
  openTickets: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface DashboardResponse {
  totals: DashboardTotals;
  pipeline: DashboardPipeline;
  funnel: DashboardFunnel;
  revenueByMonth: RevenuePoint[];
  leadsBySource: BreakdownSlice[];
  topReps: RepPerformance[];
}

export interface TeamPerformanceRow {
  teamId: string;
  teamName: string;
  memberCount: number;
  wonCount: number;
  wonValue: number;
  openCount: number;
  openValue: number;
  winRate: number;
}

export interface TeamPerformanceResponse {
  reps: RepPerformance[];
  teams: TeamPerformanceRow[];
}

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};
