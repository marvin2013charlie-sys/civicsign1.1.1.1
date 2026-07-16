// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { backendUrl, USERS, authFilePath, clearUiBlockers, authHeaders, ensureAuth } = require("./helpers");

const pdfPath = path.join(__dirname, "fixtures", "employment-contract.pdf");
const proAuth = authFilePath("pro");
const TEST_PASSWORD = "E2eProtect9";

async function makeProtectedPdf(page) {
  const headers = await authHeaders(page);
  const upload = await page.request.post(`${backendUrl}/api/pdf/workspace`, {
    headers,
    multipart: {
      file: {
        name: "source.pdf",
        mimeType: "application/pdf",
        buffer: fs.readFileSync(pdfPath),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const { workspace_id: wsId } = await upload.json();
  const protect = await page.request.post(`${backendUrl}/api/pdf/workspace/${wsId}/protect`, {
    headers,
    data: {
      user_password: TEST_PASSWORD,
      owner_password: null,
      allow_print: true,
      allow_copy: false,
      allow_modify: false,
    },
  });
  expect(protect.ok()).toBeTruthy();
  const outPath = path.join(os.tmpdir(), `civicsign-protected-${Date.now()}.pdf`);
  fs.writeFileSync(outPath, await protect.body());
  return outPath;
}

test.describe("Manage PDF — Protect & Unlock", () => {
  test.use({ storageState: proAuth });

  test.beforeEach(async ({ page }) => {
    await ensureAuth(page, USERS.pro, proAuth);
    await page.goto("/manage-pdf");
    await clearUiBlockers(page);
    await expect(page.getByTestId("manage-pdf")).toBeVisible({ timeout: 15_000 });
  });

  test("home shows all seven PDF tools including protect and unlock", async ({ page }) => {
    await expect(page.getByTestId("pdf-mode-edit")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-merge")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-split")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-compress")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-watermark")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-protect")).toBeVisible();
    await expect(page.getByTestId("pdf-mode-unlock")).toBeVisible();
  });

  test("protect PDF end-to-end download", async ({ page }) => {
    await page.getByTestId("pdf-mode-protect").click();
    await expect(page.getByTestId("protect-upload-btn")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      (async () => {
        await page.getByTestId("protect-upload-input").setInputFiles(pdfPath);
        await expect(page.getByTestId("protect-user-password")).toBeVisible({ timeout: 20_000 });
        await page.getByTestId("protect-user-password").fill(TEST_PASSWORD);
        await page.getByTestId("protect-allow-copy").check();
        await page.getByTestId("protect-download-btn").click();
      })(),
    ]);

    const outPath = await download.path();
    expect(outPath).toBeTruthy();
    const buf = fs.readFileSync(outPath);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    expect(download.suggestedFilename()).toMatch(/-protected\.pdf$/i);
  });

  test("unlock PDF end-to-end download", async ({ page }) => {
    const protectedPath = await makeProtectedPdf(page);

    await page.getByTestId("pdf-mode-unlock").click();
    await expect(page.getByTestId("unlock-upload-btn")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      (async () => {
        await page.getByTestId("unlock-upload-input").setInputFiles(protectedPath);
        await expect(page.getByTestId("unlock-password-input")).toBeVisible({ timeout: 20_000 });
        await page.getByTestId("unlock-password-input").fill(TEST_PASSWORD);
        await page.getByTestId("unlock-download-btn").click();
      })(),
    ]);

    const outPath = await download.path();
    expect(outPath).toBeTruthy();
    const buf = fs.readFileSync(outPath);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    expect(download.suggestedFilename()).toMatch(/-unlocked\.pdf$/i);
    fs.unlinkSync(protectedPath);
  });

  test("protect rejects already locked PDF upload", async ({ page }) => {
    const protectedPath = await makeProtectedPdf(page);

    await page.getByTestId("pdf-mode-protect").click();
    await page.getByTestId("protect-upload-input").setInputFiles(protectedPath);
    await expect(page.getByText(/already password protected/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("protect-user-password")).not.toBeVisible();
    fs.unlinkSync(protectedPath);
  });
});