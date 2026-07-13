import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCcw, KeyRound, UserCog, AlertCircle } from "lucide-react";
import { AUDIT_ACTION_BADGE } from "@/lib/semanticColors";
import {
  AdminPageIntro,
  AdminSurfaceCard,
  AdminSectionHeader,
  AdminPillTabs,
  AdminEmptyState,
} from "@/components/portal/AdminPrimitives";

const ACTION_META = {
  refund_transaction: { label: "Refund", icon: RefreshCcw, badge: AUDIT_ACTION_BADGE.refund_transaction },
  send_password_reset: { label: "Password reset", icon: KeyRound, badge: AUDIT_ACTION_BADGE.send_password_reset },
  impersonate: { label: "Impersonate", icon: UserCog, badge: AUDIT_ACTION_BADGE.impersonate },
};

const ACTION_TABS = [
  { id: "all", label: "All actions" },
  { id: "refund_transaction", label: "Refunds" },
  { id: "send_password_reset", label: "Password resets" },
  { id: "impersonate", label: "Impersonations" },
];

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
      toast.error(formatApiError(err));
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
      <AdminPageIntro
        caveat="Compliance & support"
        title="Audit log"
        subtitle="Sensitive admin actions, newest first. Useful for compliance & support reviews."
      />

      <AdminPillTabs
        tabs={ACTION_TABS}
        value={action}
        onChange={setAction}
        testId="audit-action-filter"
      />

      <AdminSurfaceCard flush className="mt-5 overflow-hidden">
        <AdminSectionHeader
          title="Admin activity"
          subtitle="Refunds, password resets, and impersonations"
          icon={History}
        />
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={History}
            title="No audit events yet"
            description="Refunds, password resets and impersonations will be logged here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--c-paper-2)] text-left text-xs uppercase tracking-wide text-[var(--c-muted-fg)]">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Target user</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ev) => {
                  const meta = ACTION_META[ev.action] || { label: ev.action, icon: AlertCircle, badge: "cs-badge cs-badge-neutral" };
                  const Icon = meta.icon;
                  return (
                    <tr key={ev.audit_id} className="border-t border-[var(--c-border)]" data-testid={`audit-row-${ev.audit_id}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--c-muted-fg)]">{fmtDate(ev.at)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`gap-1 border-0 ${meta.badge}`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--c-ink)]">{ev.admin_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[var(--c-ink)]">{ev.target_email || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--c-muted-fg)]">
                        {ev.action === "refund_transaction" ? (
                          <span>
                            Refunded <strong>£{Number(ev.amount || 0).toFixed(2)}</strong>
                            {ev.reason ? <>, &ldquo;{ev.reason}&rdquo;</> : null}
                          </span>
                        ) : ev.tx_id ? <>tx: {ev.tx_id}</> : <>—</>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>
    </div>
  );
}