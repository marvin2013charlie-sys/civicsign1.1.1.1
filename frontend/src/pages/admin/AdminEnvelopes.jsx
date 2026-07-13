import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, downloadCsv } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AdminPageIntro, AdminPillTabs, AdminEmptyState,
} from "@/components/portal/AdminPrimitives";
import { Search, FileText, Download } from "lucide-react";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "viewed", label: "Viewed" },
  { id: "completed", label: "Completed" },
  { id: "declined", label: "Declined" },
  { id: "expired", label: "Expired" },
];

const VALID_STATUSES = new Set(STATUS_TABS.map((t) => t.id));

export default function AdminEnvelopes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.has(statusParam) ? statusParam : "all";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const setStatus = (st) => {
    const next = new URLSearchParams(searchParams);
    if (st === "all") next.delete("status");
    else next.set("status", st);
    setSearchParams(next, { replace: true });
  };

  const load = useCallback(async (query, st) => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/envelopes", { params: { q: query, status: st } });
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, status), 300);
    return () => clearTimeout(t);
  }, [q, status, load]);

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "\u2014");

  return (
    <div data-testid="admin-envelopes">
      <AdminPageIntro
        caveat="Internal console"
        title="Envelopes"
        subtitle="Read-only oversight of all documents across the platform."
        actions={(
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => downloadCsv("/admin/export/envelopes.csv", "civicsign_envelopes.csv")}
            data-testid="admin-export-envelopes"
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        )}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminPillTabs
          tabs={STATUS_TABS}
          value={status}
          onChange={setStatus}
          testId="admin-envelopes-status-filter"
        />
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by document title…"
            className="pl-9"
            data-testid="admin-envelopes-search"
          />
        </div>
      </div>

      <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="admin-envelopes-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={FileText}
            title="No envelopes found"
            description="Try adjusting your search or status filter."
          />
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] sm:grid">
              <div className="col-span-5">Document</div>
              <div className="col-span-3">Owner</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
            </div>
            {items.map((e) => (
              <div
                key={e.envelope_id}
                data-testid="admin-envelope-row"
                role={e.owner_id ? "button" : undefined}
                tabIndex={e.owner_id ? 0 : undefined}
                onClick={() => e.owner_id && navigate(`/admin/users/${e.owner_id}`)}
                onKeyDown={(ev) => {
                  if (e.owner_id && (ev.key === "Enter" || ev.key === " ")) {
                    ev.preventDefault();
                    navigate(`/admin/users/${e.owner_id}`);
                  }
                }}
                className={`grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-12 ${e.owner_id ? "cursor-pointer transition-colors hover:bg-[var(--c-paper-2)] focus-visible:bg-[var(--c-paper-2)] focus-visible:outline-none" : ""}`}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                    <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{e.title}</p>
                    <p className="truncate text-xs text-[var(--c-muted-fg)]">{e.recipient_count} signer(s) · {e.document?.page_count} page(s)</p>
                  </div>
                </div>
                <div className="col-span-3 truncate text-sm text-[var(--c-muted-fg)]">{e.owner_name}</div>
                <div className="col-span-2"><StatusBadge status={e.status} /></div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{fmt(e.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}