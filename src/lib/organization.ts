/**
 * Which organisation the unauthenticated pages belong to.
 *
 * Authenticated requests carry the caller's organisation in their token, but the
 * public pages (help center, lead capture form) have no token — so they must
 * name the tenant explicitly, or the backend would have to guess and end up
 * serving every tenant's data to everyone.
 *
 * "default" matches DefaultOrgService.DEFAULT_ORG_SLUG on the backend, which is
 * the only organisation that exists in a standalone (single-tenant) install —
 * so standalone buyers never have to set this. SaaS deployments set
 * NEXT_PUBLIC_ORGANIZATION_SLUG per tenant frontend.
 */
export const ORGANIZATION_SLUG =
  process.env.NEXT_PUBLIC_ORGANIZATION_SLUG || "default";
