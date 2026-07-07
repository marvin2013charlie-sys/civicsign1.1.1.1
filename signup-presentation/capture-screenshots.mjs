#!/usr/bin/env node
/** Capture 1920×1080 screenshots for CivicSign sign-up presentation. */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "assets", "screenshots");
const BASE = process.env.CIVICSIGN_URL || "http://localhost:3000";

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: "png" });
  const stat = fs.statSync(file);
  console.log(`✓ ${name}.png (${(stat.size / 1024).toFixed(0)} KB)`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: "en-GB",
    colorScheme: "light",
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await shot(page, "01-landing-home");

  await page.goto(`${BASE}/register`);
  await page.waitForSelector('[data-testid="register-card"]');
  await shot(page, "02-register-empty");

  await page.locator('[data-testid="register-name-input"]').fill("Jordan Rivera");
  await page.locator('[data-testid="register-email-input"]').fill("jordan@acme.co.uk");
  await page.locator('[data-testid="register-password-input"]').fill("SecurePass1!");
  await page.waitForTimeout(400);
  await shot(page, "03-register-filled");

  await page.evaluate(() => {
    sessionStorage.setItem("cs_verify_email", "jordan@acme.co.uk");
    sessionStorage.setItem("cs_verify_dev_mode", "1");
  });
  await page.goto(`${BASE}/verify-email`);
  await page.waitForSelector("text=verification code", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, "04-verify-email");

  await page.goto(`${BASE}/login`);
  await page.waitForSelector('[data-testid="login-card"]');
  await page.locator('[data-testid="login-email-input"]').fill("demo@example.com");
  await page.locator('[data-testid="login-password-input"]').fill("DemoPass123!");
  await page.locator('[data-testid="login-submit-button"]').click();
  await page.waitForURL("**/dashboard**", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (page.url().includes("dashboard")) {
    await shot(page, "05-dashboard-welcome");
  }

  await context.close();
  await browser.close();
  console.log(`\nScreenshots saved to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });