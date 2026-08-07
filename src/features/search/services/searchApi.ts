import { apiClient } from "@/lib/api-client";
import { SearchResult } from "../types";

export const searchApi = {
  search: (q: string) => apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
};
