import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadSeo } from './load-seo.mjs';
const { getPublicSitemapPaths, SITE_URL } = await loadSeo();
const root = path.resolve(fileURLToPath(new URL('../frontend/', import.meta.url)), process.env.BUILD_PATH || 'build');
const descriptions = new Set();
for (const route of getPublicSitemapPaths()) {
  const html = fs.readFileSync(path.join(root, route === '/' ? 'index.html' : `${route}.html`), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json" id="cs-jsonld-[^"]+">([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length > 0, `Missing JSON-LD: ${route}`);
  const payloads = blocks.map(match => JSON.parse(match[1]));
  assert.ok(payloads.some(item => item.url === `${SITE_URL}${route}`), `Missing page URL: ${route}`);
  const description = html.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.ok(description && !descriptions.has(description), `Missing/duplicate description: ${route}`);
  descriptions.add(description);
  assert.ok(html.includes('<meta name="robots" content="index, follow" />'));
}
console.log(`Verified descriptions and parseable JSON-LD on ${descriptions.size} built pages`);
