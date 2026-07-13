import React, { useEffect, useMemo, useState } from "react";
import { ENVELOPE_PAGE_SIZE } from "@/lib/envelopes";
import { ListPagination, paginateItems } from "@/components/ListPagination";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { downloadFile, formatApiError } from "@/lib/api";
import { isManagePdfEnvelope, MANAGE_PDF_TOOL_LABELS } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  MoreVertical,
  Pencil,

  Send,
  Trash2,
} from "lucide-react";

function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

export function DocumentsManagePdfPanel({ envelopes, loading, onReload, query: queryProp, onQueryChange }) {
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState("");
  const query = queryProp ?? localQuery;
  const setQuery = onQueryChange ?? setLocalQuery;
  const [toolFilter, setToolFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query, toolFilter]);

  const saved = useMemo(
    () => (envelopes || []).filter(isManagePdfEnvelope),
    [envelopes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return saved.filter((e) => {
      const okQ = !q
        || (e.title || "").toLowerCase().includes(q)
        || (MANAGE_PDF_TOOL_LABELS[e.manage_pdf_tool] || "").toLowerCase().includes(q);
      const okT = toolFilter === "all" || e.manage_pdf_tool === toolFilter;
      return okQ && okT;
    });
  }, [saved, query, toolFilter]);

  const paged = useMemo(
    () => paginateItems(filtered, page, ENVELOPE_PAGE_SIZE),
    [filtered, page],
  );

  const remove = async (id) => {
    if (!window.confirm(
      "Delete this saved document? This cannot be undone and will not restore your monthly document allowance.",
    )) return;
    try {
      await api.delete(`/envelopes/${id}`);
      toast.success("Document removed");
      onReload?.();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const downloadDoc = async (e) => {
    try {
      const ext = (e.document?.file_type || "pdf").toLowerCase() === "docx" ? "docx" : "pdf";
      await downloadFile(`/envelopes/${e.envelope_id}/file`, `${e.title || "document"}.${ext}`);
    } catch {
      toast.error("Could not download this document");
    }
  };

  return (
    <div data-testid="documents-manage-pdf-panel" className="cs-portal-surface-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">From Manage PDF</h3>
          <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
            Saved PDFs ready to open in Prepare Studio and send for signature.
          </p>
        </div>
        <Select value={toolFilter} onValueChange={setToolFilter}>
          <SelectTrigger className="h-9 w-full rounded-xl sm:w-44" data-testid="documents-manage-pdf-tool-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tools</SelectItem>
            {Object.entries(MANAGE_PDF_TOOL_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span
              className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--status-sent-bg)" }}
            >
              <Pencil className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
            </span>
            <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No saved PDFs yet</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--c-muted-fg)]">
              {saved.length === 0
                ? "Use any Manage PDF tool, then choose Save to Documents."
                : "No documents match your search or tool filter."}
            </p>
            {saved.length === 0 && (
              <Button
                className="mt-5"
                onClick={() => navigate("/manage-pdf")}
                data-testid="documents-manage-pdf-empty-cta"
                style={{ background: "var(--c-primary)", color: "#fff" }}
              >
                <Pencil className="mr-1.5 h-4 w-4" /> Open Manage PDF
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] sm:grid">
              <div className="col-span-5">Document</div>
              <div className="col-span-2">Tool</div>
              <div className="col-span-2">Pages</div>
              <div className="col-span-2">Saved</div>
              <div className="col-span-1" />
            </div>
            {paged.map((e) => (
              <div
                key={e.envelope_id}
                data-testid="documents-manage-pdf-row"
                className="grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)] sm:grid-cols-12"
                onClick={() => navigate(`/prepare/${e.envelope_id}`)}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                    <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{e.title}</p>
                    <p className="truncate text-xs text-[var(--c-muted-fg)]">
                      {e.document?.original_filename || "PDF"}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">
                  <span className="rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-xs font-medium text-[var(--c-ink)]">
                    {MANAGE_PDF_TOOL_LABELS[e.manage_pdf_tool] || "Manage PDF"}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">
                  {e.document?.page_count || 0} page{(e.document?.page_count || 0) === 1 ? "" : "s"}
                </div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{fmtDate(e.created_at)}</div>
                <div className="col-span-1 flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="documents-manage-pdf-menu">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/prepare/${e.envelope_id}`)}>
                        <Send className="mr-2 h-4 w-4" /> Prepare for signing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadDoc(e)}>
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                      </DropdownMenuItem>
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
              total={filtered.length}
              pageSize={ENVELOPE_PAGE_SIZE}
              onPageChange={setPage}
              testId="manage-pdf-pagination"
            />
          </div>
        )}
      </div>
    </div>
  );
}