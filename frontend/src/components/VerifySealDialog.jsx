import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Upload, XCircle,
} from "lucide-react";

export const POST_SIGN_EDIT_WARNING =
  "Do not edit this PDF in Word, Preview, Acrobat, or other software after signing. "
  + "Re-saving or changing the file can shift text alignment, reflow layouts, and break the tamper-evident seal.";

export function VerifySealDialog({ open, onOpenChange, envelopeId, docHash, onSealUpdated }) {
  const fileInputRef = useRef(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setResult(null), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const runVerify = async (file = null) => {
    setVerifying(true);
    setResult(null);
    try {
      let data;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        ({ data } = await api.post(`/envelopes/${envelopeId}/verify-seal`, fd));
      } else {
        ({ data } = await api.post(`/envelopes/${envelopeId}/verify-seal`));
      }
      setResult(data);
      if (data.match && (data.doc_hash_updated || data.seal_migrated)) {
        onSealUpdated?.(data);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setVerifying(false);
    }
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      toast.error("Please choose a PDF file");
      return;
    }
    runVerify(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="verify-seal-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
            Verify tamper-evident seal
          </DialogTitle>
          <DialogDescription>
            Checks that the signed document content still matches the SHA-256 seal recorded at completion.
            The Certificate of Completion page is excluded from the check.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950" data-testid="verify-seal-warning">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{POST_SIGN_EDIT_WARNING}</span>
          </p>
        </div>

        <div className="rounded-lg bg-[var(--c-paper-2)] px-3 py-2 font-mono text-xs text-[var(--c-muted-fg)] break-all">
          Expected seal: {docHash}
        </div>

        {result && (
          <div
            className={`rounded-lg border px-3 py-3 text-sm ${
              result.match
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-red-200 bg-red-50 text-red-950"
            }`}
            data-testid="verify-seal-result"
          >
            <p className="flex items-start gap-2 font-semibold">
              {result.match
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
              <span>{result.match ? "Seal verified — document intact" : "Seal mismatch — document altered"}</span>
            </p>
            <p className="mt-2 text-xs opacity-90">{result.message}</p>
            {result.computed_hash && (
              <p className="mt-2 font-mono text-[10px] break-all opacity-80">
                Computed: {result.computed_hash}
              </p>
            )}
            {!result.match && (
              <p className="mt-2 text-xs opacity-90">
                External editors often re-encode PDFs and move text or signatures. Use the original download or completion email attachment for legal records.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            onClick={() => runVerify()}
            disabled={verifying}
            data-testid="verify-seal-stored-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            {verifying ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
            Verify stored copy
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={onUpload}
            disabled={verifying}
            data-testid="verify-seal-file-input"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={verifying}
            data-testid="verify-seal-upload-btn"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Upload PDF to verify
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload PDF to verify
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}