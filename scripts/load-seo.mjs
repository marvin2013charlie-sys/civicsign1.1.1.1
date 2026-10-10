// Load shared browser metadata as ESM without changing the React package type.
import { mkdtemp, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const SHARED_LIB_FILES = [
  'seo.js',
  'blogPostData.js',
  'pricing.js',
  'contactEmail.js',
  'ukEsignSoftwareContent.js',
  'ukEsignContextLinks.js',
  'brand.js',
];
async function withSharedLib(load) {
  const directory = await mkdtemp(join(tmpdir(), 'civicsign-seo-'));
  try {
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    for (const name of SHARED_LIB_FILES) {
      await copyFile(new URL(`../frontend/src/lib/${name}`, import.meta.url), join(directory, name));
    }
    return await load(name => import(pathToFileURL(join(directory, name)).href));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
export async function loadSeo() {
  return withSharedLib(load => load('seo.js'));
}
/** Page copy shared with React so pre-rendered HTML matches the client-rendered page. */
export async function loadPageContent() {
  return withSharedLib(async load => ({
    ukEsign: await load('ukEsignSoftwareContent.js'),
    contextLinks: (await load('ukEsignContextLinks.js')).UK_ESIGN_CONTEXT_LINKS,
    brand: await load('brand.js'),
    posts: (await load('blogPostData.js')).POSTS,
  }));
}
