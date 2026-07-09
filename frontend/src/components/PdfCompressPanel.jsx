import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Minimize2, Save, Upload } from "lucide-react";
import api, { formatApiError, parseBlobApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const PRESETS = [
  { id: "medium", label: "Medium", note: "65% JPEG quality · 72 PPI — best for email" },
  { id: "good", label: "Good", note: "80% quality · 144 PPI — balanced" },
  { id: "best", label: "Best", note: "95% quality · 288 PPI — highest quality" },
];

function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfCompressPanel({ onBack, busy, setBusy, quotaHandlers }) {
  const [fileInfo, setFileInfo] = useState(null);
  const [preset, setPreset] = useState("medium");
  const [grayscale, setGrayscale] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setLastResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/pdf/workspace", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileInfo({
        workspace_id: data.workspace_id,
        filename: data.filename,
        page_count: data.page_count,
        original_bytes: file.size,
      });
      toast.success(`${data.page_count} page${data.page_count === 1 ? "" : "s"} loaded`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const runCompress = async (mode) => {
    if (!fileInfo) return;
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${fileInfo.workspace_id}/compress`,
        { preset, grayscale },
        { responseType: "blob" },
      );
      const original = Number(res.headers["x-original-bytes"] || fileInfo.original_bytes);
      const compressed = Number(res.headers["x-compressed-bytes"] || res.data.size);
      const savings = Number(res.headers["x-savings-percent"] || 0);
      const base = (fileInfo.filename || "document").replace(/\.pdf$/i, "");
      const filename = `${base}-compressed.pdf`;
      if (mode === "download") {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setLastResult({ original, compressed, savings });
        toast.success(`Compressed — saved ${savings}%`);
      } else {
        await savePdfBlobToDocuments({
          blob: res.data,
          filename,
          title: `${base} (Compressed)`,
          tool: "compress",
          originalFilename: fileInfo.filename,
          quotaHandlers,
        });
        setLastResult({ original, compressed, savings });
        toast.success("Saved to Documents → From Manage PDF");
      }
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
    setLastResult(null);
    setPreset("medium");
    setGrayscale(false);
  };

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
          <Minimize2 className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Compress PDF</h2>
          <p className="text-xs text-[var(--c-muted-fg)]">
            {fileInfo
              ? `${fileInfo.filename} · ${fileInfo.page_count} page${fileInfo.page_count === 1 ? "" : "s"} · ${formatBytes(fileInfo.original_bytes)}`
              : "Reduce file size by optimising images"}
          </p>
        </div>
      </div>

      {!fileInfo ? (
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
          <Upload className="h-9 w-9 text-[var(--c-primary)]" />
          <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose PDF or DOCX</span>
          <span className="mt-1 text-xs text-[var(--c-muted-fg)]">Up to 20 MB</span>
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            data-testid="compress-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              document.getElementById("compress-upload-input")?.click();
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload document
          </Button>
          <input
            id="compress-upload-input"
            type="file"
            accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            data-testid="compress-upload-input"
            onChange={onUpload}
          />
        </label>
      ) : (
        <>
          <div className="mt-5 space-y-3">
            <Label>Image quality</Label>
            <div className="grid gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`compress-preset-${p.id}`}
                  onClick={() => setPreset(p.id)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    preset === p.id
                      ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)]"
                      : "border-[var(--c-border)] hover:border-[var(--c-primary)]/40"
                  }`}
                >
                  <span className="text-sm font-medium text-[var(--c-ink)]">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--c-muted-fg)]">{p.note}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--c-ink)]">
            <input
              type="checkbox"
              checked={grayscale}
              onChange={(e) => setGrayscale(e.target.checked)}
              data-testid="compress-grayscale"
              className="h-4 w-4 rounded border-[var(--c-border)]"
            />
            Convert images to grayscale (smaller files)
          </label>

          {lastResult && (
            <div
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              data-testid="compress-result"
            >
              {formatBytes(lastResult.original)} → {formatBytes(lastResult.compressed)}
              {lastResult.savings > 0 ? ` (${lastResult.savings}% smaller)` : " (already optimised)"}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" disabled={busy} onClick={reset} data-testid="compress-change-file">
              Change file
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => runCompress("download")}
              data-testid="compress-download-btn"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => runCompress("save")}
              data-testid="compress-save-documents-btn"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save to Documents
            </Button>
          </div>
        </>
      )}
    </div>
  );
}