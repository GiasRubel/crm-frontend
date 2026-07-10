export type RuleKind = "trigger" | "sla";
export type SlaEntity = "lead" | "opportunity" | "ticket";

export type CrmEvent =
  | "lead.created"
  | "lead.status_changed"
  | "lead.score_changed"
  | "opportunity.created"
  | "opportunity.stage_changed"
  | "customer.created"
  | "contact.created"
  | "ticket.created"
  | "ticket.status_changed";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "crossed_above";

export type ActionType =
  | "create_task"
  | "send_email"
  | "assign_record"
  | "call_webhook";

export type EmailRecipient = "record" | "owner" | "custom";
export type RunStatus = "success" | "partial" | "failed";

export const EVENT_LABELS: Record<CrmEvent, string> = {
  "lead.created": "Lead created",
  "lead.status_changed": "Lead status changed",
  "lead.score_changed": "Lead score changed",
  "opportunity.created": "Opportunity created",
  "opportunity.stage_changed": "Opportunity stage changed",
  "customer.created": "Customer created",
  "contact.created": "Contact created",
  "ticket.created": "Ticket created",
  "ticket.status_changed": "Ticket status changed",
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  greater_than: "is greater than",
  less_than: "is less than",
  crossed_above: "crossed above (transition)",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  create_task: "Create a task",
  send_email: "Send an email",
  assign_record: "Assign the record",
  call_webhook: "Call a webhook",
};

/** Context fields commonly available per event (UI hints, not exhaustive). */
export const EVENT_FIELD_HINTS: Record<CrmEvent, string[]> = {
  "lead.created": ["status", "source", "score", "company", "email"],
  "lead.status_changed": ["previousStatus", "newStatus", "score", "source"],
  "lead.score_changed": ["previousScore", "newScore", "score (crossed_above)", "status"],
  "opportunity.created": ["stage", "amount", "name"],
  "opportunity.stage_changed": ["previousStage", "newStage", "amount"],
  "customer.created": ["status", "company", "email"],
  "contact.created": ["jobTitle", "country", "preferredChannel", "email"],
  "ticket.created": ["type", "priority", "status", "number"],
  "ticket.status_changed": ["previousStatus", "newStatus", "priority", "type"],
};

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface RuleAction {
  type: ActionType;
  taskSubject?: string;
  taskDescription?: string;
  taskDueInDays?: number;
  taskPriority?: "low" | "normal" | "high";
  emailTo?: EmailRecipient;
  emailAddress?: string;
  emailSubject?: string;
  emailBody?: string;
  assignToId?: string;
  assignTeamId?: string;
  webhookUrl?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  kind: RuleKind;
  isActive: boolean;
  triggerEvent: CrmEvent | null;
  slaEntity: SlaEntity | null;
  slaIdleHours: number | null;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdBy: string;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationRuleDto {
  name: string;
  description?: string;
  kind: RuleKind;
  isActive?: boolean;
  triggerEvent?: CrmEvent;
  slaEntity?: SlaEntity;
  slaIdleHours?: number;
  conditions?: RuleCondition[];
  actions: RuleAction[];
}

export type UpdateAutomationRuleDto = Partial<
  Omit<CreateAutomationRuleDto, "kind">
>;

export interface AutomationRun {
  id: string;
  ruleId: string;
  ruleName: string;
  event: string;
  recordType: string;
  recordId: string;
  recordName: string | null;
  status: RunStatus;
  logs: string[];
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RuleListResponse {
  data: AutomationRule[];
  meta: PaginationMeta;
}

export interface RunListResponse {
  data: AutomationRun[];
  meta: PaginationMeta;
}

export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  triggerRules: number;
  slaRules: number;
  runsLast24h: number;
  failedRunsLast24h: number;
}

/** Short human summary of one action, for table rows. */
export function actionSummary(action: RuleAction): string {
  switch (action.type) {
    case "create_task":
      return `Task: "${action.taskSubject ?? ""}"`;
    case "send_email":
      return `Email → ${action.emailTo === "custom" ? action.emailAddress : action.emailTo}`;
    case "assign_record":
      return "Assign record";
    case "call_webhook":
      return "Webhook";
  }
}
