export type ActivityType = "task" | "call" | "email" | "meeting" | "sms" | "note";
export type ActivityStatus = "pending" | "completed" | "cancelled";
export type ActivityPriority = "low" | "normal" | "high";
export type ActivityDirection = "inbound" | "outbound";
export type RelatedType =
  | "lead"
  | "contact"
  | "customer"
  | "account"
  | "opportunity"
  | "ticket";
export type DueFilter = "overdue" | "today" | "week";

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  task: "Task",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  sms: "SMS",
  note: "Note",
};

export const RELATED_TYPE_LABELS: Record<RelatedType, string> = {
  lead: "Lead",
  contact: "Contact",
  customer: "Customer",
  account: "Account",
  opportunity: "Opportunity",
  ticket: "Ticket",
};

/** Communication types (everything except task). */
export const COMMUNICATION_TYPES: ActivityType[] = [
  "call",
  "email",
  "meeting",
  "sms",
  "note",
];

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  direction: ActivityDirection | null;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  remindAt: string | null;
  completedAt: string | null;
  overdue: boolean;
  relatedType: RelatedType | null;
  relatedId: string | null;
  relatedName: string | null;
  createdBy: string;
  createdByName: string | null;
  assignedToId: string;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityDto {
  type: ActivityType;
  subject: string;
  description?: string;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  direction?: ActivityDirection;
  dueAt?: string;
  startAt?: string;
  endAt?: string;
  remindAt?: string;
  relatedType?: RelatedType;
  relatedId?: string;
  /** Omitted → automated assignment (linked record's owner, else creator). */
  assignedToId?: string;
  assignedTeamId?: string;
}

/** Date fields accept null to clear. Type & related link are immutable. */
export interface UpdateActivityDto {
  subject?: string;
  description?: string;
  priority?: ActivityPriority;
  direction?: ActivityDirection;
  dueAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  remindAt?: string | null;
}

export interface SetActivityStatusDto {
  status: ActivityStatus;
}

export interface AssignActivityDto {
  assignedToId?: string;
  assignedTeamId?: string | null;
}

export type ActivitySortField =
  | "createdAt"
  | "updatedAt"
  | "subject"
  | "type"
  | "status"
  | "priority"
  | "dueAt"
  | "startAt";

export interface ActivityQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: ActivityType | "";
  status?: ActivityStatus | "";
  priority?: ActivityPriority | "";
  due?: DueFilter | "";
  assignedToId?: string;
  relatedType?: RelatedType;
  relatedId?: string;
  sortBy?: ActivitySortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityListResponse {
  data: Activity[];
  meta: PaginationMeta;
}

export interface ActivityStats {
  openTasks: number;
  overdue: number;
  dueToday: number;
  remindersDue: number;
  upcomingMeetings: number;
  completedThisMonth: number;
}
