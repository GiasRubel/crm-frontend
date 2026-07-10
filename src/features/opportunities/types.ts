export type OpportunityStage =
  | "discovery"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type OpportunityOpenStage = Exclude<
  OpportunityStage,
  "closed_won" | "closed_lost"
>;

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "discovery",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export interface StageTransition {
  from: OpportunityStage;
  to: OpportunityStage;
  movedBy: string;
  movedByName: string | null;
  movedAt: string;
}

export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  customerName: string | null;
  leadId: string | null;
  accountId: string | null;
  accountName: string | null;
  amount: number;
  stage: OpportunityStage;
  probability: number;
  weightedAmount: number;
  expectedCloseDate: string | null;
  notes?: string;
  closedAt: string | null;
  lostReason: string | null;
  stageHistory: StageTransition[];
  createdBy: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityDto {
  name: string;
  customerId: string;
  amount: number;
  stage?: OpportunityOpenStage;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  leadId?: string;
  accountId?: string;
}

export interface UpdateOpportunityDto {
  name?: string;
  amount?: number;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  /** Account link: omitted = unchanged, null = unlink, id = set. */
  accountId?: string | null;
}

export interface MoveStageDto {
  stage: OpportunityStage;
  /** Required when stage is closed_lost. */
  lostReason?: string;
}

/** Record routing: omitted = unchanged, null = cleared, value = set. */
export interface AssignOpportunityDto {
  assignedToId?: string | null;
  assignedTeamId?: string | null;
}

export type OpportunitySortField =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "amount"
  | "stage"
  | "probability"
  | "expectedCloseDate";

export interface OpportunityQuery {
  page?: number;
  limit?: number;
  search?: string;
  stage?: OpportunityStage | "";
  customerId?: string;
  accountId?: string;
  sortBy?: OpportunitySortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OpportunityListResponse {
  data: Opportunity[];
  meta: PaginationMeta;
}

export interface BoardColumn {
  stage: OpportunityStage;
  count: number;
  totalAmount: number;
  opportunities: Opportunity[];
}

export interface OpportunityBoard {
  columns: BoardColumn[];
}

export interface StageBucket {
  stage: OpportunityStage;
  count: number;
  totalAmount: number;
}

export interface OpportunityStats {
  openCount: number;
  openValue: number;
  weightedValue: number;
  wonThisMonthCount: number;
  wonThisMonthValue: number;
  winRate: number;
  byStage: StageBucket[];
}
