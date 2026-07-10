export type KbStatus = "draft" | "published" | "archived";
export type KbVisibility = "internal" | "public";

export interface KbArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string | null;
  tags: string[];
  status: KbStatus;
  visibility: KbVisibility;
  authorId: string;
  authorName: string | null;
  updatedById: string | null;
  updatedByName: string | null;
  publishedAt: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

/** What anonymous FAQ visitors receive. */
export interface PublicKbArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string | null;
  tags: string[];
  publishedAt: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
}

export interface CreateKbArticleDto {
  title: string;
  body: string;
  category?: string;
  tags?: string[];
  status?: KbStatus;
  visibility?: KbVisibility;
}

export type UpdateKbArticleDto = Partial<CreateKbArticleDto>;

export type KbSortField =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "category"
  | "status"
  | "views";

export interface KbQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: KbStatus | "";
  visibility?: KbVisibility | "";
  sortBy?: KbSortField;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface KbListResponse {
  data: KbArticle[];
  meta: PaginationMeta;
}

export interface KbStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  publicArticles: number;
  totalViews: number;
}
