import { getSeoForPath, getPublicSitemapPaths, applyPageSeo } from './seo';
test.each(getPublicSitemapPaths())('%s has indexable, page-specific metadata', path => {
  const meta = getSeoForPath(path);
  expect(meta.noindex).toBe(false);
  expect(meta.path).toBe(path);
  expect(meta.title).toBeTruthy();
  expect(meta.description).toBeTruthy();
  expect(getSeoForPath(`${path}/?campaign=test`)).toEqual(meta);
});
test('canonical omits query strings and trailing slash variants', () => {
  applyPageSeo(getSeoForPath('/pricing/?campaign=test'));
  expect(document.head.querySelector('link[rel="canonical"]').href).toBe('https://www.civicsign.co.uk/pricing');
  expect(document.head.querySelector('meta[name="robots"]').content).toBe('index, follow');
});
test('private and unknown pages remain excluded', () => {
  for (const path of ['/dashboard', '/sign/private-token', '/admin', '/settings', '/missing-page']) {
    expect(getSeoForPath(path).noindex).toBe(true);
    expect(getPublicSitemapPaths()).not.toContain(path);
  }
});
test.each(getPublicSitemapPaths())('%s has structured data and a concise description', path => {
  const meta = getSeoForPath(path);
  expect(meta.description.length).toBeLessThanOrEqual(160);
  expect(meta.jsonLd.length).toBeGreaterThan(0);
  const page = meta.jsonLd.find(item => ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage'].includes(item['@type']));
  expect(page.url).toBe(`https://www.civicsign.co.uk${path}`);
  if (path.startsWith('/blog/')) {
    const article = meta.jsonLd.find(item => item['@type'] === 'BlogPosting');
    expect(article.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(article.mainEntityOfPage).toBe(page.url);
  }
});

test('money pages target commercial keywords and stay in the sitemap', () => {
  const paths = getPublicSitemapPaths();
  expect(paths).toEqual(expect.arrayContaining([
    '/uk-e-signature-software',
    '/docusign-alternative',
    '/legalesign-alternative',
    '/signable-alternative',
    '/esign-alternative',
    '/mysign-alternative',
    '/adobe-sign-alternative',
    '/eidas-compliant-esignature',
    '/electronic-signatures-uk',
    '/e-signature-for-solicitors-uk',
    '/e-signature-for-estate-agents-uk',
    '/e-signature-for-accountants-uk',
    '/e-signature-for-hr-uk',
  ]));
  expect(paths).not.toContain('/e-signature-software');
  const home = getSeoForPath('/');
  expect(home.title.toLowerCase()).toContain('uk e-signature software');
  expect(getSeoForPath('/uk-e-signature-software').title.toLowerCase()).toContain('uk e-signature software');
  expect(getSeoForPath('/docusign-alternative').title.toLowerCase()).toContain('docusign');
  expect(getSeoForPath('/legalesign-alternative').title.toLowerCase()).toContain('legalesign');
  expect(getSeoForPath('/signable-alternative').title.toLowerCase()).toContain('signable');
  expect(getSeoForPath('/esign-alternative').title.toLowerCase()).toContain('esign');
  expect(getSeoForPath('/mysign-alternative').title.toLowerCase()).toContain('mysign');
  expect(getSeoForPath('/adobe-sign-alternative').title.toLowerCase()).toContain('adobe');
  expect(getSeoForPath('/eidas-compliant-esignature').title.toLowerCase()).toContain('eidas');
  expect(getSeoForPath('/electronic-signatures-uk').title.toLowerCase()).toContain('electronic signatures');
  expect(getSeoForPath('/e-signature-for-solicitors-uk').title.toLowerCase()).toContain('solicitors');
  expect(getSeoForPath('/e-signature-for-estate-agents-uk').title.toLowerCase()).toContain('estate agents');
  expect(getSeoForPath('/e-signature-for-accountants-uk').title.toLowerCase()).toContain('accountants');
  expect(getSeoForPath('/e-signature-for-hr-uk').title.toLowerCase()).toContain('hr');
});

test('UK e-signature software page ships FAQ, software offers and a last-modified date', () => {
  const meta = getSeoForPath('/uk-e-signature-software');
  const types = meta.jsonLd.map(item => item['@type']);
  expect(types).toEqual(expect.arrayContaining(['WebPage', 'BreadcrumbList', 'SoftwareApplication', 'FAQPage']));
  const page = meta.jsonLd.find(item => item['@type'] === 'WebPage');
  expect(page.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const faq = meta.jsonLd.find(item => item['@type'] === 'FAQPage');
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(8);
  const software = meta.jsonLd.find(item => item['@type'] === 'SoftwareApplication');
  expect(software.offers.map(offer => offer.priceCurrency)).toEqual(['GBP', 'GBP', 'GBP']);
  expect(software.aggregateRating).toBeUndefined();
  // AES/QES are not implemented (see signatureLevels.js) — the page must not claim them.
  const text = JSON.stringify(meta.jsonLd);
  expect(text).not.toMatch(/AES\) (are|is) available|default on Business|QES\) (are|is) on request/);
});

test('eIDAS page metadata does not claim AES or QES support', () => {
  const meta = getSeoForPath('/eidas-compliant-esignature');
  expect(meta.title).not.toMatch(/AES|QES/);
  expect(meta.description).not.toMatch(/SES\/AES|AES-aligned/);
});

test('homepage title leads with the CivicSign brand and keeps the primary keyword', () => {
  const { title } = getSeoForPath('/');
  expect(title.startsWith('CivicSign')).toBe(true);
  expect(title.toLowerCase()).toContain('uk e-signature software');
  expect(title.length).toBeLessThanOrEqual(60);
});

test('homepage ships one Organization and one WebSite entity with brand alternate names', () => {
  const { jsonLd } = getSeoForPath('/');
  const orgs = jsonLd.filter(item => item['@type'] === 'Organization');
  const sites = jsonLd.filter(item => item['@type'] === 'WebSite');
  expect(orgs).toHaveLength(1);
  expect(sites).toHaveLength(1);
  const [org] = orgs;
  const [site] = sites;
  expect(org.name).toBe('CivicSign');
  expect(org.alternateName).toEqual(['Civic Sign', 'CivicSign UK', 'civicsign.co.uk']);
  expect(org.url).toBe('https://www.civicsign.co.uk/');
  expect(org.logo.url).toMatch(/^https:\/\/www\.civicsign\.co\.uk\/.+\.png$/);
  expect(org.areaServed).toBe('GB');
  expect(org['@id']).toBe('https://www.civicsign.co.uk/#organization');
  expect(org.description).not.toMatch(/\b(AES|QES)\b/);
  // sameAs must only ever list verified absolute profile URLs.
  for (const url of org.sameAs || []) expect(url).toMatch(/^https:\/\//);
  expect(site.name).toBe('CivicSign');
  expect(site.alternateName).toEqual(org.alternateName);
  expect(site.url).toBe('https://www.civicsign.co.uk/');
  expect(site.publisher).toEqual({ '@id': org['@id'] });
  // Organization is defined once site-wide: other pages reference it rather than duplicating it.
  expect(getSeoForPath('/about').jsonLd.filter(item => item['@type'] === 'Organization')).toHaveLength(0);
});
