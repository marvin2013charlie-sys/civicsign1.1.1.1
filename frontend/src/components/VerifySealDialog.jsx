import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Upload, XCircle, Server, HardDrive,
} from "lucide-react";

export const POST_SIGN_EDIT_WARNING =
  "Do not edit this PDF in Word, Preview, Acrobat, or other software after signing. "
  + "Re-saving or changing the file can shift text alignment, reflow layouts, and break the tamper-evident seal.";

export const PROOF_REJECT_BANNER =
  "Do not accept this file as sealed proof. Use the original CivicSign download or the stored copy in this account.";

function SourceBadge({ source, sourceLabel }) {
  const uploaded = source === "uploaded";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        uploaded
          ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200"
          : "bg-violet-100 text-violet-900 ring-1 ring-violet-200"
      }`}
      data-testid="verify-source-badge"
    >
      {uploaded ? <HardDrive className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}
      {sourceLabel || (uploaded ? "Uploaded file" : "Stored CivicSign copy")}
    </span>
  );
}

function SealResultCard({ result }) {
  if (!result) return null;
  const accept = result.accept_as_proof ?? result.match;
  const reject = !accept;

  return (
    <div className="space-y-3" data-testid="verify-seal-result">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={result.source} sourceLabel={result.source_label} />
        {result.proof_verdict && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
              result.proof_verdict === "accept"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
            data-testid="verify-proof-verdict"
          >
            {result.proof_verdict === "accept" ? "Accept as proof" : "Reject as proof"}
          </span>
        )}
      </div>

      {reject && (
        <div
          className="rounded-lg border-2 border-red-500 bg-red-600 px-3 py-3 text-sm font-semibold text-white shadow-sm"
          data-testid="verify-reject-banner"
        >
          <p className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{PROOF_REJECT_BANNER}</span>
          </p>
        </div>
      )}

      <div
        className={`rounded-lg border px-3 py-3 text-sm ${
          accept
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-red-200 bg-red-50 text-red-950"
        }`}
      >
        <p className="flex items-start gap-2 font-semibold">
          {accept
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
          <span>
            {accept
              ? "Seal verified — document intact"
              : "Seal mismatch — document altered"}
          </span>
        </p>
        <p className="mt-2 text-xs opacity-90">{result.message}</p>

        <ul className="mt-3 space-y-1 text-xs">
          <li className="flex justify-between gap-2 border-t border-black/5 pt-2">
            <span className="opacity-70">Signed content</span>
            <span className="font-semibold">
              {result.content_match == null
                ? "—"
                : result.content_match
                  ? "Match"
                  : "Changed"}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="opacity-70">Full package (incl. certificate)</span>
            <span className="font-semibold">
              {result.package_match == null
                ? "Legacy / not recorded"
                : result.package_match
                  ? "Match"
                  : "Changed"}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="opacity-70">PDF metadata</span>
            <span className="font-semibold">
              {result.metadata_match == null
                ? "Legacy / not recorded"
                : result.metadata_match
                  ? "Match"
                  : "Changed"}
            </span>
          </li>
        </ul>
        {result.metadata?.mismatched_fields?.length > 0 && (
          <div className="mt-2 rounded-md bg-black/5 px-2 py-2 text-[11px]" data-testid="verify-metadata-diff">
            <p className="font-semibold opacity-80">Metadata differences</p>
            <ul className="mt-1 space-y-0.5">
              {result.metadata.mismatched_fields.map((f) => (
                <li key={f.field} className="font-mono break-all">
                  <span className="font-semibold">{f.field}</span>
                  {": "}
                  expected “{String(f.expected ?? "")}” · got “{String(f.actual ?? "")}”
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.computed_hash && (
          <p className="mt-2 font-mono text-[10px] break-all opacity-80">
            Content hash: {result.computed_hash}
          </p>
        )}
        {result.computed_package_hash && (
          <p className="mt-1 font-mono text-[10px] break-all opacity-80">
            Package hash: {result.computed_package_hash}
          </p>
        )}
        {result.source === "stored" && accept && (
          <p className="mt-2 text-xs opacity-90">
            This checks the file CivicSign stored at completion — not a file someone emailed you.
            To check a file from disk or email, use <strong>Upload PDF to verify</strong>.
          </p>
        )}
        {result.source === "uploaded" && accept && (
          <p className="mt-2 text-xs opacity-90">
            This specific uploaded file matches the sealed package and can be treated as sealed proof.
          </p>
        )}
      </div>
    </div>
  );
}

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
      if (data.accept_as_proof && (data.doc_hash_updated || data.seal_migrated)) {
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
            Checks signed page content, full package bytes (including Certificate of Completion),
            and PDF metadata (title, creator, producer, page sizes) against the seals recorded at completion.
            Stored and uploaded copies must match on all of these.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950" data-testid="verify-seal-warning">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{POST_SIGN_EDIT_WARNING}</span>
          </p>
        </div>

        <div className="rounded-lg bg-[var(--c-paper-2)] px-3 py-2 font-mono text-xs text-[var(--c-muted-fg)] break-all">
          Expected content seal: {docHash}
        </div>

        <SealResultCard result={result} />

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            onClick={() => runVerify()}
            disabled={verifying}
            data-testid="verify-seal-stored-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            {verifying ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Server className="mr-1.5 h-4 w-4" />}
            Verify stored copy (on CivicSign)
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
                Checking uploaded file…
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload PDF to verify (disk / email)
              </>
            )}
          </Button>
          <p className="text-center text-[11px] text-[var(--c-muted-fg)]">
            Stored copy = what CivicSign kept. Upload = the file someone is offering as proof.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
