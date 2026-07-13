import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { formatQuotaRemainingLine } from "@/lib/quotaDisplay";
import { AppShell } from "@/components/AppShell";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UploadCloud, FileText, Loader2, X, ArrowLeft, PenLine, Send,
  FileType2, Shield, CheckCircle2,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Upload", icon: UploadCloud, active: true },
  { id: 2, label: "Prepare", icon: PenLine, active: false },
  { id: 3, label: "Send", icon: Send, active: false },
];

const FORMATS = [
  { id: "pdf", emoji: "📄", label: "PDF", hint: "Ready to sign as-is" },
  { id: "docx", emoji: "📝", label: "Word (.docx)", hint: "Converted · sign-only for recipients" },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewEnvelope() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quotaModal, setQuotaModal] = useState(false);
  const [quotaDetail, setQuotaDetail] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const accept = ".pdf,.docx,.doc";
  const isValid = (f) => /\.(pdf|docx|doc)$/i.test(f.name);
  const MAX_BYTES = 25 * 1024 * 1024;
  const isWord = file && /\.(docx|doc)$/i.test(file.name);

  useEffect(() => {
    api.get("/usage")
      .then(({ data }) => setUsage(data))
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, []);

  const pick = (f) => {
    if (!f) return;
    if (!isValid(f)) { toast.error("Only PDF and Word (.docx) files are supported"); return; }
    if (f.size > MAX_BYTES) { toast.error("File must be 25 MB or smaller"); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.(pdf|docx|doc)$/i, ""));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const submit = async () => {
    if (!file) { toast.error("Please choose a document"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      const { data } = await api.post("/envelopes", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded");
      navigate(`/prepare/${data.envelope_id}`);
    } catch (err) {
      if (!handleQuotaApiError(err, {
        setDetail: setQuotaDetail,
        setOpen: setQuotaModal,
      })) {
        toast.error(formatApiError(err) || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell title="New Envelope">
      {/* Header — matches Dashboard greeting row */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Step 1 of 3
          </div>
          <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
            New envelope
            <span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Upload the document you want signed. Drafts do not use your allowance — only sent documents count.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-portal-card)] px-4 py-2.5 text-[13px] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </div>

      {/* Step pills — Dashboard status-filter style */}
      <div
        className="mb-5 flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px] w-fit"
        data-testid="new-envelope-steps"
      >
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <span
              key={step.id}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
              style={
                step.active
                  ? { background: "var(--c-ink-solid)", color: "#fff" }
                  : { color: "var(--c-muted-fg)" }
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {step.label}
            </span>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        {/* Main upload card */}
        <div className="cs-portal-surface-card overflow-hidden rounded-2xl">
          <div className="border-b border-[var(--c-border)] px-5 py-4">
            <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Your document</h3>
            <p className="mt-0.5 text-sm text-[var(--c-muted-fg)]">PDF or Word up to 25&nbsp;MB</p>
          </div>

          <div className="p-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              data-testid="upload-dropzone"
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all ${
                drag
                  ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)] scale-[1.01]"
                  : file
                    ? "border-[var(--c-primary)] border-solid bg-[var(--c-paper-2)] cursor-default"
                    : "border-[var(--c-border)] bg-[var(--c-paper)] hover:border-[var(--c-primary)] hover:bg-[var(--status-sent-bg)]"
              }`}
            >
              {!file ? (
                <>
                  <span
                    className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl transition-transform"
                    style={{ background: "var(--status-sent-bg)" }}
                  >
                    <UploadCloud className="h-8 w-8" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <p className="font-heading text-xl font-semibold text-[var(--c-ink)]">Drag & drop your document</p>
                  <p className="mt-1.5 text-sm text-[var(--c-muted-fg)]">or click to browse</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {FORMATS.map((f) => (
                      <span
                        key={f.id}
                        className="rounded-full bg-[var(--c-portal-card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]"
                        style={{ border: "1px solid var(--c-border)" }}
                      >
                        {f.emoji} {f.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  className="flex w-full items-center gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--badge-teal-bg)" }}
                  >
                    <FileText className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{file.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
                      {formatBytes(file.size)}
                      {isWord ? " · will convert to PDF" : " · PDF"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="shrink-0"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
                data-testid="upload-file-input"
              />
            </div>

            {file && !uploading && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-3 text-xs font-semibold text-[var(--c-primary)] hover:underline"
              >
                Choose a different file
              </button>
            )}

            <div className="mt-5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                Document title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Services Agreement"
                className="mt-1.5 rounded-xl bg-[var(--c-portal-card)]"
                data-testid="envelope-title-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">
              Cancel
            </Button>
            <button
              type="button"
              onClick={submit}
              disabled={!file || uploading}
              data-testid="upload-continue-button"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
              style={{ background: "var(--c-ink-solid)", boxShadow: file && !uploading ? "0 8px 20px rgba(18,33,32,.18)" : "none" }}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><PenLine className="h-4 w-4" /> Continue to prepare</>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar — Dashboard-style info cards */}
        <div className="flex flex-col gap-4">
          {isWord && (
            <div
              className="cs-portal-surface-card rounded-2xl border-l-4 px-4 py-3.5"
              style={{ borderLeftColor: "var(--c-primary)" }}
              data-testid="new-envelope-word-notice"
            >
              <p className="flex items-start gap-2 text-sm font-medium text-[var(--c-ink)]">
                <FileType2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                <span>
                  Word files are converted to PDF. Signers can add <strong>signatures only</strong> — they cannot edit the document text.
                </span>
              </p>
            </div>
          )}

          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">Supported formats</h4>
            <ul className="mt-3 space-y-3">
              {FORMATS.map((f) => (
                <li key={f.id} className="flex items-start gap-3">
                  <span className="text-lg leading-none" aria-hidden>{f.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--c-ink)]">{f.label}</p>
                    <p className="text-xs text-[var(--c-muted-fg)]">{f.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">
              <Shield className="h-3.5 w-3.5" /> What happens next
            </h4>
            <ol className="mt-3 space-y-2.5">
              {[
                "Place signature fields on your document",
                "Add recipients and a message",
                "Send — only then does it count toward your limit",
              ].map((line, i) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--c-ink)]">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "var(--c-primary)" }}
                  >
                    {i + 2}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          </div>

          <div className="cs-portal-surface-card rounded-2xl p-5" data-testid="new-envelope-quota-card">
            <h4 className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">Your allowance</h4>
            {usageLoading ? (
              <Skeleton className="mt-3 h-10 w-full rounded-lg" />
            ) : usage?.unlimited ? (
              <p className="mt-2 font-heading text-2xl font-bold text-[var(--c-ink)]">Unlimited</p>
            ) : usage ? (
              <>
                <p className="mt-2 font-heading text-2xl font-bold text-[var(--c-ink)]">
                  {usage.used}
                  <span className="text-base font-medium text-[var(--c-muted-fg)]"> / {usage.limit}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
                  {formatQuotaRemainingLine(usage) || "Sent for signature this billing period"}
                  {" · "}Drafts and saved PDFs do not count
                </p>
                {!usage.unlimited && usage.limit > 0 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--c-paper-2)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, usage.percent || 0)}%`,
                        background: usage.at_limit || (usage.percent || 0) >= 90
                          ? "#DC2626"
                          : (usage.percent || 0) >= 70
                            ? "#F59E0B"
                            : "var(--c-primary)",
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--c-muted-fg)]">Allowance loads when you sign in.</p>
            )}
          </div>

          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs text-[var(--c-muted-fg)]"
            style={{ background: "var(--badge-success-bg)" }}
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--badge-teal-fg)" }} />
            Uploading creates a draft — you can prepare and review before sending.
          </div>
        </div>
      </div>

      <QuotaLimitModal open={quotaModal} onOpenChange={setQuotaModal} detail={quotaDetail} />
    </AppShell>
  );
}