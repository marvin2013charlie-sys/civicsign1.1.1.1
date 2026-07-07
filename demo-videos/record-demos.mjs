#!/usr/bin/env node
/**
 * Records CivicSign demo walkthroughs (Free + Pro) at 1920×1080.
 * Usage: node record-demos.mjs [free|pro|all]
 */
import { chromium } from "playwright";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(__dirname, "output");
const RAW_DIR = path.join(__dirname, "raw");
const ASSETS = path.join(__dirname, "assets");
const BASE = process.env.CIVICSIGN_URL || "http://localhost:3000";
const EMAIL = "demo@example.com";
const PASS = "DemoPass123!";

const PAUSE = {
  short: 900,
  medium: 1600,
  long: 2600,
  hero: 3400,
};

function ensureDirs() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(ASSETS, { recursive: true });
}

function setPlan(plan) {
  const py = spawnSync(
    path.join(ROOT, "backend", ".venv", "bin", "python3"),
    [path.join(__dirname, "set-plan.py"), plan],
    { cwd: path.join(ROOT, "backend"), encoding: "utf-8" },
  );
  if (py.status !== 0) {
    console.error(py.stderr || py.stdout);
    throw new Error(`Failed to set plan=${plan}`);
  }
  console.log(py.stdout.trim());
}

function ensureSamplePdf() {
  const pdfPath = path.join(ASSETS, "employment-contract.pdf");
  if (fs.existsSync(pdfPath)) return pdfPath;
  const py = spawnSync(
    path.join(ROOT, "backend", ".venv", "bin", "python3"),
    [path.join(__dirname, "make-sample-pdf.py")],
    { encoding: "utf-8" },
  );
  if (py.status !== 0) throw new Error(py.stderr || py.stdout);
  return pdfPath;
}

async function pause(page, ms) {
  await page.waitForTimeout(ms);
}

async function typeHuman(page, selector, text, delay = 55) {
  await page.click(selector, { force: true });
  await page.fill(selector, "");
  for (const ch of text) {
    await page.keyboard.type(ch, { delay });
  }
}

