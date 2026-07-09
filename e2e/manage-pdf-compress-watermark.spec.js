// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const backendUrl = process.env.E2E_BACKEND_URL || "http://127.0.0.1:8001";
const pdfPath = path.join(__dirname, "fixtures", "employment-contract.pdf");

const PRO_USER = {
  email: process.env.E2E_USER_EMAIL || "pro@civicbot.co.uk",
  password: process.env.E2E_USER_PASSWORD || "CivicSign2026!Pro",
};

async function clearUiBlockers(page) {
  try {
    const me = await page.request.get(`${backendUrl}/api/auth/me`);
    if (me.ok()) {
      const user = await me.json();
      if (user?.user_id) {
        await page.evaluate((userId) => {
          localStorage.setItem(`cs_product_tour_v1_${userId}_app`, "1");
          localStorage.setItem(`cs_product_tour_autooffered_v1_${userId}_app`, "1");
        }, user.user_id);
      }
    }
  } catch {
    /* ignore */
  }
  await page.evaluate(() => {
    document.querySelectorAll(".driver-overlay, .driver-popover").forEach((el) => el.remove());
    document.body.classList.remove("driver-active");
  });
}

async function loginPro(page) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(PRO_USER.email);
  await page.getByTestId("login-password-input").fill(PRO_USER.password);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await clearUiBlockers(page);
}

test.describe("Manage PDF — Compress & Watermark", () => {
  test.beforeEach(async ({ page }) => {
    await loginPro(page);
    await page.goto("/manage-pdf");
    await clearUiBlockers(page);
    await expect(page.getByTestId("manage-pdf")).toBeVisible({ timeout: 15_000 });
  });

  test("home shows compress and watermark cards", async ({ page }) => {
    await expect(page.getByTestId("pdf-mode-compress")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-watermark")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-edit")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-merge")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-split")).toBeVisible();
  });

  test("compress PDF end-to-end download", async ({ page }) => {
    await page.getByTestId("pdf-mode-compress").click();
    await expect(page.getByTestId("compress-upload-btn")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      (async () => {
        await page.getByTestId("compress-upload-input").setInputFiles(pdfPath);
        await expect(page.getByTestId("compress-preset-medium")).toBeVisible({ timeout: 20_000 });
        await page.getByTestId("compress-preset-good").click();
        await page.getByTestId("compress-download-btn").click();
      })(),
    ]);

    const outPath = await download.path();
    expect(outPath).toBeTruthy();
    const buf = fs.readFileSync(outPath);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    expect(download.suggestedFilename()).toMatch(/-compressed\.pdf$/i);
  });

  test("watermark PDF text end-to-end download", async ({ page }) => {
    await page.getByTestId("pdf-mode-watermark").click();
    await expect(page.getByTestId("watermark-upload-btn")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      (async () => {
        await page.getByTestId("watermark-upload-input").setInputFiles(pdfPath);
        await expect(page.getByTestId("watermark-text-input")).toBeVisible({ timeout: 20_000 });
        await page.getByTestId("watermark-text-input").fill("DRAFT");
        await page.getByTestId("watermark-opacity-slider").fill("50");
        await page.getByTestId("watermark-download-btn").click();
      })(),
    ]);

    const outPath = await download.path();
    expect(outPath).toBeTruthy();
    const buf = fs.readFileSync(outPath);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    expect(download.suggestedFilename()).toMatch(/-watermarked\.pdf$/i);
  });

  test("watermark image end-to-end download", async ({ page }) => {
    const logoPath = path.join(__dirname, "fixtures", "watermark-logo.png");
    if (!fs.existsSync(logoPath)) {
      // minimal 1x1 png
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      );
      fs.writeFileSync(logoPath, png);
    }

    await page.getByTestId("pdf-mode-watermark").click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      (async () => {
        await page.getByTestId("watermark-upload-input").setInputFiles(pdfPath);
        await expect(page.getByTestId("watermark-kind-image")).toBeVisible({ timeout: 20_000 });
        await page.getByTestId("watermark-kind-image").click();
        await page.getByTestId("watermark-image-input").setInputFiles(logoPath);
        await page.getByTestId("watermark-download-btn").click();
      })(),
    ]);

    const buf = fs.readFileSync(await download.path());
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
  });
});