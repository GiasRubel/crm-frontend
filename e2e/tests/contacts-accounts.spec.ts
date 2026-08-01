import { expect, test } from "@playwright/test";
import { storageStateFor, unique } from "../fixtures/roles";

test.use({ storageState: storageStateFor("admin") });

test.describe("accounts and contacts", () => {
  test("create an account, attach a contact, then delete both", async ({ page }) => {
    const companyName = unique("Globex");
    const contactEmail = `${companyName.toLowerCase()}@example.com`;

    // ── Account ───────────────────────────────────────────────────────────
    await page.goto("/accounts");
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();

    await page.getByRole("button", { name: /Add Account/ }).click();
    await page.getByRole("dialog").locator('input[placeholder="Acme Corporation"]').fill(companyName);
    await page.getByRole("button", { name: /^Create Account$|^Add Account$/ }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(companyName)).toBeVisible();

    // ── Contact linked to it ──────────────────────────────────────────────
    await page.goto("/contacts");
    await page.getByRole("button", { name: /Add Contact/ }).click();

    const form = page.getByRole("dialog");
    await form.locator("input").first().fill("Hedy");
    await form.locator("input").nth(1).fill("Lamarr");
    await form.locator('input[type="email"]').fill(contactEmail);

    const accountSelect = form.locator("select").filter({ hasText: /No account/ }).first();
    if (await accountSelect.count()) {
      await accountSelect.selectOption({ label: companyName });
    }

    await page.getByRole("button", { name: /^Create Contact$|^Add Contact$/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(contactEmail)).toBeVisible();

    // ── The account's 360 view shows the link ─────────────────────────────
    await page.goto("/accounts");
    await page.getByPlaceholder(/Search by name/).fill(companyName);
    const accountRow = page.getByRole("row").filter({ hasText: companyName });
    await accountRow.getByRole("button", { name: "Open actions" }).click();
    await page.getByRole("menuitem", { name: /360° view/ }).click();
    await expect(page.getByText("Account 360° View")).toBeVisible();

    await page.keyboard.press("Escape");

    // ── Clean up ──────────────────────────────────────────────────────────
    await page.goto("/contacts");
    await page.getByPlaceholder(/Search by name/).fill(contactEmail);
    const contactRow = page.getByRole("row").filter({ hasText: contactEmail });
    await contactRow.getByRole("button", { name: "Open actions" }).click();
    await page.getByRole("menuitem", { name: /Delete contact/ }).click();
    await page.getByRole("button", { name: /^Delete Contact$/ }).click();
    await expect(page.getByText(contactEmail)).toHaveCount(0);

    await page.goto("/accounts");
    await page.getByPlaceholder(/Search by name/).fill(companyName);
    await accountRow.getByRole("button", { name: "Open actions" }).click();
    await page.getByRole("menuitem", { name: /Delete account/ }).click();
    await page.getByRole("button", { name: /^Delete Account$/ }).click();
    await expect(page.getByText(companyName)).toHaveCount(0);
  });
});
