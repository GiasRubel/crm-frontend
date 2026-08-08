export type PermissionEntityType =
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "customer"
  | "ticket";

export type PermissionAction = "create" | "read" | "update" | "delete";

export type PermissionScope = "all" | "team" | "own";

export const PERMISSION_ENTITY_TYPES: PermissionEntityType[] = [
  "lead",
  "contact",
  "account",
  "opportunity",
  "customer",
  "ticket",
];

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "create",
  "read",
  "update",
  "delete",
];

export const PERMISSION_SCOPES: PermissionScope[] = ["all", "team", "own"];

export const ENTITY_TYPE_LABELS: Record<PermissionEntityType, string> = {
  lead: "Leads",
  contact: "Contacts",
  account: "Accounts",
  opportunity: "Opportunities",
  customer: "Customers",
  ticket: "Tickets",
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
};

export const SCOPE_LABELS: Record<PermissionScope, string> = {
  all: "All records (org-wide)",
  team: "Own + team records",
  own: "Own records only",
};

export interface EntityPermission {
  entityType: PermissionEntityType;
  actions: PermissionAction[];
  scope: PermissionScope;
}

export interface FieldRestriction {
  entityType: PermissionEntityType;
  fieldKey: string;
  hidden: boolean;
  readonly: boolean;
}

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: EntityPermission[];
  fieldRestrictions: FieldRestriction[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomRoleDto {
  name: string;
  description?: string;
  permissions?: EntityPermission[];
  fieldRestrictions?: FieldRestriction[];
}

export type UpdateCustomRoleDto = Partial<CreateCustomRoleDto>;

/** The signed-in user's effective CRUD/scope matrix, keyed by entity type. */
export type PermissionMatrix = Record<
  PermissionEntityType,
  { actions: PermissionAction[]; scope: PermissionScope }
>;
