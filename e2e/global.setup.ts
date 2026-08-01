import fs from "node:fs";
import { expect, test as setup, type Page } from "@playwright/test";
import { AUTH_DIR, CREDENTIALS, storageStateFor, type Role } from "./fixtures/roles";

/**
 * Signs each role in through the real Keycloak login form once and saves the
 * resulting session cookies. Every other spec starts already authenticated, so
 * only `auth.spec.ts` pays the cost of the OIDC redirect dance.
 */
async function signIn(page: Page, role: Role) {
  const { username, password } = CREDENTIALS[role];

  // Hitting a gated route triggers proxy.ts -> /api/auth/login -> Keycloak.
  await page.goto("/dashboard");

  await page.waitForURL(/\/realms\/.*\/protocol\/openid-connect\/auth|\/dashboard/);

  if (!page.url().includes("/dashboard")) {
    await page.getByLabel(/Username or email|Username|Email/i).fill(username);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByRole("button", { name: /Sign In|Log In/i }).click();
  }

  // Back on the app, authenticated, with the chunked session cookie set.
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Dashboard|Welcome/i }).first()).toBeVisible();

  const cookies = await page.context().cookies();
  expect(
    cookies.some((c) => c.name.startsWith("crm_session.")),
    "expected a chunked crm_session cookie after login",
  ).toBe(true);

  await page.context().storageState({ path: storageStateFor(role) });
}

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
});

for (const role of ["admin", "staff", "customer"] as const) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await signIn(page, role);
  });
}