async function recordFlow({ plan, introFile, outName, pickAes = false }) {
  setPlan(plan);
  const pdfPath = ensureSamplePdf();
  const introPath = path.join(__dirname, introFile);
  const outroPath = path.join(__dirname, "outro.html");

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1920, height: 1080 },
    },
    locale: "en-GB",
    colorScheme: "light",
    reducedMotion: "reduce",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    // Intro title card
    await page.goto(`file://${introPath}`);
    await pause(page, PAUSE.hero);

    // Sign in
    await page.goto(`${BASE}/login`);
    await page.waitForSelector('[data-testid="login-card"]');
    await pause(page, PAUSE.medium);
    await typeHuman(page, '[data-testid="login-email-input"]', EMAIL);
    await pause(page, PAUSE.short);
    await typeHuman(page, '[data-testid="login-password-input"]', PASS);
    await pause(page, PAUSE.short);
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL("**/dashboard**", { timeout: 30000 });
    await page.waitForSelector('[data-testid="dashboard-quota-card"]', { timeout: 20000 });
    await pause(page, PAUSE.long);

    // New envelope
    await page.click('[data-testid="dashboard-new-envelope-button"]');
    await page.waitForURL("**/new**");
    await pause(page, PAUSE.medium);

    const title = plan === "pro"
      ? "Employment Contract — Alex Morgan (Pro AES)"
      : "Employment Contract — Alex Morgan";

    await page.setInputFiles('[data-testid="upload-file-input"]', pdfPath);
    await pause(page, PAUSE.medium);
    await page.fill('[data-testid="envelope-title-input"]', title);
    await pause(page, PAUSE.short);
    await page.click('[data-testid="upload-continue-button"]');
    await page.waitForURL("**/prepare/**", { timeout: 60000 });
    await page.waitForSelector('[data-testid="prepare-canvas"]', { timeout: 60000 });
    // Wait for PDF render
    await page.waitForSelector(".react-pdf__Page canvas", { timeout: 60000 });
    await pause(page, PAUSE.long);

    // Recipient
    await page.fill('[data-testid="recipient-name-input"]', "Alex Morgan");
    await pause(page, PAUSE.short);
    await page.fill('[data-testid="recipient-email-input"]', "alex.morgan@example.com");
    await pause(page, PAUSE.short);
    await page.click('[data-testid="recipient-add-button"]');
    await pause(page, PAUSE.medium);

    // Place signature field
    await page.click('[data-testid="field-chip-signature"]');
    await pause(page, PAUSE.short);
    const canvas = page.locator('[data-testid="prepare-canvas"] .absolute.inset-0').first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    await page.mouse.click(box.x + box.width * 0.28, box.y + box.height * 0.82);
    await pause(page, PAUSE.medium);
    await page.locator('[data-testid="placed-field"]').first().waitFor({ state: "visible", timeout: 15000 });
    await pause(page, PAUSE.long);

    // Send review
    await page.click('[data-testid="prepare-send-button"]');
    await page.waitForURL("**/send/**", { timeout: 30000 });
    await pause(page, PAUSE.medium);

    if (plan === "pro") {
      const panel = page.locator('[data-testid="signature-level-panel"]');
      await panel.waitFor({ state: "visible", timeout: 10000 });
      await pause(page, PAUSE.medium);
      if (pickAes) {
        await page.click('[data-testid="signature-level-select"]');
        await pause(page, PAUSE.short);
        await page.getByRole("option", { name: /Advanced Electronic Signature/i }).click();
        await pause(page, PAUSE.long);
      }
    }

    await page.fill('[data-testid="send-message-input"]',
      plan === "pro"
        ? "Hi Alex — please review and sign. This envelope uses an Advanced Electronic Signature (AES) under UK eIDAS."
        : "Hi Alex — please review and sign your employment contract at your convenience.");
    await pause(page, PAUSE.medium);
    await page.click('[data-testid="send-submit-button"]');
    await page.waitForSelector("text=Your document is on its way", { timeout: 30000 });
    await pause(page, PAUSE.long);

    // Outro
    await page.goto(`file://${outroPath}`);
    await pause(page, PAUSE.hero);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (!video) throw new Error("No video recorded");
    const webmPath = await video.path();
    const finalWebm = path.join(OUT_DIR, `${outName}.webm`);
    fs.renameSync(webmPath, finalWebm);
    console.log(`Saved ${finalWebm}`);

    // Convert to MP4 if ffmpeg available
    const mp4Path = path.join(OUT_DIR, `${outName}.mp4`);
    const ff = spawnSync("ffmpeg", [
      "-y", "-i", finalWebm,
      "-c:v", "libx264", "-preset", "slow", "-crf", "18",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      mp4Path,
    ], { encoding: "utf-8" });
    if (ff.status === 0) {
      console.log(`Saved ${mp4Path}`);
      return mp4Path;
    }
    console.warn("ffmpeg not available — delivering .webm only");
    return finalWebm;
  }
}

async function main() {
  ensureDirs();
  const arg = (process.argv[2] || "all").toLowerCase();
  const targets = arg === "all" ? ["free", "pro"] : [arg];
  const results = [];

  for (const t of targets) {
    if (t === "free") {
      results.push(await recordFlow({
        plan: "free",
        introFile: "intro-free.html",
        outName: "civicsign-demo-free",
      }));
    } else if (t === "pro") {
      results.push(await recordFlow({
        plan: "pro",
        introFile: "intro-pro.html",
        outName: "civicsign-demo-pro",
        pickAes: true,
      }));
    } else {
      throw new Error(`Unknown target: ${t}`);
    }
  }

  setPlan("free");
  console.log("\nDone:");
  results.forEach((p) => console.log(" •", p));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});