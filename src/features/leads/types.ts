export type LeadSource =
  | "web_form"
  | "api"
  | "manual"
  | "referral"
  | "event"
  | "other";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "converted";

export type LeadRating = "hot" | "warm" | "cold";

export type EngagementType =
  | "email_opened"
  | "email_replied"
  | "call"
  | "meeting"
  | "website_visit"
  | "form_submitted"
  | "note";

export interface LeadEngagement {
  type: EngagementType;
  points: number;
  note?: string;
  recordedBy?: string;
  recordedByName: string | null;
  occurredAt: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  rating: LeadRating;
  engagements: LeadEngagement[];
  estimatedValue?: number;
  createdBy: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  convertedCustomerId: string | null;
  convertedOpportunityId: string | null;
  convertedAt: string | null;
  convertedBy: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  source?: LeadSource;
  estimatedValue?: number;
  assignedToId?: string;
  assignedTeamId?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateLeadDto = Partial<
  Omit<CreateLeadDto, "assignedToId" | "assignedTeamId">
> & {
  status?: Exclude<LeadStatus, "converted">;
};

/** Record routing: omitted = unchanged, null = cleared, value = set. */
export interface AssignLeadDto {
  assignedToId?: string | null;
  assignedTeamId?: string | null;
}

export interface AddEngagementDto {
  type: EngagementType;
  note?: string;
  points?: number;
}

export interface ConvertLeadDto {
  phone?: string;
  address?: string;
  createOpportunity?: boolean;
  opportunityName?: string;
  amount?: number;
  expectedCloseDate?: string;
  stage?: "discovery" | "proposal" | "negotiation";
}

/** Public web-form payload for POST /leads/capture (no auth required). */
export interface CaptureLeadDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  region?: string;
  source?: "web_form" | "api";
  /** Honeypot — leave empty; bots that fill it are silently dropped. */
  website?: string;
}

export type LeadSortField =
  | "createdAt"
  | "updatedAt"
  | "firstName"
  | "lastName"
  | "email"
  | "company"
  | "status"
  | "score"
  | "estimatedValue";

export interface LeadQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus | "";
  source?: LeadSource | "";
  rating?: LeadRating | "";
  sortBy?: LeadSortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadListResponse {
  data: Lead[];
  meta: PaginationMeta;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  unqualified: number;
  converted: number;
  hot: number;
  newThisMonth: number;
  convertedThisMonth: number;
  conversionRate: number;
  averageScore: number;
}

export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  email_opened: "Email opened",
  email_replied: "Email replied",
  call: "Call",
  meeting: "Meeting",
  website_visit: "Website visit",
  form_submitted: "Form submitted",
  note: "Note",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  web_form: "Web form",
  api: "API",
  manual: "Manual entry",
  referral: "Referral",
  event: "Event",
  other: "Other",
};
