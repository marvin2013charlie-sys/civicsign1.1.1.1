#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeo } from './load-seo.mjs';
const { getSeoForPath, getPublicSitemapPaths, SITE_URL, DEFAULT_OG_IMAGE } = await loadSeo();
const frontend = fileURLToPath(new URL('../frontend/', import.meta.url));
const build = path.resolve(frontend, process.env.BUILD_PATH || 'build');
const template = fs.readFileSync(path.join(build, 'index.html'), 'utf8');
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paths = [...new Set(getPublicSitemapPaths())];
for (const route of paths) {
  const meta = getSeoForPath(route);
  if (meta.noindex || !meta.title || !meta.description) throw new Error(`Invalid public metadata: ${route}`);
  const url = `${SITE_URL}${route}`;
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escape(meta.title)}</title>`);
  const values = { description: meta.description, robots: 'index, follow', 'og:title': meta.title, 'og:description': meta.description, 'og:url': url, 'og:type': meta.type || 'website', 'og:image': meta.image || DEFAULT_OG_IMAGE, 'twitter:title': meta.title, 'twitter:description': meta.description, 'twitter:image': meta.image || DEFAULT_OG_IMAGE };
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`<meta\\s+(?:name|property)="${key}"[^>]*>`, 'i');
    if (!pattern.test(html)) throw new Error(`Missing template meta tag: ${key}`);
    html = html.replace(pattern, `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}" />`);
  }
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escape(url)}" />`);
  // Escape markup delimiters so article text cannot close the JSON-LD script.
  const payloads = Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : [];
  html = html.replace(/<script[^>]*id="cs-jsonld(?:-[^"]*)?"[^>]*>[\s\S]*?<\/script>/gi, '');
  const schema = payloads.map((payload, index) => `<script type="application/ld+json" id="cs-jsonld-${index}">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`).join('');
  const verification = (process.env.REACT_APP_GOOGLE_SITE_VERIFICATION || '').trim();
  if (verification) {
    html = html.replace(/<meta\s+name="google-site-verification"[^>]*>/gi, '');
    html = html.replace('</head>', `<meta name="google-site-verification" content="${escape(verification)}" /></head>`);
  }
  html = html.replace('</head>', `${schema}</head>`);
  const destination = route === '/' ? path.join(build, 'index.html') : path.join(build, `${route}.html`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, html);
}
// Explicit rewrites keep clean canonical URLs while serving route-specific HTML.
const rewrites = paths.filter(route => route !== '/').map(route => `${route}/ ${route} 301\n${route} ${route}.html 200`).join('\n');
fs.writeFileSync(path.join(build, '_redirects'), `/privacy /legal/privacy 301\n/terms /legal/terms 301\n/cookies /legal/cookies 301\n/refunds /legal/refunds 301\n/robot.txt /robots.txt 301\n${rewrites}\n/* /index.html 200\n`);
console.log(`Generated titles, descriptions, robots and canonicals for ${paths.length} public pages`);
