import { expect, test } from "@playwright/test";
import { GATED_ROUTES, storageStateFor } from "../fixtures/roles";

test.use({ storageState: storageStateFor("admin") });

/** Ignorable browser noise that says nothing about the app's health. */
const IGNORED = [/favicon/i, /Download the React DevTools/i, /ResizeObserver loop/i];

test.describe("smoke — every authenticated route", () => {
  for (const route of GATED_ROUTES) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !IGNORED.some((re) => re.test(msg.text()))) {
          errors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(route);
      expect(response?.status(), `${route} should not error`).toBeLessThan(400);

      // The shell (sidebar + header) is present on every (crm) page.
      await expect(page.getByRole("link", { name: /CRM Pro/ })).toBeVisible();
      await expect(page.getByPlaceholder("Search everything...")).toBeVisible();

      // Give client queries a beat to settle before judging the console.
      await page.waitForLoadState("networkidle");
      expect(errors, `console errors on ${route}`).toEqual([]);
    });
  }
});

test.describe("smoke — public routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of ["/", "/capture", "/faq"]) {
    test(`${route} renders anonymously`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState("networkidle");

      expect(errors, `page errors on ${route}`).toEqual([]);
    });
  }
});
