import api, { formatApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";

export const MANAGE_PDF_TOOL_LABELS = {
  edit: "Edited",
  compress: "Compressed",
  watermark: "Watermarked",
  protect: "Protected",
  unlock: "Unlocked",
  merge: "Merged",
  word_to_pdf: "Word to PDF",
  split: "Split",
  pdf_to_word: "PDF to Word",
  ai_metadata: "AI metadata scan",
};

/** Save a processed file blob as a draft envelope (Documents → From Manage PDF). */
export async function saveBlobToDocuments({
  blob,
  filename,
  title,
  tool = "edit",
  originalFilename,
  quotaHandlers,
}) {
  const fd = new FormData();
  fd.append("file", blob, filename || "document.pdf");
  fd.append("title", title || "");
  fd.append("tool", tool);
  fd.append("original_filename", originalFilename || filename || "document.pdf");
  try {
    const { data } = await api.post("/pdf/save-to-documents", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (err) {
    if (quotaHandlers && handleQuotaApiError(err, quotaHandlers)) {
      throw err;
    }
    throw new Error(formatApiError(err));
  }
}

/** @deprecated Use saveBlobToDocuments — kept for existing imports. */
export const savePdfBlobToDocuments = saveBlobToDocuments;

export function isManagePdfEnvelope(envelope) {
  return envelope?.source === "manage_pdf";
}