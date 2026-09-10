/** Recover once from an old deployment's missing lazy-loaded page, without a reload loop. */
export async function loadPage(loader, name) {
  try {
    return await loader();
  } catch (error) {
    if (error?.name !== 'ChunkLoadError') throw error;
    const key = `cs-page-reload:${name}`;
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < 60_000) throw error;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      throw error;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_cs_reload', String(Date.now()));
    window.location.replace(url.href);
    return new Promise(() => {});
  }
}
