/** Resize only our known image CDN; preserve uploads and other providers. */
export function marketingImageProps(src, sizes = '(max-width: 768px) 100vw, 50vw') {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' || url.hostname !== 'images.unsplash.com') return { src };
    const resized = width => {
      const image = new URL(url);
      image.searchParams.delete('fm');
      image.searchParams.set('auto', 'format');
      image.searchParams.set('w', String(width));
      image.searchParams.set('q', '72');
      image.searchParams.set('fit', 'max');
      return image.href;
    };
    return { src: resized(960), srcSet: [400, 640, 960, 1280].map(width => `${resized(width)} ${width}w`).join(', '), sizes };
  } catch {
    return { src };
  }
}
