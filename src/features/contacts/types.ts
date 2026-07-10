export type InteractionType = "call" | "email" | "meeting" | "sms" | "note";
export type InteractionDirection = "inbound" | "outbound";
export type PreferredChannel = "email" | "phone" | "sms";

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  sms: "SMS",
  note: "Note",
};

export const PREFERRED_CHANNEL_LABELS: Record<PreferredChannel, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
};

export interface ContactInteraction {
  type: InteractionType;
  direction: InteractionDirection | null;
  subject: string | null;
  note: string | null;
  recordedBy: string;
  recordedByName: string | null;
  occurredAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  birthday: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  accountId: string | null;
  accountName: string | null;
  isPrimary: boolean;
  customerId: string | null;
  preferredChannel: PreferredChannel;
  emailOptIn: boolean;
  phoneOptIn: boolean;
  smsOptIn: boolean;
  doNotContact: boolean;
  interactions: ContactInteraction[];
  notes: string | null;
  createdBy: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  birthday?: string;
  address?: string;
  city?: string;
  country?: string;
  language?: string;
  accountId?: string;
  isPrimary?: boolean;
  customerId?: string;
  preferredChannel?: PreferredChannel;
  emailOptIn?: boolean;
  phoneOptIn?: boolean;
  smsOptIn?: boolean;
  doNotContact?: boolean;
  notes?: string;
  assignedToId?: string;
  assignedTeamId?: string;
}

/** accountId/customerId accept null to unlink. */
export type UpdateContactDto = Partial<
  Omit<CreateContactDto, "assignedToId" | "assignedTeamId" | "accountId" | "customerId">
> & {
  accountId?: string | null;
  customerId?: string | null;
};

/** Record routing: omitted = unchanged, null = cleared, value = set. */
export interface AssignContactDto {
  assignedToId?: string | null;
  assignedTeamId?: string | null;
}

export interface AddInteractionDto {
  type: InteractionType;
  direction?: InteractionDirection;
  subject?: string;
  note?: string;
}

export type ContactSortField =
  | "createdAt"
  | "updatedAt"
  | "firstName"
  | "lastName"
  | "email"
  | "jobTitle"
  | "city"
  | "country";

export interface ContactQuery {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  preferredChannel?: PreferredChannel | "";
  doNotContact?: "true" | "false" | "";
  sortBy?: ContactSortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactListResponse {
  data: Contact[];
  meta: PaginationMeta;
}

export interface ContactStats {
  total: number;
  withAccount: number;
  doNotContact: number;
  newThisMonth: number;
  interactionsThisMonth: number;
}
