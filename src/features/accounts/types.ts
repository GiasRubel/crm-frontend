export type AccountIndustry =
  | "technology"
  | "finance"
  | "healthcare"
  | "manufacturing"
  | "retail"
  | "education"
  | "government"
  | "nonprofit"
  | "other";

export type AccountSize =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1000+";

export type AccountStatus = "prospect" | "active" | "inactive";

export const ACCOUNT_INDUSTRY_LABELS: Record<AccountIndustry, string> = {
  technology: "Technology",
  finance: "Finance",
  healthcare: "Healthcare",
  manufacturing: "Manufacturing",
  retail: "Retail",
  education: "Education",
  government: "Government",
  nonprofit: "Non-profit",
  other: "Other",
};

export const ACCOUNT_SIZES: AccountSize[] = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

export interface Account {
  id: string;
  name: string;
  industry: AccountIndustry | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  size: AccountSize | null;
  annualRevenue: number | null;
  address: string | null;
  description: string | null;
  status: AccountStatus;
  contactCount: number;
  openDealCount: number;
  createdBy: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  industry?: AccountIndustry;
  website?: string;
  email?: string;
  phone?: string;
  size?: AccountSize;
  annualRevenue?: number;
  address?: string;
  description?: string;
  status?: AccountStatus;
  assignedToId?: string;
  assignedTeamId?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateAccountDto = Partial<
  Omit<CreateAccountDto, "assignedToId" | "assignedTeamId">
>;

/** Record routing: omitted = unchanged, null = cleared, value = set. */
export interface AssignAccountDto {
  assignedToId?: string | null;
  assignedTeamId?: string | null;
}

export type AccountSortField =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "industry"
  | "status"
  | "annualRevenue";

export interface AccountQuery {
  page?: number;
  limit?: number;
  search?: string;
  industry?: AccountIndustry | "";
  size?: AccountSize | "";
  status?: AccountStatus | "";
  sortBy?: AccountSortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AccountListResponse {
  data: Account[];
  meta: PaginationMeta;
}

export interface AccountStats {
  total: number;
  prospect: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

// ── 360° summary ─────────────────────────────────────────────────────────────

export interface AccountContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
  preferredChannel: "email" | "phone" | "sms";
  doNotContact: boolean;
}

export interface AccountDealSummary {
  id: string;
  name: string;
  stage:
    | "discovery"
    | "proposal"
    | "negotiation"
    | "closed_won"
    | "closed_lost";
  amount: number;
  expectedCloseDate: string | null;
  closedAt: string | null;
}

export interface AccountSummary {
  account: Account;
  contacts: AccountContactSummary[];
  opportunities: AccountDealSummary[];
  metrics: {
    contactCount: number;
    openDealCount: number;
    openValue: number;
    wonValue: number;
    lostValue: number;
  };
}
