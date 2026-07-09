import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Save, ScanSearch, Upload } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";

const ACCEPT = "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const VERDICT_STYLES = {
  likely_ai: {
    label: "Likely AI / high risk",
    badge: "bg-red-100 text-red-900 border-red-200",
    ring: "border-red-200 bg-red-50",
  },
  possible_ai: {
    label: "Possible AI / moderate risk",
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    ring: "border-amber-200 bg-amber-50",
  },
  no_signals: {
    label: "No signals detected",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
    ring: "border-emerald-200 bg-emerald-50",
  },
  inconclusive: {
    label: "Inconclusive",
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    ring: "border-slate-200 bg-slate-50",
  },
};

const SEVERITY_STYLES = {
  high: "text-red-700 bg-red-50 border-red-100",
  medium: "text-amber-800 bg-amber-50 border-amber-100",
  low: "text-slate-700 bg-slate-50 border-slate-100",
};

const CATEGORY_LABELS = {
  metadata: "Metadata",
  binary: "Binary scan",
  content: "Body text",
  structure: "Structure",
  tamper: "Tamper / revision",
};

function MetadataBlock({ title, data }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(data || {}).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border border-[var(--c-border)]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-[var(--c-ink)]"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <dl className="border-t border-[var(--c-border)] px-3 py-2 text-xs">
          {entries.map(([k, v]) => (
            <div key={k} className="grid gap-0.5 py-1.5 sm:grid-cols-[140px_1fr]">
              <dt className="font-medium text-[var(--c-muted-fg)]">{k}</dt>
              <dd className="break-words text-[var(--c-ink)]">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function PdfAiMetadataPanel({ onBack, busy, setBusy, quotaHandlers }) {
  const [fileInfo, setFileInfo] = useState(null);
  const [report, setReport] = useState(null);

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileInfo({ file, name: file.name, size: file.size });
    setReport(null);
    toast.success("File loaded — run scan when ready");
  };

  const runScan = async () => {
    if (!fileInfo?.file) return;
    setBusy(true);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append("file", fileInfo.file);
      const { data } = await api.post("/pdf/ai-metadata-check", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setReport(data);
      toast.success("Integrity scan complete");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onSaveReport = async () => {
    if (!report || !fileInfo) return;
    setBusy(true);
    try {
      const res = await api.post(
        "/pdf/ai-metadata-check/report-pdf",
        { report },
        { responseType: "blob" },
      );
      const base = (fileInfo.name || "document").replace(/\.[^.]+$/, "");
      const filename = `${base}-ai-scan-report.pdf`;
      await savePdfBlobToDocuments({
        blob: res.data,
        filename,
        title: `${base} (AI scan report)`,
        tool: "ai_metadata",
        originalFilename: fileInfo.name,
        quotaHandlers,
      });
      toast.success("Report saved to Documents → From Manage PDF");
    } catch (err) {
      if (!handleQuotaApiError(err, quotaHandlers || {})) {
        toast.error(err.message || formatApiError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFileInfo(null);
    setReport(null);
  };

  const verdictStyle = VERDICT_STYLES[report?.verdict] || VERDICT_STYLES.inconclusive;
  const meta = report?.metadata || {};
  const wide = Boolean(report);

  return (
    <div className={`mx-auto rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8 ${wide ? "max-w-2xl" : "max-w-xl"}`}>
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
          <ScanSearch className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">AI metadata check</h2>
          <p className="text-xs text-[var(--c-muted-fg)]">
            {fileInfo
              ? `${fileInfo.name} · ${formatBytes(fileInfo.size)}`
              : "Fraud-focused scan: metadata, binary strings, structure, and body text"}
          </p>
        </div>
      </div>

      {!fileInfo ? (
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
          <Upload className="h-9 w-9 text-[var(--c-primary)]" />
          <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose PDF, DOCX, or image</span>
          <span className="mt-1 text-xs text-[var(--c-muted-fg)]">PNG, JPEG, WebP · up to 20 MB</span>
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            data-testid="ai-metadata-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              document.getElementById("ai-metadata-upload-input")?.click();
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload document
          </Button>
          <input
            id="ai-metadata-upload-input"
            type="file"
            accept={ACCEPT}
            className="hidden"
            data-testid="ai-metadata-upload-input"
            onChange={onPickFile}
          />
        </label>
      ) : (
        <>
          {!report && (
            <p className="mt-4 text-sm text-[var(--c-muted-fg)]">
              Runs 5 layers: embedded metadata, full-file binary search, PDF/Word structure, visible text phrases,
              and tamper indicators (revisions, print-to-PDF exports, screenshot pages).
            </p>
          )}

          {report && (
            <div className="mt-5 space-y-4" data-testid="ai-metadata-report">
              <div className={`rounded-xl border px-4 py-3 ${verdictStyle.ring}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictStyle.badge}`}>
                    {verdictStyle.label}
                  </span>
                  <span className="text-xs text-[var(--c-muted-fg)]">
                    Confidence: {report.confidence} · {report.file_type?.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--c-ink)]">{report.summary}</p>
                {report.risk_categories?.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--c-muted-fg)]">
                    Layers triggered: {report.risk_categories.map((c) => CATEGORY_LABELS[c] || c).join(" · ")}
                  </p>
                )}
              </div>

              {report.signals?.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--c-ink)]">
                    Risk signals ({report.signal_count})
                  </h3>
                  <ul className="space-y-2">
                    {report.signals.map((s, i) => (
                      <li
                        key={`${s.field}-${s.indicator}-${i}`}
                        className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[s.severity] || SEVERITY_STYLES.low}`}
                        data-testid={`ai-metadata-signal-${i}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{s.indicator}</span>
                          <span className="text-xs opacity-80">
                            {CATEGORY_LABELS[s.category] || s.category} · {s.field}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-xs opacity-90">{s.value}</p>
                        {s.note && <p className="mt-1 text-xs opacity-75">{s.note}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-[var(--c-muted-fg)]">
                  No risk signals across metadata, binary, structure, or content layers. Documents
                  authored in Word with no tool fingerprints can still be AI-written — use human review.
                </p>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--c-ink)]">Evidence</h3>
                <MetadataBlock title="Document properties" data={meta.standard} />
                {meta.exif && Object.keys(meta.exif).length > 0 && (
                  <MetadataBlock title="EXIF" data={meta.exif} />
                )}
                {meta.body_excerpt && (
                  <div className="rounded-lg border border-[var(--c-border)]">
                    <p className="border-b border-[var(--c-border)] px-3 py-2 text-sm font-medium text-[var(--c-ink)]">
                      Body text excerpt
                    </p>
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-xs text-[var(--c-muted-fg)]">
                      {meta.body_excerpt}
                    </pre>
                  </div>
                )}
                {meta.xmp_excerpt && (
                  <div className="rounded-lg border border-[var(--c-border)]">
                    <p className="border-b border-[var(--c-border)] px-3 py-2 text-sm font-medium text-[var(--c-ink)]">
                      XMP excerpt
                    </p>
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-xs text-[var(--c-muted-fg)]">
                      {meta.xmp_excerpt}
                    </pre>
                  </div>
                )}
              </div>

              <p className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-2 text-xs leading-relaxed text-[var(--c-muted-fg)]">
                {report.disclaimer}
              </p>

              <p className="text-xs text-[var(--c-muted-fg)]">
                Checks: {(report.checks_performed || []).join(" · ")}
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" disabled={busy} onClick={reset} data-testid="ai-metadata-change-file">
              Change file
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={runScan}
              data-testid="ai-metadata-scan-btn"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-1.5 h-4 w-4" />}
              {report ? "Scan again" : "Run scan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !report}
              onClick={onSaveReport}
              data-testid="ai-metadata-save-documents-btn"
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