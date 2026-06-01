import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileText, Loader2, X } from "lucide-react";

export default function NewEnvelope() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const accept = ".pdf,.docx,.doc";
  const isValid = (f) => /\.(pdf|docx|doc)$/i.test(f.name);

  const pick = (f) => {
    if (!f) return;
    if (!isValid(f)) { toast.error("Only PDF and Word (.docx) files are supported"); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.(pdf|docx|doc)$/i, ""));
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
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
      toast.error(formatApiError(err.response?.data?.detail) || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell title="New Envelope">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-[var(--muted-foreground)]">Upload the document you want signed. We support PDF and Word (.docx) — Word files are automatically converted.</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          data-testid="upload-dropzone"
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            drag ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)]" : "border-[var(--c-border)] bg-[var(--card)]"
          }`}
        >
          {!file ? (
            <>
              <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
                <UploadCloud className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
              </span>
              <p className="font-heading text-lg font-semibold text-[var(--c-ink)]">Drag & drop your document</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">or click to browse · PDF, DOCX up to 25MB</p>
            </>
          ) : (
            <div className="flex w-full items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-4" onClick={(e) => e.stopPropagation()}>
              <FileText className="h-8 w-8" style={{ color: "var(--c-primary)" }} />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold text-[var(--c-ink)]">{file.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
            </div>
          )}
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={(e) => pick(e.target.files?.[0])} data-testid="upload-file-input" />
        </div>

        <div className="mt-5">
          <Label htmlFor="title">Document title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master Services Agreement" className="mt-1" data-testid="envelope-title-input" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button onClick={submit} disabled={!file || uploading} data-testid="upload-continue-button"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            {uploading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading…</> : "Continue to prepare"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
