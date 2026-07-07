// @ts-check
const { test, expect } = require("@playwright/test");
const { uniqueEmail } = require("./helpers");

test.describe("Contact form", () => {
  test("public contact form submits successfully", async ({ page }) => {
    await page.goto("/contact");
    await page.getByTestId("contact-name-input").fill("E2E Contact");
    await page.getByTestId("contact-email-input").fill(uniqueEmail());
    await page.getByTestId("contact-message-input").fill(`E2E smoke message ${Date.now()}`);
    await page.getByTestId("contact-submit-button").click();
    await expect(page.getByTestId("contact-success")).toBeVisible({ timeout: 20_000 });
  });
});