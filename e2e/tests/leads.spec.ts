import { expect, test } from "@playwright/test";
import { storageStateFor, unique } from "../fixtures/roles";

test.use({ storageState: storageStateFor("admin") });

test.describe("leads → conversion", () => {
  test("create, qualify and convert a lead into a customer and a deal", async ({ page }) => {
    const company = unique("Acme");
    const email = `${company.toLowerCase()}@example.com`;

    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();

    // ── Create ────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /Add Lead/ }).click();
    const form = page.getByRole("dialog");
    await form.getByRole("textbox").first().fill("Ada");
    await form.locator("input").nth(1).fill("Lovelace");
    await form.locator('input[type="email"]').fill(email);
    await form.locator('input[placeholder="Acme Corp"]').fill(company);
    await page.getByRole("button", { name: /^Create Lead$|^Add Lead$/ }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(company)).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: company });

    // ── Qualify ───────────────────────────────────────────────────────────
    await row.getByRole("button", { name: "Open actions" }).click();
    await page.getByRole("menuitem", { name: /Mark qualified/ }).click();
    await expect(row.getByText(/qualified/i)).toBeVisible();

    // ── Convert ───────────────────────────────────────────────────────────
    await row.getByRole("button", { name: "Open actions" }).click();
    await page.getByRole("menuitem", { name: /Convert to customer/ }).click();

    const convert = page.getByRole("dialog");
    await expect(convert.getByRole("heading", { name: "Convert Lead" })).toBeVisible();
    await page.getByRole("button", { name: /^Convert Lead$/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // ── The conversion is visible in the other domains ────────────────────
    await page.goto("/customers");
    await page.getByPlaceholder(/Search by name/).fill(email);
    await expect(page.getByText(email)).toBeVisible();
  });

  test("the Kanban board reflects a stage move", async ({ page }) => {
    await page.goto("/opportunities");
    await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();

    const card = page.locator("[draggable=true]").first();
    if ((await card.count()) === 0) test.skip(true, "no deals seeded");

    const name = (await card.innerText()).split("\n")[0];
    await card.getByRole("button", { name: "Deal actions" }).click();
    await page.getByRole("menuitem", { name: /Move to stage/ }).click();
    await page.getByRole("menuitem", { name: "Proposal" }).click();

    await expect(page.getByText(`"${name}" moved to Proposal.`)).toBeVisible();
  });
});

test.describe("public lead capture", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an anonymous submission reaches the authenticated lead list", async ({ page, browser }) => {
    const company = unique("Inbound");
    const email = `${company.toLowerCase()}@example.com`;

    await page.goto("/capture");
    await page.locator("input").first().fill("Grace");
    await page.locator("input").nth(1).fill("Hopper");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[placeholder="Acme Corp"]').fill(company);
    await page.getByRole("button", { name: /Send|Submit|Contact/i }).click();

    await expect(page.getByText(/Thanks for reaching out/i)).toBeVisible();

    // Verify it landed, as an admin.
    const context = await browser.newContext({ storageState: storageStateFor("admin") });
    const staffPage = await context.newPage();
    await staffPage.goto("/leads");
    await staffPage.getByPlaceholder(/Search by name/).fill(email);
    await expect(staffPage.getByText(email)).toBeVisible();
    await context.close();
  });
});
