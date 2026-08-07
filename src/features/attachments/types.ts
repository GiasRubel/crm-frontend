export type AttachmentEntityType =
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "customer"
  | "ticket";

export interface Attachment {
  id: string;
  entityType: AttachmentEntityType;
  entityId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
}
