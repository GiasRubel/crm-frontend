export type TicketType =
  | "question"
  | "problem"
  | "bug"
  | "feature_request"
  | "billing"
  | "other";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type CommentAuthorRole = "staff" | "customer";

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  question: "Question",
  problem: "Problem",
  bug: "Bug",
  feature_request: "Feature request",
  billing: "Billing",
  other: "Other",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};

export interface TicketComment {
  authorId: string;
  authorRole: CommentAuthorRole;
  authorName: string | null;
  body: string;
  isInternal: boolean;
  postedAt: string;
}

export interface LinkedArticle {
  id: string;
  title: string;
}

export interface Ticket {
  id: string;
  number: string;
  subject: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  customerName: string | null;
  comments: TicketComment[];
  relatedArticles: LinkedArticle[];
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdBy: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  customerId: string;
  type?: TicketType;
  priority?: TicketPriority;
  assignedToId?: string;
  assignedTeamId?: string;
  customFields?: Record<string, unknown>;
}

/** Portal customers raise tickets for themselves. */
export interface CreateMyTicketDto {
  subject: string;
  description: string;
  type?: TicketType;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  type?: TicketType;
  priority?: TicketPriority;
  relatedArticleIds?: string[];
  customFields?: Record<string, unknown>;
}

export interface AddCommentDto {
  body: string;
  isInternal?: boolean;
}

/** Record routing: omitted = unchanged, null = cleared, value = set. */
export interface AssignTicketDto {
  assignedToId?: string | null;
  assignedTeamId?: string | null;
}

export type TicketSortField =
  | "createdAt"
  | "updatedAt"
  | "number"
  | "subject"
  | "status"
  | "priority"
  | "type";

export interface TicketQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus | "";
  openOnly?: "true" | "";
  type?: TicketType | "";
  priority?: TicketPriority | "";
  customerId?: string;
  assignedToId?: string;
  unassigned?: "true" | "";
  sortBy?: TicketSortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: Ticket[];
  meta: PaginationMeta;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  waitingOnCustomer: number;
  unassigned: number;
  urgent: number;
  awaitingFirstResponse: number;
  resolvedThisMonth: number;
  avgFirstResponseHours: number | null;
}
