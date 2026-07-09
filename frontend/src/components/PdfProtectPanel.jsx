import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Lock, Save, Upload } from "lucide-react";
import api, { formatApiError, parseBlobApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PdfProtectPanel({ onBack, busy, setBusy, quotaHandlers }) {
  const [fileInfo, setFileInfo] = useState(null);
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(false);
  const [allowModify, setAllowModify] = useState(false);

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
      if (data.needs_password) {
        toast.error("This PDF is already password protected — use Unlock PDF instead");
        setFileInfo(null);
        return;
      }
      setFileInfo({
        workspace_id: data.workspace_id,
        filename: data.filename,
        page_count: data.page_count,
      });
      toast.success("Document loaded — set a password to protect it");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const runProtect = async (mode) => {
    if (!fileInfo) return;
    if (userPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${fileInfo.workspace_id}/protect`,
        {
          user_password: userPassword,
          owner_password: ownerPassword.trim() || null,
          allow_print: allowPrint,
          allow_copy: allowCopy,
          allow_modify: allowModify,
        },
        { responseType: "blob" },
      );
      const base = (fileInfo.filename || "document").replace(/\.pdf$/i, "");
      const filename = `${base}-protected.pdf`;
      if (mode === "download") {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Protected PDF downloaded");
      } else {
        await savePdfBlobToDocuments({
          blob: res.data,
          filename,
          title: `${base} (Protected)`,
          tool: "protect",
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
    setUserPassword("");
    setOwnerPassword("");
    setAllowPrint(true);
    setAllowCopy(false);
    setAllowModify(false);
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
          <Lock className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Protect PDF</h2>
          <p className="text-xs text-[var(--c-muted-fg)]">
            {fileInfo
              ? `${fileInfo.filename} · AES-256 encryption`
              : "Add a password and restrict printing, copying, or editing"}
          </p>
        </div>
      </div>

      {!fileInfo ? (
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
          <Upload className="h-9 w-9 text-[var(--c-primary)]" />
          <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose PDF or DOCX</span>
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            data-testid="protect-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              document.getElementById("protect-upload-input")?.click();
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload document
          </Button>
          <input
            id="protect-upload-input"
            type="file"
            accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            data-testid="protect-upload-input"
            onChange={onUpload}
          />
        </label>
      ) : (
        <>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="protect-user-pw">Password to open (required)</Label>
              <Input
                id="protect-user-pw"
                type="password"
                className="mt-1"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Min. 4 characters"
                data-testid="protect-user-password"
              />
            </div>
            <div>
              <Label htmlFor="protect-owner-pw">Owner password (optional)</Label>
              <Input
                id="protect-owner-pw"
                type="password"
                className="mt-1"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Defaults to open password"
                data-testid="protect-owner-password"
              />
            </div>
            <div className="space-y-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3">
              <p className="text-xs font-medium text-[var(--c-ink)]">Permissions for users who know the open password</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} data-testid="protect-allow-print" />
                Allow printing
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} data-testid="protect-allow-copy" />
                Allow copying text
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowModify} onChange={(e) => setAllowModify(e.target.checked)} data-testid="protect-allow-modify" />
                Allow editing
              </label>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" disabled={busy} onClick={reset} data-testid="protect-change-file">
              Change file
            </Button>
            <Button
              type="button"
              disabled={busy || userPassword.length < 4}
              onClick={() => runProtect("download")}
              data-testid="protect-download-btn"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || userPassword.length < 4}
              onClick={() => runProtect("save")}
              data-testid="protect-save-documents-btn"
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