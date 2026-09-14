// Load shared browser metadata as ESM without changing the React package type.
import { mkdtemp, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function loadSeo() {
  const directory = await mkdtemp(join(tmpdir(), 'civicsign-seo-'));
  try {
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    for (const name of ['seo.js', 'blogPostData.js', 'pricing.js', 'contactEmail.js']) {
      await copyFile(new URL(`../frontend/src/lib/${name}`, import.meta.url), join(directory, name));
    }
    return await import(pathToFileURL(join(directory, 'seo.js')).href);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
