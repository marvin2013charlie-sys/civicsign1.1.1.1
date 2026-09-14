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

// Dedicated 404 page — Cloudflare Pages serves /404.html with HTTP 404 when present
// and the SPA catch-all is removed. Also emit an explicit /* /404.html 404 rule
// (Netlify-compatible; CF Pages may ignore the status code but still benefits from 404.html).
const notFoundHtml = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page not found | CivicSign</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="This page could not be found on CivicSign." />
  <link rel="canonical" href="${SITE_URL}/404" />
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f6f2;color:#122120;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;text-align:center}
    a{color:#0f766e;font-weight:600;text-decoration:none}
    h1{font-size:1.75rem;margin:8px 0 12px}
    p{color:#5b6b69;max-width:28rem;margin:0 auto 20px;line-height:1.5}
  </style>
</head>
<body>
  <main>
    <p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b6b69">404</p>
    <h1>Page not found</h1>
    <p>The link may be broken or the page may have moved. Check the URL or head back home.</p>
    <p><a href="/">Home</a> · <a href="/pricing">Pricing</a> · <a href="/contact">Contact</a></p>
  </main>
</body>
</html>
`;
fs.writeFileSync(path.join(build, '404.html'), notFoundHtml);

// Explicit rewrites keep clean canonical URLs while serving route-specific HTML.
const rewrites = paths.filter(route => route !== '/').map(route => `${route}/ ${route} 301\n${route} ${route}.html 200`).join('\n');

// SPA client routes that must keep working without a matching .html file.
const spaExact = [
  '/dashboard', '/new', '/documents', '/templates', '/contacts', '/manage-pdf',
  '/reports', '/usage', '/organisation', '/settings',
  '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/accept-invite',
  '/admin', '/admin/login',
];
const spaPrefixes = [
  '/dashboard', '/documents', '/templates', '/contacts', '/manage-pdf',
  '/reports', '/usage', '/organisation', '/settings',
  '/prepare', '/send', '/envelope', '/sign', '/form', '/admin',
];
const spaRules = [
  ...spaExact.map(route => `${route} /index.html 200`),
  ...spaPrefixes.map(prefix => `${prefix}/* /index.html 200`),
].join('\n');

const redirects = [
  '/privacy /legal/privacy 301',
  '/terms /legal/terms 301',
  '/cookies /legal/cookies 301',
  '/refunds /legal/refunds 301',
  '/robot.txt /robots.txt 301',
  // Canonical money page for primary keyword (duplicate live URL → preferred path)
  '/e-signature-software /uk-e-signature-software 301',
  rewrites,
  spaRules,
  // Unknown paths: real 404 (prefer dedicated 404.html). CF Pages serves 404.html
  // automatically when present and there is no /* /index.html 200 catch-all.
  '/* /404.html 404',
].filter(Boolean).join('\n') + '\n';

fs.writeFileSync(path.join(build, '_redirects'), redirects);
console.log(`Generated titles, descriptions, robots and canonicals for ${paths.length} public pages (+ 404.html, soft-404 redirects)`);
