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
assert.ok(!/^.* 404$/m.test(redirects), 'Cloudflare does not support 404 rewrites');
assert.ok(!/ \/index\.html 200/m.test(redirects), 'Index rewrites redirect app routes to the homepage');
const appShell = fs.readFileSync(path.join(root, 'app-shell.html'), 'utf8');
assert.ok(appShell.includes('noindex, nofollow'), 'Private app shell must be noindex');
assert.ok(appShell.includes('static/js/'), 'App shell must load the application');
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
assert.ok(redirects.includes('/e-signature-for-hr-uk'), 'Money page rewrite missing');
assert.ok(redirects.includes('/e-signature-software /uk-e-signature-software 301'), 'Duplicate money URL redirect missing');
assert.ok(redirects.includes('/dashboard /app-shell 200'), 'SPA dashboard fallback missing');
assert.ok(redirects.includes('/sign/* /app-shell 200'), 'SPA sign fallback missing');

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/UK e-signature software/i.test(home), 'Homepage HTML must target primary keyword');
assert.ok(home.includes('href="/uk-e-signature-software"'), 'Homepage HTML must link to the primary money page');

// Primary money page: content must be in the served HTML, not only client-rendered.
const money = fs.readFileSync(path.join(root, 'uk-e-signature-software.html'), 'utf8');
assert.ok(/<title>UK e-signature software[^<]*<\/title>/.test(money), 'Money page title must lead with UK e-signature software');
assert.ok(money.includes(`<link rel="canonical" href="${SITE_URL}/uk-e-signature-software" />`), 'Money page canonical missing');
assert.ok(/<h1>UK e-signature software<\/h1>/.test(money), 'Money page pre-rendered H1 missing');
assert.ok(money.includes('id="uk-e-signature-comparison"') && money.includes('<table>'), 'Money page comparison table missing');
assert.ok(/Last updated <time datetime="\d{4}-\d{2}-\d{2}">/.test(money), 'Money page last-updated date missing');
const moneySchema = [...money.matchAll(/<script type="application\/ld\+json" id="cs-jsonld-[^"]+">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const faqPage = moneySchema.find(item => item['@type'] === 'FAQPage');
assert.ok(faqPage && faqPage.mainEntity.length >= 8, 'Money page FAQPage schema missing');
for (const q of faqPage.mainEntity) assert.ok(money.includes(`<h3>${q.name.replace(/&/g, '&amp;')}</h3>`), `FAQ not visible in HTML: ${q.name}`);

// Supporting pages carry a crawlable contextual link to the money page.
for (const route of ['/docusign-alternative', '/legalesign-alternative', '/signable-alternative', '/esign-alternative', '/mysign-alternative',
  '/adobe-sign-alternative', '/eidas-compliant-esignature', '/electronic-signatures-uk', '/e-signature-for-solicitors-uk',
  '/e-signature-for-estate-agents-uk', '/e-signature-for-accountants-uk', '/e-signature-for-hr-uk']) {
  const html = fs.readFileSync(path.join(root, `${route}.html`), 'utf8');
  assert.ok(html.includes('<a href="/uk-e-signature-software">'), `Missing money page link in served HTML: ${route}`);
}

console.log(`Verified descriptions and parseable JSON-LD on ${descriptions.size} built pages (+ soft-404 redirects)`);

for (const route of ['/login', '/register', '/admin', '/admin/login', '/admin/*', '/settings']) {
  assert.ok(redirects.includes(`${route} /app-shell 200`), `Missing app route: ${route}`);
}
