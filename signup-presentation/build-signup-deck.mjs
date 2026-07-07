#!/usr/bin/env node
import pptxgen from "pptxgenjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(__dirname, "assets", "screenshots");
const OUT_DIR = path.join(__dirname, "output");
const DESKTOP = path.join(process.env.HOME || "", "Desktop", "CivicSign-How-To-Sign-Up.pptx");

const C = {
  teal: "14B8A6",
  tealDark: "0D9488",
  ink: "0F1720",
  paper: "F8FAFC",
  muted: "64748B",
  white: "FFFFFF",
};

function img(name) {
  const p = path.join(IMG, name);
  if (!fs.existsSync(p)) throw new Error(`Missing screenshot: ${p}`);
  return p;
}

function addTitleSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: C.ink };
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 4.8, w: 10, h: 0.85,
    fill: { color: C.teal },
  });
  slide.addText("CivicSign", {
    x: 0.7, y: 0.55, w: 8, h: 0.5,
    fontFace: "Calibri", fontSize: 18, bold: true, color: C.teal, margin: 0,
  });
  slide.addText("How to sign up", {
    x: 0.7, y: 1.15, w: 8.5, h: 1.2,
    fontFace: "Calibri", fontSize: 44, bold: true, color: C.white, margin: 0,
  });
  slide.addText("Create your free account in minutes — UK e-signatures with audit trail included.", {
    x: 0.7, y: 2.45, w: 7.5, h: 0.9,
    fontFace: "Calibri", fontSize: 18, color: "CBD5E1", margin: 0,
  });
  slide.addText("1920×1080 screenshots  ·  United Kingdom  ·  No credit card required", {
    x: 0.7, y: 5.05, w: 8, h: 0.35,
    fontFace: "Calibri", fontSize: 11, color: C.white, margin: 0,
  });
}

function addOverviewSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: C.paper };
  slide.addText("Sign-up journey", {
    x: 0.6, y: 0.45, w: 8, h: 0.7,
    fontFace: "Calibri", fontSize: 32, bold: true, color: C.ink, margin: 0,
  });
  const steps = [
    "Visit civicsign.com",
    "Click Start free",
    "Enter name, work email & password",
    "Create your free account",
    "Verify your email (one-time code)",
    "Land on your dashboard — ready to send",
  ];
  steps.forEach((text, i) => {
    const y = 1.35 + i * 0.62;
    slide.addShape(pres.shapes.OVAL, {
      x: 0.65, y: y + 0.05, w: 0.38, h: 0.38,
      fill: { color: C.teal },
    });
    slide.addText(String(i + 1), {
      x: 0.65, y: y + 0.02, w: 0.38, h: 0.42,
      fontFace: "Calibri", fontSize: 14, bold: true, color: C.white, align: "center", margin: 0,
    });
    slide.addText(text, {
      x: 1.2, y, w: 7.5, h: 0.5,
      fontFace: "Calibri", fontSize: 16, color: C.ink, margin: 0,
    });
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.2, y: 1.2, w: 3.2, h: 3.9,
    fill: { color: C.white },
    line: { color: "E2E8F0", width: 1 },
    shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.12 },
  });
  slide.addText("Free plan includes", {
    x: 6.45, y: 1.4, w: 2.8, h: 0.35,
    fontFace: "Calibri", fontSize: 13, bold: true, color: C.tealDark, margin: 0,
  });
  slide.addText([
    { text: "5 documents per billing period", options: { bullet: true, breakLine: true } },
    { text: "Unlimited signers", options: { bullet: true, breakLine: true } },
    { text: "Tamper-evident audit trail", options: { bullet: true, breakLine: true } },
    { text: "PDF & Word support", options: { bullet: true } },
  ], {
    x: 6.4, y: 1.85, w: 2.9, h: 2.5,
    fontFace: "Calibri", fontSize: 12, color: C.ink,
  });
}

