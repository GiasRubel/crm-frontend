/** Maps a record type to the list page it lives on. Search results and notifications both deep-link through this. */
const ENTITY_ROUTES: Record<string, string> = {
  lead: "/leads",
  contact: "/contacts",
  account: "/accounts",
  opportunity: "/opportunities",
  customer: "/customers",
  ticket: "/tickets",
  kb_article: "/kb",
};

/** Builds a link to a record's list page, pre-filled with a search term so the record surfaces at the top. */
export function entityRoute(entityType: string, searchTerm?: string): string {
  const base = ENTITY_ROUTES[entityType] ?? "/dashboard";
  return searchTerm ? `${base}?q=${encodeURIComponent(searchTerm)}` : base;
}
