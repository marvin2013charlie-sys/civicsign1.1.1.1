import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilePlus2, Search, FileText, MoreVertical, Trash2, Send, Eye, Inbox,
} from "lucide-react";

export default function Documents() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    try {
      const { data } = await api.get("/envelopes");
      setEnvelopes(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return envelopes.filter((e) => {
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
    try {
      await api.delete(`/envelopes/${id}`);
      toast.success("Envelope deleted");
      setEnvelopes((prev) => prev.filter((x) => x.envelope_id !== id));
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

  return (
    <AppShell
      title="Documents"
      actions={
        <Button onClick={() => navigate("/new")} data-testid="documents-new-envelope-button"
          style={{ background: "var(--c-primary)", color: "#fff" }}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> New Envelope
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
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
            <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">
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
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid">
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
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{e.document?.page_count} page(s) · {e.document?.file_type?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{e.recipients?.length || 0} signer(s)</div>
                <div className="col-span-2"><StatusBadge status={e.status} /></div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{fmtDate(e.updated_at)}</div>
                <div className="col-span-1 flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="document-row-menu"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEnvelope(e)}>
                        {e.status === "draft" ? <><Send className="mr-2 h-4 w-4" /> Continue</> : <><Eye className="mr-2 h-4 w-4" /> View</>}
                      </DropdownMenuItem>
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
    </AppShell>
  );
}
