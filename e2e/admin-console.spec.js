// @ts-check
const { test, expect } = require("@playwright/test");
const { USERS, loginAdmin } = require("./helpers");

test.describe("Admin console", () => {
  test("super-admin can open organisations and contact inbox", async ({ page }) => {
    await loginAdmin(page, USERS.admin);
    await page.getByTestId("admin-nav-orgs").click();
    await expect(page).toHaveURL(/\/admin\/organizations/, { timeout: 15_000 });
    await expect(page.getByTestId("admin-organizations")).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("admin-nav-contacts").click();
    await expect(page).toHaveURL(/\/admin\/contacts/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Contact inbox" })).toBeVisible({ timeout: 20_000 });
  });
});