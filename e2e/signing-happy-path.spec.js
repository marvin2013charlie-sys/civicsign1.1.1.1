// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const pdfPath = path.join(__dirname, "fixtures", "employment-contract.pdf");
const backendUrl = process.env.E2E_BACKEND_URL || "http://localhost:8001";

const FALLBACK_USER = {
  email: process.env.E2E_USER_EMAIL || "pro@civicbot.co.uk",
  password: process.env.E2E_USER_PASSWORD || "CivicSign2026!Pro",
};

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@civicbot.co.uk`;
}

/** Remove product tour overlays and toasts that intercept Playwright clicks. */
async function clearUiBlockers(page) {
  try {
    const me = await page.request.get(`${backendUrl}/api/auth/me`);
    if (me.ok()) {
      const user = await me.json();
      if (user?.user_id) {
        await page.evaluate((userId) => {
          localStorage.setItem(`cs_product_tour_v1_${userId}_app`, "1");
          localStorage.setItem(`cs_product_tour_autooffered_v1_${userId}_app`, "1");
          localStorage.removeItem(`cs_tour_pending_user_v1_${userId}_app`);
          sessionStorage.removeItem("cs_tour_pending_app");
          sessionStorage.removeItem(`cs_tour_autostart_${userId}_app`);
        }, user.user_id);
      }
    }
  } catch {
    /* auth cookie may not be ready yet */
  }
  await page.evaluate(() => {
    document.querySelectorAll(".driver-overlay, .driver-popover").forEach((el) => el.remove());
    document.body.classList.remove("driver-active");
  });
  const toastDismiss = page.locator("[data-sonner-toast] button");
  const n = await toastDismiss.count();
  for (let i = 0; i < n; i += 1) {
    await toastDismiss.nth(i).click({ timeout: 500 }).catch(() => {});
  }
}

async function loginExisting(page, email, password) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

async function registerAndVerify(page, email, password) {
  const reg = await page.request.post(`${backendUrl}/api/auth/register`, {
    data: { name: "E2E User", email, password },
  });

  if (reg.status() === 429) {
    return false;
  }
  expect(reg.ok(), `register failed: ${reg.status()} ${await reg.text()}`).toBeTruthy();
  const body = await reg.json();
  expect(body.dev_code, "DEV_MODE must expose verification code").toBeTruthy();

  // Seed sessionStorage before navigation — VerifyEmail redirects to /register when email is missing.
  await page.goto("/login");
  await page.evaluate(
    ({ em, code }) => {
      sessionStorage.setItem("cs_verify_email", em);
      sessionStorage.setItem("cs_verify_dev_code", code);
      sessionStorage.setItem("cs_verify_dev_mode", "1");
    },
    { em: email, code: body.dev_code },
  );
  await page.goto("/verify-email");

  await expect(page.getByTestId("verify-dev-code")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("verify-code-input").fill(body.dev_code);
  await page.getByTestId("verify-submit-button").click();
  await expect(page).toHaveURL(/\/(dashboard|login)/, { timeout: 30_000 });

  if (page.url().includes("/login")) {
    await loginExisting(page, email, password);
  }
  await clearUiBlockers(page);
  return true;
}

test.describe("Signing happy path", () => {
  test("register → upload → prepare → send → sign → complete", async ({ page }) => {
    test.skip(!fs.existsSync(pdfPath), "PDF fixture missing");

    const email = uniqueEmail();
    const password = "E2eTest123!";
    const signerEmail = uniqueEmail();
    const signerName = "E2E Signer";

    const registered = await registerAndVerify(page, email, password);
    if (!registered) {
      await loginExisting(page, FALLBACK_USER.email, FALLBACK_USER.password);
    }
    await clearUiBlockers(page);

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
    await clearUiBlockers(page);
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