import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, FileText } from "lucide-react";

export default function AdminEnvelopes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async (query, st) => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/envelopes", { params: { q: query, status: st } });
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
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
      <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Envelopes</h1>
      <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Read-only oversight of all documents across the platform.</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by document title\u2026" className="pl-9" data-testid="admin-envelopes-search" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44" data-testid="admin-envelopes-status-filter"><SelectValue /></SelectTrigger>
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

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="admin-envelopes-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted-foreground)]">No envelopes found.</div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid">
              <div className="col-span-5">Document</div>
              <div className="col-span-3">Owner</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
            </div>
            {items.map((e) => (
              <div key={e.envelope_id} data-testid="admin-envelope-row" className="grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-12">
                <div className="col-span-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]"><FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} /></span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{e.title}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{e.recipient_count} signer(s) \u00b7 {e.document?.page_count} page(s)</p>
                  </div>
                </div>
                <div className="col-span-3 truncate text-sm text-[var(--muted-foreground)]">{e.owner_name}</div>
                <div className="col-span-2"><StatusBadge status={e.status} /></div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{fmt(e.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
