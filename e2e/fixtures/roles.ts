import path from "node:path";

export type Role = "admin" | "staff" | "customer";

/**
 * Credentials come from the environment so no real secret is committed.
 * Seed these users in Keycloak before running the pack — see e2e/README.md.
 */
export const CREDENTIALS: Record<Role, { username: string; password: string }> = {
  admin: {
    username: process.env.E2E_ADMIN_USER ?? "admin@example.com",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Passw0rd!",
  },
  staff: {
    username: process.env.E2E_STAFF_USER ?? "rep@example.com",
    password: process.env.E2E_STAFF_PASSWORD ?? "Passw0rd!",
  },
  customer: {
    username: process.env.E2E_CUSTOMER_USER ?? "customer@example.com",
    password: process.env.E2E_CUSTOMER_PASSWORD ?? "Passw0rd!",
  },
};

export const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

export const storageStateFor = (role: Role) => path.join(AUTH_DIR, `${role}.json`);

/** Every path gated by src/proxy.ts. */
export const GATED_ROUTES = [
  "/dashboard",
  "/accounts",
  "/activities",
  "/automations",
  "/contacts",
  "/customers",
  "/kb",
  "/leads",
  "/opportunities",
  "/reports",
  "/teams",
  "/tickets",
  "/users",
] as const;

/** A value unique to one run so specs never collide on seeded data. */
export const unique = (prefix: string) =>
  `${prefix}-${process.env.E2E_RUN_ID ?? "local"}-${Math.random().toString(36).slice(2, 8)}`;
