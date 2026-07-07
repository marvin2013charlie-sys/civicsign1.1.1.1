#!/usr/bin/env node
/**
 * Premium Pro plan demo — bright UI, step callouts follow each click + arrow pointers.
 */
import { chromium } from "playwright";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ensureOverlay, showChapter, showStep, showStepAt, stepClick, stepType,
  wait, PAUSE, encodeFfmpeg,
} from "./demo-helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(__dirname, "output");
const RAW_DIR = path.join(__dirname, "raw");
const DESKTOP_OUT = path.join(process.env.HOME || "", "Desktop", "CivicSign_Pro_Demo.mp4");
const BASE = process.env.CIVICSIGN_URL || "http://localhost:3000";
const EMAIL = "demo@example.com";
const PASS = "DemoPass123!";
const OUT_NAME = "civicsign-demo-pro-premium-v3";

function ensureDirs() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

function setPlan(plan) {
  const py = spawnSync(
    path.join(ROOT, "backend", ".venv", "bin", "python3"),
    [path.join(__dirname, "set-plan.py"), plan],
    { encoding: "utf-8" },
  );
  if (py.status !== 0) throw new Error(py.stderr || py.stdout);
  console.log(py.stdout.trim());
}

function ensureSamplePdf() {
  const pdfPath = path.join(__dirname, "assets", "employment-contract.pdf");
  if (!fs.existsSync(pdfPath)) {
    spawnSync(path.join(ROOT, "backend", ".venv", "bin", "python3"),
      [path.join(__dirname, "make-sample-pdf.py")], { encoding: "utf-8" });
  }
  return pdfPath;
}

