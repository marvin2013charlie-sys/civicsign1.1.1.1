import "@/lib/polyfills";
import { pdfjs } from "react-pdf";

// Serve the worker locally from /public as a `.js` file (NOT `.mjs`). Some
// deployment fronts (incl. ours behind Cloudflare) serve `.mjs` files with
// `Content-Type: application/octet-stream` and `X-Content-Type-Options: nosniff`,
// which makes Firefox and Safari refuse to execute the worker, breaking the
// document viewer with “Failed to load document”. Using `.js` ensures the
// correct `application/javascript` MIME type from any static host.
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ""}/pdf.worker.min.js`;

export const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
};

export { pdfjs };
