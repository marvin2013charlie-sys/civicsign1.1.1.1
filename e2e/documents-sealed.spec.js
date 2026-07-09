// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const { USERS, loginUser } = require("./helpers");

const pdfPath = path.join(__dirname, "fixtures", "employment-contract.pdf");

test.describe("Documents & seal verify", () => {
  test("business user can open sealed panel and verify library", async ({ page }) => {
    test.skip(!fs.existsSync(pdfPath), "PDF fixture missing");

    await loginUser(page, USERS.business);
    await page.goto("/documents");
    await page.getByTestId("documents-tab-sealed").click();
    await expect(page.getByTestId("documents-sealed-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("verify-library-card")).toBeVisible();

    // Bulk verify stored copies (may be 0 rows — panel should still load)
    const verifyAll = page.getByTestId("verify-all-btn");
    if (await verifyAll.isEnabled()) {
      await verifyAll.click();
    }
    await expect(page.getByTestId("verify-library-table")).toBeVisible();
  });
});