export type CustomFieldEntityType =
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "customer"
  | "ticket";

export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "multiselect"
  | "url"
  | "email";

export const CUSTOM_FIELD_ENTITY_TYPES: CustomFieldEntityType[] = [
  "lead",
  "contact",
  "account",
  "opportunity",
  "customer",
  "ticket",
];

export const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "boolean",
  "select",
  "multiselect",
  "url",
  "email",
];

export const ENTITY_TYPE_LABELS: Record<CustomFieldEntityType, string> = {
  lead: "Leads",
  contact: "Contacts",
  account: "Accounts",
  opportunity: "Opportunities",
  customer: "Customers",
  ticket: "Tickets",
};

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  boolean: "Yes/No",
  select: "Dropdown (single)",
  multiselect: "Dropdown (multiple)",
  url: "URL",
  email: "Email",
};

export const CHOICE_FIELD_TYPES: CustomFieldType[] = ["select", "multiselect"];

export interface CustomFieldDefinition {
  id: string;
  entityType: CustomFieldEntityType;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
  isActive: boolean;
  order: number;
  helpText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldDefinitionDto {
  entityType: CustomFieldEntityType;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
  isActive?: boolean;
  order?: number;
  helpText?: string;
}

export type UpdateCustomFieldDefinitionDto = Partial<
  Omit<CreateCustomFieldDefinitionDto, "entityType" | "key">
>;

/** Values stored on an entity's `customFields` map, keyed by definition.key. */
export type CustomFieldValues = Record<string, unknown>;