async function record() {
  ensureDirs();
  setPlan("pro");
  const pdfPath = ensureSamplePdf();
  const introPath = path.join(__dirname, "intro-pro-premium.html");
  const outroPath = path.join(__dirname, "outro.html");

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=medium"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    recordVideo: { dir: RAW_DIR, size: { width: 1920, height: 1080 } },
    locale: "en-GB",
    colorScheme: "light",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  let envelopeId = null;

  try {
    await page.goto(`file://${introPath}`);
    await ensureOverlay(page);
    await wait(page, PAUSE.hero);

    await page.goto(`${BASE}/login`);
    await ensureOverlay(page);
    await page.waitForSelector('[data-testid="login-card"]');

    await showChapter(page, "Part 1 · Sign in",
      "Here is where you access your Pro workspace",
      "Secure login with quota tracking and envelope management from day one.");

    await showStep(page, 1, "Sign in to CivicSign",
      "Use your work email and password to access your Pro workspace.", "Start");

    await stepType(page, 2, "Enter your work email",
      "Pro accounts use the same secure login as all CivicSign users.",
      '[data-testid="login-email-input"]', EMAIL);

    await stepType(page, 3, "Enter your password",
      "Sessions are encrypted and rate-limited for security.",
      '[data-testid="login-password-input"]', PASS);

    await stepClick(page, 4, "Click Sign in",
      "You'll land on your dashboard with quota and envelope tracking.",
      '[data-testid="login-submit-button"]');

    await page.waitForURL("**/dashboard**");
    await page.waitForSelector('[data-testid="dashboard-quota-card"]');

    await showStepAt(page, 5, "Your Pro dashboard",
      "Pro plan badge, monthly quota, and envelope stats — all in one place.",
      '[data-testid="dashboard-quota-card"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await showChapter(page, "Part 2 · Upload",
      "Here is where you add your contract",
      "Drop a PDF or Word file — Word converts to PDF automatically.");

    await stepClick(page, 6, "Start a new envelope",
      "Upload a contract and send it for signature.",
      '[data-testid="dashboard-new-envelope-button"]',
      "One click from dashboard to upload.");
    await page.waitForURL("**/new**");

    await showStepAt(page, 7, "Upload your document",
      "PDF or Word (.docx) — Word is converted to PDF automatically.",
      '[data-testid="upload-dropzone"]', "", "Drag & drop or browse — up to your plan limit.");
    await wait(page, PAUSE.medium);
    await page.setInputFiles('[data-testid="upload-file-input"]', pdfPath);
    await page.evaluate(() => window.__csClearHighlight());
    await wait(page, PAUSE.long);

    await stepType(page, 8, "Name your envelope",
      "A clear title appears in your audit trail and signing emails.",
      '[data-testid="envelope-title-input"]', "Employment Contract — Alex Morgan");

    await stepClick(page, 9, "Continue to Prepare Studio",
      "Add recipients and place signature fields on the document.",
      '[data-testid="upload-continue-button"]');

    await page.waitForURL("**/prepare/**");
    await page.waitForSelector('[data-testid="prepare-canvas"]');
    await page.waitForSelector(".react-pdf__Page canvas", { timeout: 60000 });

    await showChapter(page, "Part 3 · Prepare",
      "Here is where you place signature fields",
      "Add recipients, choose signing order, and click the document to position fields.");

    await showStepAt(page, 10, "Prepare Studio — document preview",
      "PDF on the right; recipients and fields on the left.",
      '[data-testid="prepare-canvas"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await stepType(page, 11, "Add recipient name",
      "The signer sees this name on the signing page.",
      '[data-testid="recipient-name-input"]', "Alex Morgan");

    await stepType(page, 12, "Add recipient email",
      "Secure tokenised link — no account required for signers.",
      '[data-testid="recipient-email-input"]', "alex.morgan@example.com");

    await stepClick(page, 13, "Confirm recipient",
      "Each recipient gets a colour for field assignment.",
      '[data-testid="recipient-add-button"]');
    await wait(page, PAUSE.medium);

    await stepClick(page, 14, "Choose parallel signing",
      "Everyone can sign at once — or pick sequential order.",
      '[data-testid="order-parallel"]');

    await stepClick(page, 15, "Select Signature field",
      "Pick a field type, then click the document to place it.",
      '[data-testid="field-chip-signature"]');

    await showStepAt(page, 16, "Place signature on the document",
      "Click where the signer should sign — positioned with percentage accuracy.",
      '[data-testid="prepare-canvas"]');
    const canvas = page.locator('[data-testid="prepare-canvas"] .absolute.inset-0').first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas missing");
    const cx = box.x + box.width * 0.28;
    const cy = box.y + box.height * 0.82;
    await wait(page, PAUSE.highlight);
    await page.evaluate(({ x, y }) => window.__csMoveCursor(x, y, true), { x: cx, y: cy });
    await wait(page, 500);
    await page.mouse.click(cx, cy);
    await page.locator('[data-testid="placed-field"]').first().waitFor({ state: "visible" });

    await showStepAt(page, 17, "Signature field placed",
      "Assigned to Alex Morgan and marked as required.",
      '[data-testid="placed-field"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await stepClick(page, 18, "Continue to Review & Send",
      "Final review before dispatch.",
      '[data-testid="prepare-send-button"]');
    await page.waitForURL("**/send/**");

    await showChapter(page, "Part 4 · Send",
      "Here is where you choose UK eIDAS level",
      "Pro supports SES and AES — with reminders and expiration built in.");

    await showStepAt(page, 19, "Review your envelope",
      "Confirm title, pages, and fields before sending.",
      '[data-testid="send-message-input"]');
    await wait(page, PAUSE.medium);
    await page.evaluate(() => window.__csClearHighlight());

    await stepType(page, 20, "Message to recipients",
      "This note appears in the signing invitation email.",
      '[data-testid="send-message-input"]',
      "Hi Alex — please review and sign your employment contract. Thank you!");

    await showStepAt(page, 21, "Automatic reminders — included on Pro",
      "Nudge unsigned recipients on a schedule you control.",
      '[data-testid="auto-remind-panel"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await showStepAt(page, 22, "UK eIDAS signature level",
      "Pro supports Simple (SES) and Advanced (AES) electronic signatures.",
      '[data-testid="signature-level-panel"]');
    await wait(page, PAUSE.long);

    await stepClick(page, 23, "Simple Electronic Signature (SES)",
      "UK eIDAS Art. 3(11) — everyday contracts with full audit trail.",
      '[data-testid="signature-level-select"]');
    await page.getByRole("option", { name: /Simple Electronic Signature/i }).click();
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await stepClick(page, 24, "Advanced Electronic Signature (AES)",
      "UK eIDAS Art. 26 — uniquely linked to signer with tamper detection.",
      '[data-testid="signature-level-select"]');
    await page.getByRole("option", { name: /Advanced Electronic Signature/i }).click();
    await showStepAt(page, 24, "AES selected for this contract",
      "Stronger evidence for employment agreements under UK eIDAS.",
      '[data-testid="signature-level-panel"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await stepClick(page, 25, "Set 7-day expiration",
      "Signing link expires after seven days.",
      '[data-testid="send-expiry-select"]');
    await page.getByRole("option", { name: /Expires in 7 days/i }).click();
    await wait(page, PAUSE.medium);
    await page.evaluate(() => window.__csClearHighlight());

    await stepClick(page, 26, "Send for signature",
      "Recipients receive a secure email link instantly.",
      '[data-testid="send-submit-button"]');
    await page.waitForSelector("text=Your document is on its way");

    await showStepAt(page, 27, "Document sent successfully",
      "Copy signing links or share directly with recipients.",
      '[data-testid="send-copy-link-button"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await showChapter(page, "Part 5 · Track",
      "Here is where you monitor every signature",
      "Full audit trail — every view, consent, and sign event logged.");

    await stepClick(page, 28, "Track your envelope",
      "View status, audit trail, and completed PDF.",
      '[data-testid="goto-tracking-button"]',
      "Tamper-evident evidence on every envelope.");
    await page.waitForURL("**/envelope/**");
    envelopeId = page.url().split("/envelope/")[1]?.split("?")[0];
    await showStepAt(page, 28, "Activity & audit trail",
      "Every view, consent, and signature is logged here.",
      '[data-testid="tab-activity"]');
    await wait(page, PAUSE.long);
    await page.evaluate(() => window.__csClearHighlight());

    await page.goto(`file://${outroPath}`);
    await ensureOverlay(page);
    await wait(page, PAUSE.hero);
  } catch (err) {
    console.error("Recording failed:", err);
    throw err;
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (!video) throw new Error("No video captured");
    const webm = await video.path();
    const finalWebm = path.join(OUT_DIR, `${OUT_NAME}.webm`);
    fs.renameSync(webm, finalWebm);

    const mp4 = path.join(OUT_DIR, `${OUT_NAME}.mp4`);
    const ff = spawnSync("/opt/homebrew/bin/ffmpeg", [...encodeFfmpeg(finalWebm), mp4], { encoding: "utf-8" });
    if (ff.status !== 0) {
      console.error(ff.stderr);
      throw new Error("ffmpeg encode failed");
    }

    fs.copyFileSync(mp4, DESKTOP_OUT);
    fs.copyFileSync(mp4, path.join(process.env.HOME || "", "Desktop", "CivicSign-Pro-Demo.mp4"));
    setPlan("free");

    const stat = fs.statSync(mp4);
    console.log(`\n✓ ${mp4}`);
    console.log(`✓ ${DESKTOP_OUT}`);
    console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
    if (envelopeId) console.log(`  Test envelope: ${envelopeId}`);
    return mp4;
  }
}

record().catch((e) => { console.error(e); process.exit(1); });