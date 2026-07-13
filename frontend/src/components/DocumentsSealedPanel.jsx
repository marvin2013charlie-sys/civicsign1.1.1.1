import React, { useEffect, useMemo, useRef, useState } from "react";
import { ENVELOPE_PAGE_SIZE } from "@/lib/envelopes";
import { ListPagination, paginateItems } from "@/components/ListPagination";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { VerifySealDialog, POST_SIGN_EDIT_WARNING } from "@/components/VerifySealDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Search, Upload, Loader2, CheckCircle2, XCircle, HelpCircle,
  ExternalLink, AlertTriangle, Fingerprint,
} from "lucide-react";

const BATCH_SIZE = 50;

function SealStatusBadge({ verification }) {
  if (!verification?.status) {
    return <span className="text-xs text-[var(--c-muted-fg)]">Not checked</span>;
  }
  if (verification.status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
      <XCircle className="h-3.5 w-3.5" /> Mismatch
    </span>
  );
}

function sealStatusKey(verification) {
  if (!verification?.status) return "not_checked";
  return verification.status;
}

export function DocumentsSealedPanel({ envelopes, loading, onReload }) {
  const navigate = useNavigate();
  const lookupInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const completed = useMemo(
    () => (envelopes || []).filter((e) => e.status === "completed" && e.doc_hash),
    [envelopes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return completed.filter((e) => {
      const okQ = !q
        || (e.title || "").toLowerCase().includes(q)
        || (e.envelope_id || "").toLowerCase().includes(q)
        || (e.doc_hash || "").toLowerCase().includes(q);
      const okS = statusFilter === "all" || sealStatusKey(e.seal_verification) === statusFilter;
      return okQ && okS;
    });
  }, [completed, query, statusFilter]);

  const paged = useMemo(
    () => paginateItems(filtered, page, ENVELOPE_PAGE_SIZE),
    [filtered, page],
  );

  const onLookup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      toast.error("Please choose a PDF file");
      return;
    }
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/envelopes/verify-seal/lookup", fd);
      setLookupResult(data);
      if (data.found && data.verification?.match) {
        toast.success(`Matched: ${data.envelope?.title || "Document"}`);
        onReload?.();
      }
      // Inline result card shows mismatch / not-found details — avoid duplicate toasts
    } catch (err) {
      const msg = formatApiError(err);
      setLookupResult({
        found: false,
        message: msg || "Could not read this PDF. Use the completed CivicSign download (with Certificate of Completion).",
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const runBulkVerify = async () => {
    if (!completed.length) return;
    setBulkRunning(true);
    setBulkProgress({ processed: 0, total: completed.length, passed: 0, failed: 0 });
    let skip = 0;
    let passed = 0;
    let failed = 0;
    let processed = 0;
    try {
      while (processed < completed.length) {
        const { data } = await api.post("/envelopes/verify-seals/bulk", {
          skip,
          limit: BATCH_SIZE,
          migrate_stale: true,
        });
        passed += data.passed || 0;
        failed += data.failed || 0;
        processed += data.processed || 0;
        setBulkProgress({
          processed,
          total: data.total || completed.length,
          passed,
          failed,
        });
        if (!data.has_more || !data.processed) break;
        skip += data.processed;
      }
      toast.success(`Verified ${processed} document(s): ${passed} passed, ${failed} failed`);
      onReload?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBulkRunning(false);
      setBulkProgress(null);
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

  return (
    <div data-testid="documents-sealed-panel" className="space-y-4">
      <div className="cs-portal-surface-card rounded-2xl border-l-4 px-4 py-3.5" style={{ borderLeftColor: "var(--c-primary)" }}>
        <p className="text-sm leading-relaxed text-[var(--c-ink)]">
          Every completed document gets a <strong>SHA-256 tamper-evident seal</strong>. Verify any signed PDF here using your stored copies.
        </p>
      </div>

      <div className="cs-portal-surface-card rounded-2xl p-5" data-testid="verify-lookup-card">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
          <Upload className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
          Find a document in your account
        </h2>
        <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
          Upload the completed CivicSign PDF from Download or your completion email (with Certificate of Completion).
          We match it to your envelopes and verify the seal — same check as the Verify button on each row below.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={lookupInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={onLookup}
            disabled={lookupLoading}
            data-testid="verify-lookup-file-input"
          />
          <Button
            type="button"
            onClick={() => lookupInputRef.current?.click()}
            disabled={lookupLoading}
            data-testid="verify-lookup-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            {lookupLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Upload PDF to find & verify
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload PDF to find & verify
              </>
            )}
          </Button>
        </div>

        {lookupResult && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              lookupResult.found && lookupResult.verification?.match
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : lookupResult.found
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-red-200 bg-red-50 text-red-950"
            }`}
            data-testid="verify-lookup-result"
          >
            {lookupResult.found ? (
              <>
                <p className="font-semibold">
                  {lookupResult.verification?.match ? "Found and verified" : "Found but seal mismatch"}
                  {": "}
                  {lookupResult.envelope?.title}
                </p>
                <p className="mt-1 text-xs opacity-90">{lookupResult.verification?.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/envelope/${lookupResult.envelope?.envelope_id}`)}
                  data-testid="verify-lookup-open-envelope"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open envelope
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold">No matching document in your account</p>
                <p className="mt-1 text-xs opacity-90">{lookupResult.message}</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" data-testid="verify-hub-warning">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{POST_SIGN_EDIT_WARNING}</span>
        </p>
      </div>

      <div className="cs-portal-surface-card rounded-2xl p-5" data-testid="verify-library-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              Sealed documents
            </h2>
            <p className="mt-0.5 text-sm text-[var(--c-muted-fg)]">
              {completed.length} completed with seals
              {bulkProgress && (
                <span className="ml-2">· Checking {bulkProgress.processed} / {bulkProgress.total}</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={runBulkVerify}
            disabled={bulkRunning || !completed.length}
            data-testid="verify-all-btn"
          >
            {bulkRunning
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <ShieldCheck className="mr-1.5 h-4 w-4" />}
            Verify all stored copies
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, envelope ID, or hash…"
              className="pl-9"
              data-testid="verify-library-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44" data-testid="verify-library-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seal statuses</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="mismatch">Mismatch</SelectItem>
              <SelectItem value="not_checked">Not checked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--c-border)]" data-testid="verify-library-table">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <HelpCircle className="mb-3 h-8 w-8 text-[var(--c-muted-fg)]" />
              <p className="font-medium text-[var(--c-ink)]">
                {completed.length === 0 ? "No sealed documents yet" : "No documents match your filters"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-[var(--c-muted-fg)]">
                {completed.length === 0
                  ? "When signing finishes, documents appear here with a SHA-256 seal you can verify anytime."
                  : "Try clearing the search or seal status filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--c-border)]">
              <div className="hidden grid-cols-12 gap-2 bg-[var(--c-paper-2)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] lg:grid">
                <div className="col-span-4">Document</div>
                <div className="col-span-3">Seal</div>
                <div className="col-span-2">Last checked</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1" />
              </div>
              {paged.map((e) => (
                <div
                  key={e.envelope_id}
                  className="grid grid-cols-1 items-center gap-2 px-4 py-3 lg:grid-cols-12"
                  data-testid="verify-library-row"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--c-ink)]">{e.title}</p>
                    <p className="truncate text-xs text-[var(--c-muted-fg)]">{e.envelope_id}</p>
                  </div>
                  <div className="col-span-3 min-w-0 truncate font-mono text-[10px] text-[var(--c-muted-fg)]" title={e.doc_hash}>
                    <Fingerprint className="mr-1 inline h-3 w-3" />
                    {e.doc_hash?.slice(0, 18)}…
                  </div>
                  <div className="col-span-2 text-xs text-[var(--c-muted-fg)]">
                    {fmtDate(e.seal_verification?.checked_at)}
                  </div>
                  <div className="col-span-2">
                    <SealStatusBadge verification={e.seal_verification} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVerifyTarget(e)}
                      data-testid={`verify-row-btn-${e.envelope_id}`}
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              ))}
              <ListPagination
                page={page}
                total={filtered.length}
                pageSize={ENVELOPE_PAGE_SIZE}
                onPageChange={setPage}
                testId="sealed-pagination"
              />
            </div>
          )}
        </div>
      </div>

      {verifyTarget && (
        <VerifySealDialog
          open={!!verifyTarget}
          onOpenChange={(open) => { if (!open) setVerifyTarget(null); }}
          envelopeId={verifyTarget.envelope_id}
          docHash={verifyTarget.doc_hash}
          onSealUpdated={() => { onReload?.(); setVerifyTarget(null); }}
        />
      )}
    </div>
  );
}