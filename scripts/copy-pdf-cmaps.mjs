#!/usr/bin/env node
/**
 * Copy PDF.js character maps into the build output.
 *
 * They were previously fetched from unpkg.com at runtime, which put an
 * uncontrolled third party in the document viewer's path and forced
 * `connect-src https://unpkg.com` into the CSP. Serving them ourselves
 * removes both.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "frontend", "node_modules", "pdfjs-dist", "cmaps");
const dest = join(root, "frontend", "public", "pdf-cmaps");

if (!existsSync(src)) {
  console.error(`[pdf-cmaps] not found: ${src}\n[pdf-cmaps] run npm install in frontend/ first`);
  process.exit(1);
}

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
const files = await readdir(dest);
console.log(`[pdf-cmaps] copied ${files.length} files -> frontend/public/pdf-cmaps`);
