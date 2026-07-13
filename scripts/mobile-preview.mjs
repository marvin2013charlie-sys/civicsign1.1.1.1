#!/usr/bin/env node
/**
 * Capture mobile viewport screenshots and build a local preview gallery.
 * Usage: node scripts/mobile-preview.mjs
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "mobile-preview");
const BASE = process.env.E2E_FRONTEND_URL || "http://127.0.0.1:3000";

const PAGES = [
  { name: "Home", path: "/" },
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
  { name: "Pricing", path: "/pricing" },
  { name: "Manage PDF", path: "/product/manage-pdf" },
  { name: "Privacy", path: "/legal/privacy" },
  { name: "Terms", path: "/legal/terms" },
  { name: "Cookies", path: "/legal/cookies" },
  { name: "Refunds", path: "/legal/refunds" },
  { name: "Contact", path: "/contact" },
];

const iphone = devices["iPhone 14 Pro"];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...iphone,
    locale: "en-GB",
  });
  const page = await context.newPage();

  const captures = [];

  for (const item of PAGES) {
    const slug = item.path.replace(/\//g, "_").replace(/^_/, "") || "home";
    const file = `${slug}.png`;
    const outPath = path.join(OUT, file);
    process.stdout.write(`→ ${item.name} … `);
    try {
      await page.goto(`${BASE}${item.path}`, { waitUntil: "networkidle", timeout: 45_000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: outPath, fullPage: true });
      captures.push({ ...item, file, slug });
      console.log("ok");
    } catch (err) {
      console.log(`skip (${err.message?.slice(0, 60)})`);
    }
  }

  await browser.close();

  const lanIp = process.env.MOBILE_LAN_IP || "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CivicSign — Mobile preview</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #f4f3ee; color: #122120; }
    header { padding: 1.25rem 1.5rem; background: #122120; color: #f8f7f2; }
    header h1 { margin: 0 0 .35rem; font-size: 1.25rem; }
    header p { margin: 0; font-size: .875rem; opacity: .85; line-height: 1.5; }
    header code { background: rgba(255,255,255,.12); padding: .1rem .35rem; border-radius: 4px; }
    .grid { display: grid; gap: 1.5rem; padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
    @media (min-width: 900px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .card { background: #fff; border-radius: 16px; border: 1px solid #e5e3db; overflow: hidden; box-shadow: 0 8px 24px rgba(18,33,32,.06); }
    .card h2 { margin: 0; padding: .85rem 1rem; font-size: .95rem; border-bottom: 1px solid #eee; }
    .frame { display: flex; justify-content: center; padding: 1rem; background: #ebeae4; }
    .phone { width: 393px; max-width: 100%; border: 10px solid #1a1a1a; border-radius: 36px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,.18); }
    .phone img { display: block; width: 100%; height: auto; }
    .path { padding: .5rem 1rem .85rem; font-size: .75rem; color: #6b7280; }
  </style>
</head>
<body>
  <header>
    <h1>CivicSign mobile preview</h1>
    <p>iPhone 14 Pro viewport (393×852). Generated ${new Date().toLocaleString("en-GB")}.</p>
    ${lanIp ? `<p>Test on your phone (same Wi‑Fi): <code>http://${lanIp}:3000</code></p>` : ""}
    <p>Chrome DevTools: open any page → toggle device toolbar (⌘⇧M) → pick iPhone.</p>
  </header>
  <div class="grid">
    ${captures.map((c) => `
    <article class="card">
      <h2>${c.name}</h2>
      <div class="frame"><div class="phone"><img src="${c.file}" alt="${c.name}" loading="lazy" /></div></div>
      <p class="path">${c.path}</p>
    </article>`).join("")}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, "index.html"), html);
  console.log(`\nGallery: ${path.join(OUT, "index.html")}`);
  console.log(`Screenshots: ${OUT}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});