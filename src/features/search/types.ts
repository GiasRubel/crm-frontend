export type SearchResultType =
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "customer"
  | "ticket"
  | "kb_article";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
}
