#!/usr/bin/env node
/** Generate CivicSign Launch Roadmap PDF from HTML via Playwright. */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs");
const HTML_PATH = path.join(OUT_DIR, "CivicSign-Launch-Roadmap.html");
const PDF_PATH = path.join(OUT_DIR, "CivicSign-Launch-Roadmap.pdf");
const DESKTOP_PDF = path.join(process.env.HOME, "Desktop", "CivicSign-Launch-Roadmap.pdf");

// Reuse Python for HTML content generation (richer templating)
const py = spawnSync("python3", [path.join(__dirname, "generate_launch_roadmap.py"), "--html-only"], {
  encoding: "utf-8",
  cwd: ROOT,
});
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}

const html = py.stdout;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(HTML_PATH, html, "utf-8");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: PDF_PATH,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

fs.copyFileSync(PDF_PATH, DESKTOP_PDF);
console.log(`HTML: ${HTML_PATH}`);
console.log(`PDF:  ${PDF_PATH}`);
console.log(`PDF:  ${DESKTOP_PDF} (Desktop copy)`);