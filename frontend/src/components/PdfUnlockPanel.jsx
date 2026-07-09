import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, LockOpen, Save, Upload } from "lucide-react";
import api, { formatApiError, parseBlobApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PdfUnlockPanel({ onBack, busy, setBusy, quotaHandlers }) {
  const [fileInfo, setFileInfo] = useState(null);
  const [password, setPassword] = useState("");

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/pdf/workspace", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileInfo({
        workspace_id: data.workspace_id,
        filename: data.filename,
        needs_password: Boolean(data.needs_password),
        encrypted: Boolean(data.encrypted),
      });
      if (data.needs_password) {
        toast.message("Password required — enter it below to unlock");
      } else if (data.encrypted) {
        toast.message("No open password detected — try your owner password");
      } else {
        toast.error("This PDF does not appear to be password protected");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const runUnlock = async (mode) => {
    if (!fileInfo || !password) {
      toast.error("Enter the document password");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${fileInfo.workspace_id}/unlock`,
        { password },
        { responseType: "blob" },
      );
      const base = (fileInfo.filename || "document").replace(/\.pdf$/i, "");
      const filename = `${base}-unlocked.pdf`;
      if (mode === "download") {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Unlocked PDF downloaded");
      } else {
        await savePdfBlobToDocuments({
          blob: res.data,
          filename,
          title: `${base} (Unlocked)`,
          tool: "unlock",
          originalFilename: fileInfo.filename,
          quotaHandlers,
        });
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
    setPassword("");
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
          <LockOpen className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Unlock PDF</h2>
          <p className="text-xs text-[var(--c-muted-fg)]">
            {fileInfo
              ? `${fileInfo.filename}${fileInfo.needs_password ? " · password required" : ""}`
              : "Remove password protection from a locked PDF"}
          </p>
        </div>
      </div>

      {!fileInfo ? (
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
          <Upload className="h-9 w-9 text-[var(--c-primary)]" />
          <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose a protected PDF</span>
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            data-testid="unlock-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              document.getElementById("unlock-upload-input")?.click();
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload PDF
          </Button>
          <input
            id="unlock-upload-input"
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            data-testid="unlock-upload-input"
            onChange={onUpload}
          />
        </label>
      ) : (
        <>
          <div className="mt-5">
            <Label htmlFor="unlock-password">Document password</Label>
            <Input
              id="unlock-password"
              type="password"
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter open or owner password"
              data-testid="unlock-password-input"
            />
            <p className="mt-1.5 text-xs text-[var(--c-muted-fg)]">
              Use the password you set when protecting the file, or the owner password if you have it.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" disabled={busy} onClick={reset} data-testid="unlock-change-file">
              Change file
            </Button>
            <Button
              type="button"
              disabled={busy || !password}
              onClick={() => runUnlock("download")}
              data-testid="unlock-download-btn"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !password}
              onClick={() => runUnlock("save")}
              data-testid="unlock-save-documents-btn"
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