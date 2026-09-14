#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadSeo } from "./load-seo.mjs";
const { getPublicSitemapPaths, SITE_URL } = await loadSeo();
const escapeXml = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paths = [...new Set(getPublicSitemapPaths())];
const urls = paths.map(path => `  <url><loc>${escapeXml(SITE_URL + path)}</loc></url>`).join("\n");
fs.writeFileSync(fileURLToPath(new URL("../frontend/public/sitemap.xml", import.meta.url)), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
console.log(`Wrote ${paths.length} canonical public URLs`);
