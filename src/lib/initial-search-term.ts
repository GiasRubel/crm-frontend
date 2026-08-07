/**
 * Reads `?q=` for a lazy useState initializer, so list pages open pre-filtered
 * when reached via the global search bar without ever calling setState in an effect.
 */
export function initialSearchTermFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}
