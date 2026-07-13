import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, downloadFile } from "@/lib/api";
import { ENVELOPE_PAGE_SIZE, fetchAllEnvelopes, fetchEnvelopesPage } from "@/lib/envelopes";
import { ListPagination } from "@/components/ListPagination";
import { AppShell } from "@/components/AppShell";
import { DocumentsSealedPanel } from "@/components/DocumentsSealedPanel";
import { DocumentsManagePdfPanel } from "@/components/DocumentsManagePdfPanel";

import { StatusBadge } from "@/components/StatusBadge";
import { VerifySealDialog } from "@/components/VerifySealDialog";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  FilePlus2, FileText, MoreVertical, Trash2, Send, Eye, Inbox, Download,
  ShieldCheck, CheckCircle2, XCircle, Fingerprint, Pencil,
} from "lucide-react";

export default function Documents() {
  const navigate = useNavigate();
  const { features, shouldOfferUpgrade } = usePlan();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab = tabParam === "sealed" ? "sealed" : tabParam === "manage-pdf" ? "manage-pdf" : "all";
  const canVerify = features.seal_verification;
  const canManagePdf = features.manage_pdf;
  const setTab = (t) => setParams(t === "all" ? {} : { tab: t }, { replace: true });

  const [loading, setLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState([]);
  const [envelopeTotal, setEnvelopeTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [auxEnvelopes, setAuxEnvelopes] = useState([]);
  const [auxLoading, setAuxLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [managePdfQuery, setManagePdfQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyTarget, setVerifyTarget] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);

  const loadAllTab = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEnvelopesPage({
        page,
        limit: ENVELOPE_PAGE_SIZE,
        status: statusFilter,
        q: debouncedQuery,
        excludeManagePdf: true,
      });
      setEnvelopes(data.items);
      setEnvelopeTotal(data.total);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedQuery]);

  const loadAuxEnvelopes = useCallback(async () => {
    if (tab === "all") return;
    setAuxLoading(true);
    try {
      const data = await fetchAllEnvelopes();
      setAuxEnvelopes(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAuxLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "all") loadAllTab();
  }, [tab, loadAllTab]);

  useEffect(() => {
    if (tab !== "all") loadAuxEnvelopes();
  }, [tab, loadAuxEnvelopes]);

  const load = async () => {
    if (tab === "all") await loadAllTab();
    else await loadAuxEnvelopes();
  };

  const [sealedCount, setSealedCount] = useState(0);
  const [managePdfCount, setManagePdfCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sealed, manage] = await Promise.all([
          fetchEnvelopesPage({ page: 1, limit: 1, sealedOnly: true }),
          fetchEnvelopesPage({ page: 1, limit: 1, managePdfOnly: true }),
        ]);
        if (!cancelled) {
          setSealedCount(sealed.total);
          setManagePdfCount(manage.total);
        }
      } catch { /* non-fatal badge counts */ }
    })();
    return () => { cancelled = true; };
  }, [envelopes, auxEnvelopes]);

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
      await load();
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

  const headerSearch = tab === "sealed"
    ? undefined
    : {
      value: tab === "manage-pdf" ? managePdfQuery : query,
      onChange: tab === "manage-pdf" ? setManagePdfQuery : setQuery,
      placeholder: tab === "manage-pdf" ? "Search saved PDFs…" : "Search documents…",
      testId: tab === "manage-pdf" ? "documents-manage-pdf-search" : "documents-search-input",
    };

  const docTabs = [
    { id: "all", label: "All documents", icon: FileText, testId: "documents-tab-all", count: envelopeTotal },
    { id: "sealed", label: "Sealed & verify", icon: Fingerprint, testId: "documents-tab-sealed", count: sealedCount },
    ...(canManagePdf ? [{ id: "manage-pdf", label: "From Manage PDF", icon: Pencil, testId: "documents-tab-manage-pdf", count: managePdfCount }] : []),
  ];

  return (
    <AppShell
      headerSearch={headerSearch}
      actions={tab === "all" ? (
        <button
          type="button"
          onClick={() => navigate("/new")}
          data-testid="documents-header-new-button"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
        >
          <FilePlus2 className="h-4 w-4" />
          <span className="hidden sm:inline">New envelope</span>
        </button>
      ) : undefined}
    >
      <div className="mb-5">
        <div
          style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
        >
          Your library
        </div>
        <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
          Documents & seals
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
        <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
          Drafts, sent envelopes, tamper-evident seals, and PDFs saved from Manage PDF.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div
          className="mb-5 flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px] w-fit gap-0.5"
          data-testid="documents-tab-pills"
        >
          {docTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                data-testid={t.testId}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all sm:px-4"
                style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.id === "all" ? "All" : t.id === "sealed" ? "Sealed" : "PDF"}</span>
                {t.count > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={active ? { background: "rgba(255,255,255,.2)", color: "#fff" } : { background: "var(--c-paper-2)", color: "var(--c-ink)" }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <TabsContent value="all">
          <div className="cs-portal-surface-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">All documents</h3>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full rounded-xl sm:w-44" data-testid="documents-status-filter"><SelectValue /></SelectTrigger>
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

          <div data-testid="documents-table">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : envelopes.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
                  <Inbox className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
                </span>
                <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No documents found</h3>
                <p className="mt-1 max-w-xs text-sm text-[var(--c-muted-fg)]">
                  {envelopeTotal === 0 && !debouncedQuery && statusFilter === "all"
                    ? "Upload a PDF or Word document to send your first document for signature."
                    : "No documents match your filters. Try clearing the search or status filter."}
                </p>
                {envelopeTotal === 0 && !debouncedQuery && statusFilter === "all" && (
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
                {envelopes.map((e) => (
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
                <ListPagination
                  page={page}
                  total={envelopeTotal}
                  pageSize={ENVELOPE_PAGE_SIZE}
                  onPageChange={setPage}
                  testId="documents-pagination"
                />
              </div>
            )}
          </div>
          </div>
        </TabsContent>

        <TabsContent value="manage-pdf">
          {canManagePdf ? (
            <DocumentsManagePdfPanel
              envelopes={auxEnvelopes}
              loading={auxLoading}
              onReload={load}
              query={managePdfQuery}
              onQueryChange={setManagePdfQuery}
            />
          ) : (
            <UpgradePrompt
              feature="manage_pdf"
              title="Manage PDF saves are on all paid plans"
              description="Use any Manage PDF tool — compress, watermark, AI metadata check, and more — then save PDFs here ready for signing. Included with Pro, Business, and Organisation; not on Free."
            />
          )}
        </TabsContent>

        <TabsContent value="sealed">
          {canVerify ? (
            <DocumentsSealedPanel envelopes={auxEnvelopes} loading={auxLoading} onReload={load} />
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