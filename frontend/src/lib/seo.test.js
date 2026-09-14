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
