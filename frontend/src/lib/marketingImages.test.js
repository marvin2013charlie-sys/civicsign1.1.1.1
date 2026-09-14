import { marketingImageProps } from './marketingImages';
test('responsive photography uses compressed formats and retains CDN tracking', () => {
  const result = marketingImageProps('https://images.unsplash.com/photo-test?fm=jpg&q=90&ixid=abc');
  const url = new URL(result.src);
  expect(url.searchParams.get('w')).toBe('960');
  expect(url.searchParams.get('q')).toBe('72');
  expect(url.searchParams.get('auto')).toBe('format');
  expect(url.searchParams.has('fm')).toBe(false);
  expect(url.searchParams.get('ixid')).toBe('abc');
  expect(result.srcSet).toContain('400w');
  expect(result.srcSet).toContain('1280w');
});
test.each(['/logo512.png', 'https://example.com/photo.jpg', 'https://images.unsplash.com.example.com/photo'])('preserves other sources: %s', src => {
  expect(marketingImageProps(src)).toEqual({ src });
});
