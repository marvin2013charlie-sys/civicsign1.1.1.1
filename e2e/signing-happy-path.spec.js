// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const {
  USERS,
  authFilePath,
  clearUiBlockers,
  ensureAuth,
  uniqueEmail,
  registerAndVerify,
} = require("./helpers");

const pdfPath = path.join(__dirname, "fixtures", "employment-contract.pdf");
const proAuth = authFilePath("pro");

test.describe("Signing happy path", () => {
  test.use({ storageState: proAuth });

  test("register → upload → prepare → send → sign → complete", async ({ page }) => {
    test.skip(!fs.existsSync(pdfPath), "PDF fixture missing");

    const email = uniqueEmail();
    const password = "E2eTest123!";
    const signerEmail = uniqueEmail();
    const signerName = "E2E Signer";

    const registered = await registerAndVerify(page.request, page, email, password);
    if (!registered) {
      await ensureAuth(page, USERS.pro, proAuth);
    }

    // New envelope (direct navigation — avoids tour/toast intercepting dashboard button)
    await page.goto("/new");
    await expect(page).toHaveURL(/\/new/);
    await page.getByTestId("upload-file-input").setInputFiles(pdfPath);
    await page.getByTestId("upload-continue-button").click();
    await expect(page).toHaveURL(/\/prepare\//, { timeout: 30_000 });

    // Recipient
    await page.getByTestId("recipient-name-input").fill(signerName);
    await page.getByTestId("recipient-email-input").fill(signerEmail);
    await page.getByTestId("recipient-add-button").click();
    await expect(page.getByTestId("recipient-row")).toBeVisible();

    // Place signature field on the PDF overlay (not the scroll container padding)
    await page.locator(".react-pdf__Page__canvas").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.getByTestId("recipient-row").first().click();
    await page.getByTestId("field-chip-signature").click();
    const overlay = page.getByTestId("pdf-page-overlay").first();
    await expect(overlay).toBeVisible({ timeout: 10_000 });
    const box = await overlay.boundingBox();
    if (!box) throw new Error("pdf page overlay not visible");
    await overlay.click({ position: { x: box.width * 0.5, y: box.height * 0.65 } });
    await expect(page.getByTestId("placed-field")).toBeVisible({ timeout: 10_000 });

    // Continue to send
    await page.getByTestId("prepare-send-button").click();
    await expect(page).toHaveURL(/\/send\//, { timeout: 20_000 });
    const sendWait = page.waitForResponse(
      (r) => /\/envelopes\/[^/]+\/send$/.test(new URL(r.url()).pathname) && r.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.getByTestId("send-submit-button").click({ force: true });
    const sendResp = await sendWait;
    expect(sendResp.ok(), `send failed: ${sendResp.status()} ${await sendResp.text()}`).toBeTruthy();

    // Sent screen — reload if React state did not flip (API already persisted)
    const tracking = page.getByTestId("goto-tracking-button");
    if (!(await tracking.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.reload();
    }
    await expect(tracking).toBeVisible({ timeout: 30_000 });
    const signLink = await page.locator("a[href*='/sign/']").first().getAttribute("href");
    expect(signLink).toMatch(/\/sign\//);

    // Signer flow (new page — no auth cookies)
    const signPage = await page.context().newPage();
    await signPage.goto(signLink);
    await signPage.getByTestId("consent-checkbox").click();
    await signPage.getByTestId("consent-continue-button").click();
    await expect(signPage.getByTestId("signer-field").first()).toBeVisible({ timeout: 30_000 });
    await signPage.getByTestId("signer-field").first().click();
    await signPage.getByTestId("signature-tab-type").click();
    await signPage.getByTestId("signature-type-input").fill(signerName);
    await signPage.getByTestId("signature-apply-button").click();
    await signPage.getByTestId("signer-finish-button").click();
    await expect(signPage.getByTestId("signer-download-button")).toBeVisible({ timeout: 45_000 });
    await signPage.close();
  });
});