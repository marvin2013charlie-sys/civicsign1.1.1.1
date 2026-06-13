import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { History, RefreshCcw, KeyRound, UserCog, AlertCircle } from "lucide-react";

const ACTION_META = {
  refund_transaction: { label: "Refund", icon: RefreshCcw, color: "bg-amber-100 text-amber-800" },
  send_password_reset: { label: "Password reset", icon: KeyRound, color: "bg-sky-100 text-sky-800" },
  impersonate: { label: "Impersonate", icon: UserCog, color: "bg-purple-100 text-purple-800" },
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AdminAuditLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("all");

  const load = useCallback(async (act) => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/audit-log", { params: { action: act, limit: 500 } });
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(action), 0);
    return () => clearTimeout(t);
  }, [action, load]);

  return (
    <div data-testid="admin-audit-log">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Audit log</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Sensitive admin actions, newest first. Useful for compliance & support reviews.</p>
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full sm:w-48" data-testid="audit-action-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="refund_transaction">Refunds</SelectItem>
            <SelectItem value="send_password_reset">Password resets</SelectItem>
            <SelectItem value="impersonate">Impersonations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--c-paper-2)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Target user</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="mx-auto flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                      <History className="h-6 w-6" />
                      <p className="text-sm">No audit events yet.</p>
                      <p className="text-xs">Refunds, password resets and impersonations will be logged here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((ev) => {
                  const meta = ACTION_META[ev.action] || { label: ev.action, icon: AlertCircle, color: "bg-slate-100 text-slate-800" };
                  const Icon = meta.icon;
                  return (
                    <tr key={ev.audit_id} className="border-t border-[var(--c-border)]" data-testid={`audit-row-${ev.audit_id}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--muted-foreground)]">{fmtDate(ev.at)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`gap-1 ${meta.color} hover:${meta.color}`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--c-ink)]">{ev.admin_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[var(--c-ink)]">{ev.target_email || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {ev.action === "refund_transaction" ? (
                          <span>
                            Refunded <strong>£{Number(ev.amount || 0).toFixed(2)}</strong>
                            {ev.reason ? <> — “{ev.reason}”</> : null}
                          </span>
                        ) : ev.tx_id ? <>tx: {ev.tx_id}</> : <>—</>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
