import { expect, test } from "@playwright/test";
import { CREDENTIALS, GATED_ROUTES, storageStateFor } from "../fixtures/roles";

test.describe("authentication", () => {
  test.describe("anonymous", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("a gated route redirects to Keycloak with a returnTo", async ({ page }) => {
      await page.goto("/leads");

      await page.waitForURL(/protocol\/openid-connect\/auth/);
      expect(page.url()).toContain("redirect_uri");
      expect(page.url()).toContain("code_challenge");
    });

    test("logging in lands on the dashboard", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForURL(/protocol\/openid-connect\/auth/);

      await page.getByLabel(/Username or email|Username|Email/i).fill(CREDENTIALS.admin.username);
      await page.getByLabel(/^Password$/i).fill(CREDENTIALS.admin.password);
      await page.getByRole("button", { name: /Sign In|Log In/i }).click();

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("the public capture form and help centre need no session", async ({ page }) => {
      await page.goto("/capture");
      await expect(page.getByRole("heading", { name: /Contact Sales/i })).toBeVisible();

      await page.goto("/faq");
      await expect(page.getByRole("heading", { name: /How can we help/i })).toBeVisible();
    });
  });

  test.describe("authenticated admin", () => {
    test.use({ storageState: storageStateFor("admin") });

    test("every gated route loads without redirecting", async ({ page }) => {
      for (const route of GATED_ROUTES) {
        await page.goto(route);
        await expect(page, `expected ${route} to stay put`).toHaveURL(new RegExp(`${route}$`));
      }
    });

    test("logout clears the session and re-gates the app", async ({ page }) => {
      await page.goto("/dashboard");

      await page.getByRole("button", { name: /Logout/i }).click();

      // Keycloak's RP-initiated logout redirects back to APP_BASE_URL. With a
      // valid id_token_hint there is no "Do you want to log out?" interstitial.
      await page.waitForURL((url) => !url.pathname.startsWith("/dashboard"), { timeout: 30_000 });
      await expect(page.getByRole("button", { name: /Do you want to log out/i })).toHaveCount(0);

      const cookies = await page.context().cookies();
      expect(cookies.some((c) => c.name.startsWith("crm_session."))).toBe(false);

      // A direct hit is gated again.
      await page.goto("/dashboard");
      await page.waitForURL(/protocol\/openid-connect\/auth/);
    });
  });
});
