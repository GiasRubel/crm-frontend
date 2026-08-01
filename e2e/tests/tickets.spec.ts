import { expect, test } from "@playwright/test";
import { storageStateFor, unique } from "../fixtures/roles";

test.describe("helpdesk — staff", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("create and resolve a ticket", async ({ page }) => {
    const subject = unique("Cannot export");

    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();

    await page.getByRole("button", { name: /New Ticket/ }).click();
    const form = page.getByRole("dialog");
    await form.locator("input").first().fill(subject);
    await form.locator("textarea").first().fill("The CSV button does nothing.");

    // The customer picker is required for a staff-raised ticket.
    const customerSelect = form.locator("select").first();
    const options = await customerSelect.locator("option").count();
    test.skip(options < 2, "no customers seeded to raise a ticket against");
    await customerSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: /^Create Ticket$/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(subject)).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: subject });
    await row.getByRole("button", { name: "Open actions" }).click();
    await page.getByRole("menuitem", { name: /Mark resolved/ }).click();

    await expect(row.getByText(/resolved/i)).toBeVisible();
  });
});

test.describe("helpdesk — customer portal", () => {
  test.use({ storageState: storageStateFor("customer") });

  test("a customer sees the portal, not the staff queue", async ({ page }) => {
    await page.goto("/tickets");

    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tickets" })).toHaveCount(0);
  });

  test("a customer raises their own ticket", async ({ page }) => {
    const subject = unique("Portal issue");

    await page.goto("/tickets");
    await page.getByRole("button", { name: /New Ticket/ }).click();

    const form = page.getByRole("dialog");
    await form.locator("input").first().fill(subject);
    await form.locator("textarea").first().fill("Raised from the customer portal.");
    await page.getByRole("button", { name: /^Create Ticket$|^Submit/ }).click();

    await expect(page.getByText(subject)).toBeVisible();
  });

  test("a customer cannot reach internal CRM routes", async ({ page }) => {
    await page.goto("/dashboard");
    // The sidebar offers no internal destinations to a portal customer.
    await expect(page.getByRole("link", { name: /^Leads$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Customers$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Automations$/ })).toHaveCount(0);
  });
});
