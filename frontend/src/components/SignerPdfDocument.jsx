import React from "react";
import { Document } from "react-pdf";
import { Loader2 } from "lucide-react";
import { PdfPageLayer } from "@/components/PdfPageLayer";

/**
 * react-pdf document + page renderer for the signer flow, isolated in its own
 * module so react-pdf + pdf.js (~109 KB gzip) are code-split and lazy-loaded.
 * The signer shell (branding, consent, field sidebar) paints before this
 * downloads. All field state stays in SignerFlow; pages are rendered through
 * the `renderPageFields` render-prop.
 */
export default function SignerPdfDocument({
  file,
  options,
  pages,
  pageWidth,
  renderPageFields,
}) {
  return (
    <Document
      file={file}
      options={options}
      loading={<Loader2 className="mt-10 h-8 w-8 animate-spin text-[var(--c-primary)]" />}
      error={<div className="mt-10 text-sm text-red-600">Failed to load document.</div>}
    >
      {pages.map((_, i) => (
        <PdfPageLayer
          key={`page-${i + 1}`}
          pageNumber={i + 1}
          width={pageWidth}
          loading={(
            <div className="flex min-h-[480px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" />
            </div>
          )}
        >
          {renderPageFields(i)}
        </PdfPageLayer>
      ))}
    </Document>
  );
}
