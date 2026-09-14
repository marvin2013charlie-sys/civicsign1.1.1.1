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
    '/electronic-signatures-uk',
  ]));
  expect(paths).not.toContain('/e-signature-software');
  const home = getSeoForPath('/');
  expect(home.title.toLowerCase()).toContain('uk e-signature software');
  expect(getSeoForPath('/uk-e-signature-software').title.toLowerCase()).toContain('uk e-signature software');
  expect(getSeoForPath('/docusign-alternative').title.toLowerCase()).toContain('docusign');
  expect(getSeoForPath('/electronic-signatures-uk').title.toLowerCase()).toContain('electronic signatures');
});
