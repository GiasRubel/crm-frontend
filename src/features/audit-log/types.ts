export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "assign"
  | "status_change"
  | "stage_change"
  | "convert"
  | "invite_sent"
  | "login_success"
  | "login_failed"
  | "password_reset_requested"
  | "password_reset_completed";

export type AuditEntityType =
  | "contact"
  | "account"
  | "lead"
  | "opportunity"
  | "customer"
  | "ticket"
  | "team"
  | "automation_rule"
  | "user"
  | "organization"
  | "auth";

export const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  assign: "Reassigned",
  status_change: "Status changed",
  stage_change: "Stage changed",
  convert: "Converted",
  invite_sent: "Invited",
  login_success: "Signed in",
  login_failed: "Sign-in failed",
  password_reset_requested: "Password reset requested",
  password_reset_completed: "Password reset completed",
};

export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  contact: "Contact",
  account: "Account",
  lead: "Lead",
  opportunity: "Opportunity",
  customer: "Customer",
  ticket: "Ticket",
  team: "Team",
  automation_rule: "Automation rule",
  user: "Staff user",
  organization: "Organization",
  auth: "Sign-in",
};

export interface AuditFieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityLabel?: string;
  summary: string;
  changes: AuditFieldChange[];
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  meta: PaginationMeta;
}
