// @ts-check
const { test, expect } = require("@playwright/test");
const { USERS, authFilePath, ensureAuth } = require("./helpers");
const orgAuth = authFilePath("org-owner");

test.describe("Organisation portal", () => {
  test.use({ storageState: orgAuth });

  test("org owner can view overview, team, and contract tabs", async ({ page }) => {
    await ensureAuth(page, USERS.orgOwner, orgAuth);
    await page.goto("/organisation");
    await expect(page.getByTestId("org-portal-header")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("org-portal-overview")).toBeVisible();

    await page.getByTestId("org-portal-tab-team").click();
    await expect(
      page.getByTestId("org-team-tab").or(page.getByTestId("org-portal-team-readonly")),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("org-portal-tab-contract").click();
    await expect(page.getByTestId("org-portal-contract")).toBeVisible({ timeout: 15_000 });
  });
});