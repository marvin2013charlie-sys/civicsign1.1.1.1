#!/usr/bin/env node
/**
 * Regenerate frontend/public/sitemap.xml from the canonical public route list.
 * Run: node scripts/generate-sitemap.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE_URL = (process.env.REACT_APP_SITE_URL || "https://www.civicsign.co.uk").replace(/\/$/, "");

const STATIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/blog",
  "/resources",
  "/careers",
  "/solutions",
  "/solutions/real-estate",
  "/solutions/construction",
  "/solutions/legal",
  "/solutions/financial-services",
  "/solutions/staffing-agency",
  "/solutions/hr",
  "/solutions/healthcare",
  "/solutions/education",
  "/solutions/charities",
  "/solutions/sales",
  "/solutions/freelancers",
  "/pricing",
  "/product/manage-pdf",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/legal/refunds",
];

const BLOG_SLUGS = [
  "are-e-signatures-legal-in-the-uk",
  "hm-land-registry-electronic-signatures-2026",
  "gift-aid-electronic-declarations-hmrc-guide",
  "right-to-work-digital-checks-uk-hr",
  "uk-gdpr-vs-eu-gdpr-saas-platforms",
  "civicsign-launch-15-field-types",
  "employment-contracts-electronic-signatures-uk",
  "ast-agreements-electronic-signing-uk-lettings",
  "ses-aes-qes-which-signature-level-uk",
  "nda-confidentiality-agreements-electronic-signatures-uk",
  "audit-trail-certificate-of-completion-guide",
  "freelancer-consultant-contracts-e-signing-uk",
  "supplier-contracts-purchase-orders-electronic-signatures-uk",
  "settlement-agreements-electronic-signing-uk-hr",
  "electronic-signatures-construction-contracts-uk",
  "electronic-signatures-healthcare-consent-uk",
];

const PRIORITY = {
  "/": "1.0",
  "/blog": "0.9",
  "/solutions": "0.9",
  "/pricing": "0.9",
  "/product/manage-pdf": "0.8",
  "/about": "0.8",
  "/contact": "0.7",
  "/resources": "0.7",
};

function changefreqFor(p) {
  if (p === "/" || p === "/blog" || p === "/careers") return "weekly";
  if (p.startsWith("/blog/")) return "monthly";
  if (p.startsWith("/legal/")) return "yearly";
  return "monthly";
}

function priorityFor(p) {
  if (PRIORITY[p]) return PRIORITY[p];
  if (p.startsWith("/solutions/")) return "0.8";
  if (p.startsWith("/blog/")) return "0.7";
  if (p.startsWith("/legal/")) return "0.4";
  return "0.6";
}

const paths = [...STATIC_PATHS, ...BLOG_SLUGS.map((s) => `/blog/${s}`)];

const urls = paths
  .map((p) => {
    const loc = `${SITE_URL}${p === "/" ? "/" : p}`;
    return `  <url><loc>${loc}</loc><changefreq>${changefreqFor(p)}</changefreq><priority>${priorityFor(p)}</priority></url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const out = path.join(ROOT, "frontend/public/sitemap.xml");
fs.writeFileSync(out, xml, "utf8");
console.log(`Wrote ${paths.length} URLs to ${out}`);