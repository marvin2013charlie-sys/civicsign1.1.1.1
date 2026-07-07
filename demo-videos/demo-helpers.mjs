/** On-page overlays v3 — chapter cards, blur spotlight, SaaS explainer callouts. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERLAY_PATH = path.join(__dirname, "overlay-init.js");

export const PAUSE = {
  micro: 900,
  short: 1800,
  medium: 3000,
  long: 4200,
  hero: 6000,
  step: 4500,
  highlight: 3400,
  afterClick: 2800,
  afterType: 2400,
  scroll: 1000,
  chapter: 3800,
};

export async function ensureOverlay(page) {
  await page.waitForFunction(() => document.body, null, { timeout: 15000 }).catch(() => {});
  const ready = await page.evaluate(() => typeof window.__csShowStep === "function");
  if (!ready) {
    const code = fs.readFileSync(OVERLAY_PATH, "utf8");
    await page.evaluate((c) => {
      const s = document.createElement("script");
      s.textContent = c;
      document.body.appendChild(s);
    }, code);
  }
}

export async function wait(page, ms) {
  await page.waitForTimeout(ms);
}

/** Full-screen chapter card (SaaS explainer style). */
export async function showChapter(page, phase, headline, subtext = "") {
  await page.evaluate(({ phase, headline, subtext }) => {
    window.__csShowChapter(phase, headline, subtext);
  }, { phase, headline, subtext });
  await wait(page, PAUSE.chapter);
  await page.evaluate(() => window.__csHideChapter());
  await wait(page, PAUSE.short);
}

export async function showStep(page, num, title, subtitle = "", action = "") {
  await page.evaluate(({ num, title, subtitle, action }) => {
    window.__csShowStepAt(num, title, subtitle, null, action, null);
  }, { num, title, subtitle, action });
  await wait(page, PAUSE.step);
}

export async function showStepAt(page, num, title, subtitle, selector, action = "", benefit = "") {
  await page.evaluate(({ num, title, subtitle, selector, action, benefit }) => {
    window.__csShowStepAt(num, title, subtitle, selector, action, benefit);
  }, { num, title, subtitle, selector, action, benefit });
  await wait(page, PAUSE.scroll);
  await wait(page, PAUSE.step);
}

export async function highlight(page, selector) {
  const ok = await page.evaluate((sel) => {
    const r = window.__csHighlight(sel);
    if (r && typeof window.__csRepositionStep === "function") window.__csRepositionStep(sel);
    return r;
  }, selector);
  if (!ok) throw new Error(`Highlight failed: ${selector}`);
  await wait(page, PAUSE.highlight);
}

export async function clickHighlight(page, selector) {
  await highlight(page, selector);
  const loc = page.locator(selector).first();
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      window.__csMoveCursor(r.left + r.width / 2, r.top + r.height / 2, true);
    }
  }, selector);
  await wait(page, 550);
  await loc.click();
  await page.evaluate(() => window.__csClearHighlight());
  await wait(page, PAUSE.afterClick);
}

export async function typeHighlight(page, selector, text, charDelay = 72) {
  await page.evaluate((sel) => {
    window.__csHighlight(sel);
    window.__csRepositionStep(sel);
  }, selector);
  await wait(page, PAUSE.highlight);
  const loc = page.locator(selector).first();
  await loc.click({ force: true });
  await loc.fill("");
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: charDelay });
  }
  await page.evaluate(() => window.__csClearHighlight());
  await wait(page, PAUSE.afterType);
}

export async function stepClick(page, num, title, subtitle, selector, benefit = "") {
  await showStepAt(page, num, title, subtitle, selector, "Click", benefit);
  const loc = page.locator(selector).first();
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      window.__csMoveCursor(r.left + r.width / 2, r.top + r.height / 2, true);
    }
  }, selector);
  await wait(page, 550);
  await loc.click();
  await page.evaluate(() => window.__csClearHighlight());
  await wait(page, PAUSE.afterClick);
}

export async function stepType(page, num, title, subtitle, selector, text, benefit = "") {
  await showStepAt(page, num, title, subtitle, selector, "Type", benefit);
  await typeHighlight(page, selector, text);
}

export function encodeFfmpeg(path) {
  return [
    "-y", "-i", path,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-profile:v", "main", "-level", "4.0",
    "-preset", "medium", "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-vf", "scale=1920:1080:flags=lanczos,eq=brightness=0.05:contrast=1.06:saturation=1.04",
    "-r", "30",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    "-shortest",
  ];
}