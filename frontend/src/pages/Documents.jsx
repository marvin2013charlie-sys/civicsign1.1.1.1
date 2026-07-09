import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, downloadFile } from "@/lib/api";
import { fetchAllEnvelopes } from "@/lib/envelopes";
import { AppShell } from "@/components/AppShell";
import { DocumentsSealedPanel } from "@/components/DocumentsSealedPanel";
import { DocumentsManagePdfPanel } from "@/components/DocumentsManagePdfPanel";
import { isManagePdfEnvelope } from "@/lib/savePdfToDocuments";
import { StatusBadge } from "@/components/StatusBadge";
import { VerifySealDialog } from "@/components/VerifySealDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import {
  FilePlus2, Search, FileText, MoreVertical, Trash2, Send, Eye, Inbox, Download,
  ShieldCheck, CheckCircle2, XCircle, Fingerprint, Pencil,
} from "lucide-react";

export default function Documents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { features, shouldOfferUpgrade } = usePlan();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab = tabParam === "sealed" ? "sealed" : tabParam === "manage-pdf" ? "manage-pdf" : "all";
  const canVerify = features.seal_verification;
  const canManagePdf = features.manage_pdf;
  const setTab = (t) => setParams(t === "all" ? {} : { tab: t }, { replace: true });

  const [loading, setLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyTarget, setVerifyTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllEnvelopes();
      setEnvelopes(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (user && tab === "sealed" && !canVerify) {
      setParams({}, { replace: true });
    }
  }, [user, tab, canVerify, setParams]);

  const sealedCount = useMemo(
    () => envelopes.filter((e) => e.status === "completed" && e.doc_hash).length,
    [envelopes],
  );

  const managePdfCount = useMemo(
    () => envelopes.filter(isManagePdfEnvelope).length,
    [envelopes],
  );

  const filtered = useMemo(() => {
    return envelopes.filter((e) => {
      if (isManagePdfEnvelope(e)) return false;
      const okQ = !query || e.title.toLowerCase().includes(query.toLowerCase());
      const okS = statusFilter === "all" || e.status === statusFilter;
      return okQ && okS;
    });
  }, [envelopes, query, statusFilter]);

  const openEnvelope = (e) => {
    if (e.status === "draft") navigate(`/prepare/${e.envelope_id}`);
    else navigate(`/envelope/${e.envelope_id}`);
  };

  const remove = async (id) => {
    if (!window.confirm(
      "Delete this envelope permanently? This cannot be undone and will not restore your monthly document allowance."
    )) return;
    try {
      await api.delete(`/envelopes/${id}`);
      toast.success("Envelope deleted");
      setEnvelopes((prev) => prev.filter((x) => x.envelope_id !== id));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const downloadDoc = async (e) => {
    const completed = e.status === "completed" && e.completed_file_id;
    const path = completed ? `/envelopes/${e.envelope_id}/completed` : `/envelopes/${e.envelope_id}/file`;
    const filename = `${e.title || "document"}${completed ? "-completed" : ""}.pdf`;
    try {
      await downloadFile(path, filename);
    } catch {
      toast.error("Could not download this document");
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

  return (
    <AppShell
      title="Documents & seals"
      actions={
        <Button onClick={() => navigate("/new")} data-testid="documents-new-envelope-button"
          style={{ background: "var(--c-primary)", color: "#fff" }}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> New Envelope
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-[var(--c-paper-2)] p-1">
          <TabsTrigger value="all" data-testid="documents-tab-all" className="data-[state=active]:bg-[var(--card)]">
            <FileText className="mr-1.5 h-4 w-4" /> All documents
          </TabsTrigger>
          <TabsTrigger value="sealed" data-testid="documents-tab-sealed" className="data-[state=active]:bg-[var(--card)]">
            <Fingerprint className="mr-1.5 h-4 w-4" /> Sealed & verify
            {sealedCount > 0 && (
              <span className="pointer-events-none ml-1.5 rounded-full bg-[var(--c-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {sealedCount}
              </span>
            )}
          </TabsTrigger>
          {canManagePdf && (
            <TabsTrigger value="manage-pdf" data-testid="documents-tab-manage-pdf" className="data-[state=active]:bg-[var(--card)]">
              <Pencil className="mr-1.5 h-4 w-4" /> From Manage PDF
              {managePdfCount > 0 && (
                <span className="pointer-events-none ml-1.5 rounded-full bg-[var(--c-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {managePdfCount}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…"
                className="pl-9" data-testid="documents-search-input" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44" data-testid="documents-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
                <SelectItem value="completing">Finalizing</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="documents-table">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
                  <Inbox className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
                </span>
                <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No documents found</h3>
                <p className="mt-1 max-w-xs text-sm text-[var(--c-muted-fg)]">
                  {envelopes.length === 0
                    ? "Upload a PDF or Word document to send your first document for signature."
                    : "No documents match your filters. Try clearing the search or status filter."}
                </p>
                {envelopes.length === 0 && (
                  <Button onClick={() => navigate("/new")} className="mt-5" data-testid="documents-empty-new-button"
                    style={{ background: "var(--c-primary)", color: "#fff" }}>
                    <FilePlus2 className="mr-1.5 h-4 w-4" /> Send your first document
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--c-border)]">
                <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] sm:grid">
                  <div className="col-span-5">Document</div>
                  <div className="col-span-2">Recipients</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Updated</div>
                  <div className="col-span-1" />
                </div>
                {filtered.map((e) => (
                  <div key={e.envelope_id} data-testid="document-row"
                    className="grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)] sm:grid-cols-12"
                    onClick={() => openEnvelope(e)}>
                    <div className="col-span-5 flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                        <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--c-ink)]">{e.title}</p>
                        <p className="truncate text-xs text-[var(--c-muted-fg)]">{e.document?.page_count} page(s) · {e.document?.file_type?.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{e.recipients?.length || 0} signer(s)</div>
                    <div className="col-span-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={e.status} />
                      {e.status === "completed" && e.seal_verification?.status === "verified" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700" title="Seal verified">
                          <CheckCircle2 className="h-3 w-3" /> Sealed
                        </span>
                      )}
                      {e.status === "completed" && e.seal_verification?.status === "mismatch" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700" title="Seal mismatch">
                          <XCircle className="h-3 w-3" /> Seal
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{fmtDate(e.updated_at)}</div>
                    <div className="col-span-1 flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid="document-row-menu"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEnvelope(e)}>
                            {e.status === "draft" ? <><Send className="mr-2 h-4 w-4" /> Continue</> : <><Eye className="mr-2 h-4 w-4" /> View</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadDoc(e)} data-testid="document-row-download">
                            <Download className="mr-2 h-4 w-4" /> Download{e.status === "completed" ? " (signed)" : ""}
                          </DropdownMenuItem>
                          {canVerify && e.status === "completed" && e.doc_hash && (
                            <DropdownMenuItem onClick={() => setVerifyTarget(e)} data-testid="document-row-verify">
                              <ShieldCheck className="mr-2 h-4 w-4" /> Verify seal
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => remove(e.envelope_id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manage-pdf">
          {canManagePdf ? (
            <DocumentsManagePdfPanel envelopes={envelopes} loading={loading} onReload={load} />
          ) : (
            <UpgradePrompt
              feature="manage_pdf"
              title="Manage PDF saves appear on Pro plans"
              description="Use any Manage PDF tool — compress, watermark, AI metadata check, and more — then save PDFs here ready for signing."
            />
          )}
        </TabsContent>

        <TabsContent value="sealed">
          {canVerify ? (
            <DocumentsSealedPanel envelopes={envelopes} loading={loading} onReload={load} />
          ) : shouldOfferUpgrade("seal_verification") ? (
            <UpgradePrompt
              feature="seal_verification"
              title="Verify tamper-evident seals on Pro & Business"
              description="Every completed document gets a SHA-256 seal. Pro and Business plans let you verify seals anytime — upload a PDF, check your whole library, or confirm a document was not altered after signing."
            />
          ) : (
            <p className="text-sm text-[var(--c-muted-fg)]">
              Seal verification is available on Pro and Business plans.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {canVerify && verifyTarget && (
        <VerifySealDialog
          open={!!verifyTarget}
          onOpenChange={(open) => { if (!open) setVerifyTarget(null); }}
          envelopeId={verifyTarget.envelope_id}
          docHash={verifyTarget.doc_hash}
          onSealUpdated={() => { load(); setVerifyTarget(null); }}
        />
      )}
    </AppShell>
  );
}