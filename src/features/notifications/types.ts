export type NotificationEntityType =
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "customer"
  | "ticket";

export type NotificationType = "assignment" | "comment";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType: NotificationEntityType;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}
