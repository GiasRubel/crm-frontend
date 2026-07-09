export type CustomerStatus = "active" | "inactive" | "prospect";

export interface Customer {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  status: CustomerStatus;
  createdBy: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  status?: CustomerStatus;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

/** Record routing: omitted = unchanged, null = cleared, value = set. */
export interface AssignCustomerDto {
  assignedToId?: string | null;
  assignedTeamId?: string | null;
}

export type CustomerSortField =
  | "createdAt"
  | "updatedAt"
  | "firstName"
  | "lastName"
  | "email"
  | "company"
  | "status";

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus | "";
  sortBy?: CustomerSortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerListResponse {
  data: Customer[];
  meta: PaginationMeta;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  prospect: number;
  newThisMonth: number;
}
