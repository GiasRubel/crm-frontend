export interface TeamMember {
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  regions: string[];
  leaderId?: string | null;
  members: TeamMember[];
  isActive: boolean;
  customerCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  regions?: string[];
  memberIds?: string[];
  leaderId?: string | null;
  isActive?: boolean;
}

export type UpdateTeamDto = Partial<CreateTeamDto>;

export type TeamSortField = "name" | "createdAt" | "updatedAt";

export interface TeamQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | "";
  sortBy?: TeamSortField;
  sortOrder?: "asc" | "desc";
}

export interface TeamPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TeamListResponse {
  data: Team[];
  meta: TeamPaginationMeta;
}

export interface TeamStats {
  total: number;
  active: number;
  inactive: number;
  totalMembers: number;
  assignedCustomers: number;
}