function addStepSlide(pres, { step, title, body, image, tips = [] }) {
  const slide = pres.addSlide();
  slide.background = { color: C.paper };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.teal },
  });

  slide.addText(`Step ${step}`, {
    x: 0.55, y: 0.4, w: 2, h: 0.35,
    fontFace: "Calibri", fontSize: 12, bold: true, color: C.tealDark, margin: 0,
  });
  slide.addText(title, {
    x: 0.55, y: 0.75, w: 4.1, h: 0.9,
    fontFace: "Calibri", fontSize: 26, bold: true, color: C.ink, margin: 0,
  });
  slide.addText(body, {
    x: 0.55, y: 1.65, w: 4.0, h: 1.6,
    fontFace: "Calibri", fontSize: 14, color: C.muted, margin: 0,
  });

  if (tips.length) {
    slide.addText(
      tips.map((t, i) => ({
        text: t,
        options: { bullet: true, breakLine: i < tips.length - 1 },
      })),
      { x: 0.55, y: 3.35, w: 3.9, h: 1.8, fontFace: "Calibri", fontSize: 12, color: C.ink },
    );
  }

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 4.85, y: 0.45, w: 4.9, h: 4.75,
    fill: { color: C.white },
    line: { color: "E2E8F0", width: 1 },
    shadow: { type: "outer", color: "000000", blur: 10, offset: 2, angle: 135, opacity: 0.14 },
  });
  slide.addImage({
    path: img(image),
    x: 4.92, y: 0.52, w: 4.76, h: 4.61,
    sizing: { type: "contain", w: 4.76, h: 4.61 },
  });
}

function addClosingSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: C.tealDark };
  slide.addText("You're ready to send", {
    x: 0.7, y: 1.6, w: 8.5, h: 0.9,
    fontFace: "Calibri", fontSize: 40, bold: true, color: C.white, margin: 0,
  });
  slide.addText("Start free at civicsign.com — no credit card required.", {
    x: 0.7, y: 2.65, w: 7, h: 0.5,
    fontFace: "Calibri", fontSize: 20, color: "E6FAF8", margin: 0,
  });
  slide.addText([
    { text: "Dashboard → New Envelope → Upload → Prepare → Send", options: { bullet: false } },
  ], {
    x: 0.7, y: 3.35, w: 8, h: 0.5,
    fontFace: "Calibri", fontSize: 14, italic: true, color: C.white, margin: 0,
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "CivicSign";
  pres.title = "How to Sign Up for CivicSign";
  pres.subject = "Sign-up walkthrough";

  addTitleSlide(pres);
  addOverviewSlide(pres);
  addStepSlide(pres, {
    step: 1,
    title: "Open the CivicSign website",
    body: "Go to civicsign.com (or your team's CivicSign URL). The homepage shows pricing, features and how UK eIDAS signatures work.",
    image: "01-landing-home.png",
    tips: ["Bookmark the site for your team", "Works on desktop and mobile browsers"],
  });
  addStepSlide(pres, {
    step: 2,
    title: "Click Start free",
    body: "Use Start free in the header or hero section. You'll land on the registration page — no payment details needed for the Free plan.",
    image: "01-landing-home.png",
    tips: ["Already have an account? Use Sign in instead"],
  });
  addStepSlide(pres, {
    step: 3,
    title: "Open the registration form",
    body: "The Create your account screen asks for your full name, work email and a strong password. Review what's included on the Free plan before you continue.",
    image: "02-register-empty.png",
    tips: ["Free plan · No card required", "5 documents per billing period on Free"],
  });
  addStepSlide(pres, {
    step: 4,
    title: "Enter your details",
    body: "Fill in your name and work email. Create a password with at least 8 characters, one capital letter, one number and one special character — the strength meter guides you.",
    image: "03-register-filled.png",
    tips: ["Use a work email your team recognises", "Don't reuse passwords from other sites"],
  });
  addStepSlide(pres, {
    step: 5,
    title: "Verify your email",
    body: "CivicSign sends a one-time 6-digit code to your inbox. Enter it on the verification screen to activate your account. This step keeps your account secure.",
    image: "04-verify-email.png",
    tips: ["Check spam if the code doesn't arrive", "Use Resend code if needed"],
  });
  addStepSlide(pres, {
    step: 6,
    title: "Welcome to your dashboard",
    body: "After verification you're taken to your dashboard. From here you can start a new envelope, track documents and see your monthly quota.",
    image: "05-dashboard-welcome.png",
    tips: ["Click New Envelope to send your first document", "Upgrade to Pro anytime from Settings"],
  });
  addClosingSlide(pres);

  const outPath = path.join(OUT_DIR, "CivicSign-How-To-Sign-Up.pptx");
  await pres.writeFile({ fileName: outPath });
  fs.copyFileSync(outPath, DESKTOP);
  console.log(`✓ ${outPath}`);
  console.log(`✓ ${DESKTOP}`);
}

main().catch((e) => { console.error(e); process.exit(1); });