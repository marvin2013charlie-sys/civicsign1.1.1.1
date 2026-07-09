import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, FileOutput, FileType, Loader2, Save, Upload } from "lucide-react";
import api, { formatApiError, parseBlobApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";

const MODES = {
  "pdf-to-word": {
    title: "PDF to Word",
    icon: FileOutput,
    uploadLabel: "Choose PDF",
    accept: "application/pdf,.pdf",
    hint: "Convert a PDF into an editable Word (.docx) file",
    endpoint: "pdf-to-word",
    outputExt: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    convertLabel: "Convert to Word",
    downloadLabel: "Download DOCX",
    testid: "pdf-to-word",
    canSave: true,
    saveTool: "pdf_to_word",
  },
  "word-to-pdf": {
    title: "Word to PDF",
    icon: FileType,
    uploadLabel: "Choose Word file",
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    hint: "Convert a Word (.docx) document into a PDF",
    endpoint: "word-to-pdf",
    outputExt: "pdf",
    mime: "application/pdf",
    convertLabel: "Convert to PDF",
    downloadLabel: "Download PDF",
    testid: "word-to-pdf",
    canSave: true,
    saveTool: "word_to_pdf",
  },
};

function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfWordConvertPanel({ mode, onBack, busy, setBusy, quotaHandlers }) {
  const cfg = MODES[mode];
  const Icon = cfg.icon;
  const [fileInfo, setFileInfo] = useState(null);
  const [lastBlob, setLastBlob] = useState(null);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setLastBlob(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/pdf/workspace", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileInfo({
        workspace_id: data.workspace_id,
        filename: data.filename,
        original_filename: data.original_filename || file.name,
        page_count: data.page_count,
        original_bytes: file.size,
        needs_password: data.needs_password,
      });
      if (data.needs_password && mode === "pdf-to-word") {
        toast.error("This PDF is password protected — use Unlock PDF first");
      } else {
        toast.success(
          mode === "word-to-pdf"
            ? `${data.page_count} page${data.page_count === 1 ? "" : "s"} ready to convert`
            : `${data.page_count} page${data.page_count === 1 ? "" : "s"} loaded`,
        );
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const runConvert = async () => {
    if (!fileInfo) return;
    if (fileInfo.needs_password && mode === "pdf-to-word") {
      toast.error("Unlock this PDF before converting to Word");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${fileInfo.workspace_id}/${cfg.endpoint}`,
        {},
        { responseType: "blob" },
      );
      const base = (fileInfo.original_filename || fileInfo.filename || "document")
        .replace(/\.(pdf|docx?)$/i, "");
      const filename = `${base}.${cfg.outputExt}`;
      setLastBlob({ blob: res.data, filename, size: res.data.size });
      toast.success("Conversion complete — download your file");
      return { blob: res.data, filename };
    } catch (err) {
      if (!handleQuotaApiError(err, quotaHandlers || {})) {
        toast.error(err.message || await parseBlobApiError(err));
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    let result = lastBlob;
    if (!result) {
      const converted = await runConvert();
      if (!converted) return;
      result = { blob: converted.blob, filename: converted.filename, size: converted.blob.size };
      setLastBlob(result);
    }
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onSave = async () => {
    if (!cfg.canSave || !fileInfo) return;
    setBusy(true);
    try {
      let blob = lastBlob?.blob;
      let filename = lastBlob?.filename;
      if (!blob) {
        const res = await api.post(
          `/pdf/workspace/${fileInfo.workspace_id}/${cfg.endpoint}`,
          {},
          { responseType: "blob" },
        );
        const base = (fileInfo.original_filename || fileInfo.filename || "document")
          .replace(/\.(pdf|docx?)$/i, "");
        filename = `${base}.pdf`;
        blob = res.data;
        setLastBlob({ blob, filename, size: blob.size });
      }
      const base = (fileInfo.original_filename || fileInfo.filename || "document")
        .replace(/\.(pdf|docx?)$/i, "");
      const titleSuffix = cfg.saveTool === "pdf_to_word" ? "Word" : "Converted";
      await savePdfBlobToDocuments({
        blob,
        filename,
        title: `${base} (${titleSuffix})`,
        tool: cfg.saveTool,
        originalFilename: fileInfo.original_filename || fileInfo.filename,
        quotaHandlers,
      });
      toast.success("Saved to Documents → From Manage PDF");
    } catch (err) {
      if (!handleQuotaApiError(err, quotaHandlers || {})) {
        toast.error(err.message || await parseBlobApiError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFileInfo(null);
    setLastBlob(null);
  };

  const meta = fileInfo
    ? mode === "word-to-pdf"
      ? `${fileInfo.original_filename} · ${formatBytes(fileInfo.original_bytes)}`
      : `${fileInfo.filename} · ${fileInfo.page_count} page${fileInfo.page_count === 1 ? "" : "s"} · ${formatBytes(fileInfo.original_bytes)}`
    : cfg.hint;

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8">
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]"
        onClick={() => { reset(); onBack(); }}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: "var(--c-primary)18" }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">{cfg.title}</h2>
          <p className="text-xs text-[var(--c-muted-fg)]">{meta}</p>
        </div>
      </div>

      {!fileInfo ? (
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
          <Upload className="h-9 w-9 text-[var(--c-primary)]" />
          <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">{cfg.uploadLabel}</span>
          <span className="mt-1 text-xs text-[var(--c-muted-fg)]">Up to 20 MB</span>
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            data-testid={`${cfg.testid}-upload-btn`}
            style={{ background: "var(--c-primary)", color: "#fff" }}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              document.getElementById(`${cfg.testid}-upload-input`)?.click();
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload document
          </Button>
          <input
            id={`${cfg.testid}-upload-input`}
            type="file"
            accept={cfg.accept}
            className="hidden"
            data-testid={`${cfg.testid}-upload-input`}
            onChange={onUpload}
          />
        </label>
      ) : (
        <>
          {fileInfo.needs_password && mode === "pdf-to-word" && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This PDF requires a password. Use Unlock PDF first, then try again.
            </p>
          )}

          {lastBlob && (
            <div
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              data-testid={`${cfg.testid}-result`}
            >
              Ready — {formatBytes(lastBlob.size)} {cfg.outputExt.toUpperCase()} file
            </div>
          )}

          <div className={`mt-5 grid gap-3 ${cfg.canSave ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={reset}
              data-testid={`${cfg.testid}-change-file`}
            >
              Change file
            </Button>
            <Button
              type="button"
              disabled={busy || (fileInfo.needs_password && mode === "pdf-to-word")}
              onClick={onDownload}
              data-testid={`${cfg.testid}-download-btn`}
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              {lastBlob ? cfg.downloadLabel : cfg.convertLabel}
            </Button>
            {cfg.canSave && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onSave}
                data-testid={`${cfg.testid}-save-documents-btn`}
              >
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Save to Documents
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}