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

const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
assert.ok(notFound.includes('noindex'), '404.html must be noindex');
assert.ok(notFound.includes('Page not found'), '404.html must include page-not-found copy');

const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
assert.ok(!redirects.split(/\r?\n/).some((line) => line.trim() === '/* /index.html 200'), 'SPA catch-all soft-404 must be removed');
assert.ok(redirects.includes('/* /404.html 404'), 'Catch-all must point at 404.html');
assert.ok(redirects.includes('/uk-e-signature-software'), 'Money page rewrite missing');
assert.ok(redirects.includes('/docusign-alternative'), 'Money page rewrite missing');
assert.ok(redirects.includes('/legalesign-alternative'), 'Money page rewrite missing');
assert.ok(redirects.includes('/signable-alternative'), 'Money page rewrite missing');
assert.ok(redirects.includes('/esign-alternative'), 'Money page rewrite missing');
assert.ok(redirects.includes('/mysign-alternative'), 'Money page rewrite missing');
assert.ok(redirects.includes('/adobe-sign-alternative'), 'Money page rewrite missing');
assert.ok(redirects.includes('/eidas-compliant-esignature'), 'Money page rewrite missing');
assert.ok(redirects.includes('/electronic-signatures-uk'), 'Money page rewrite missing');
assert.ok(redirects.includes('/e-signature-for-solicitors-uk'), 'Money page rewrite missing');
assert.ok(redirects.includes('/e-signature-for-estate-agents-uk'), 'Money page rewrite missing');
assert.ok(redirects.includes('/e-signature-for-accountants-uk'), 'Money page rewrite missing');
assert.ok(redirects.includes('/e-signature-software /uk-e-signature-software 301'), 'Duplicate money URL redirect missing');
assert.ok(redirects.includes('/dashboard /index.html 200'), 'SPA dashboard fallback missing');
assert.ok(redirects.includes('/sign/* /index.html 200'), 'SPA sign fallback missing');

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/UK e-signature software/i.test(home), 'Homepage HTML must target primary keyword');

console.log(`Verified descriptions and parseable JSON-LD on ${descriptions.size} built pages (+ soft-404 redirects)`);
