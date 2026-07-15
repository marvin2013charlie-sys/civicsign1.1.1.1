import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Search, PoundSterling, RefreshCcw, TrendingUp, ReceiptText, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  AdminPageIntro,
  AdminStatCard,
  AdminSurfaceCard,
  AdminSectionHeader,
  AdminPillTabs,
  AdminEmptyState,
  AdminStaffBadge,
  slugAdminTestId,
} from "@/components/portal/AdminPrimitives";

const STATUS_TABS = [
  { id: "all", label: "All statuses" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "refunded", label: "Refunded" },
  { id: "failed", label: "Failed" },
];

const fmtMoney = (n, currency = "gbp") => {
  const num = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(num);
  } catch {
    return `£${num.toFixed(2)}`;
  }
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

const StatusPill = ({ tx }) => {
  if (tx.refund_status === "refunded") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Refunded</Badge>;
  if (tx.refund_status === "partial") return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">Partial refund</Badge>;
  if (tx.payment_status === "paid") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>;
  if (tx.payment_status === "pending") return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Pending</Badge>;
  if (tx.payment_status === "failed") return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Failed</Badge>;
  return <Badge variant="outline">{tx.payment_status || tx.status || "—"}</Badge>;
};

function RefundDialog({ tx, onClose, onRefunded }) {
  const remaining = useMemo(() => {
    const paid = Number(tx?.amount || 0);
    const refunded = Number(tx?.refund_amount || 0);
    return Math.max(0, paid - refunded);
  }, [tx]);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [reason, setReason] = useState("");
  const [downgrade, setDowngrade] = useState(true);
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState(false);

  if (!tx) return null;
  const finalAmount = partial ? Number(amount) : remaining;

  const submit = async () => {
    if (!finalAmount || finalAmount <= 0) {
      toast.error("Refund amount must be greater than zero");
      return;
    }
    if (finalAmount - remaining > 0.001) {
      toast.error(`Refund amount cannot exceed ${fmtMoney(remaining, tx.currency)}`);
      return;
    }
    setBusy(true);
    try {
      const isFullRefund = !partial || finalAmount >= remaining - 0.001;
      const body = { reason, downgrade_plan: isFullRefund && downgrade };
      if (partial) body.amount = finalAmount;
      const { data } = await api.post(`/admin/transactions/${tx.tx_id}/refund`, body);
      toast.success(`Refund issued (${data.refund_status}). ${data.plan_downgraded ? "User plan was downgraded to Free." : ""}`);
      onRefunded?.(data.transaction);
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!tx} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="sm:max-w-md" data-testid="refund-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-[var(--c-primary)]" /> Issue refund</DialogTitle>
          <DialogDescription>
            Refunds are processed by Stripe and cannot be undone. The user will be notified by Stripe’s standard email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-[var(--c-paper-2)] p-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--c-muted-fg)]">Customer</span><span className="font-medium">{tx.user_name}</span></div>
            <div className="flex justify-between"><span className="text-[var(--c-muted-fg)]">Email</span><span>{tx.user_email}</span></div>
            <div className="flex justify-between"><span className="text-[var(--c-muted-fg)]">Plan</span><span className="capitalize">{tx.plan_id}</span></div>
            <div className="flex justify-between"><span className="text-[var(--c-muted-fg)]">Paid</span><span>{fmtMoney(tx.amount, tx.currency)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--c-muted-fg)]">Already refunded</span><span>{fmtMoney(tx.refund_amount, tx.currency)}</span></div>
            <div className="flex justify-between font-semibold"><span>Refundable</span><span>{fmtMoney(remaining, tx.currency)}</span></div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="partial" checked={partial} onCheckedChange={setPartial} data-testid="refund-partial-toggle" />
            <Label htmlFor="partial" className="cursor-pointer">Partial refund</Label>
          </div>

          {partial && (
            <div>
              <Label htmlFor="refund-amount">Amount ({(tx.currency || "gbp").toUpperCase()})</Label>
              <Input id="refund-amount" data-testid="refund-amount-input" type="number" min="0.01" step="0.01" max={remaining}
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}

          <div>
            <Label htmlFor="refund-reason">Reason / note (internal)</Label>
            <Textarea id="refund-reason" data-testid="refund-reason-input" rows={3}
              value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate charge, customer requested cancellation…" />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="downgrade" checked={downgrade} onCheckedChange={setDowngrade} data-testid="refund-downgrade-toggle" />
            <Label htmlFor="downgrade" className="cursor-pointer text-sm">Downgrade user to Free plan (only on full refund)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} data-testid="refund-confirm-button"
            className="bg-[var(--c-primary)] hover:bg-[var(--c-primary)]/90">
            {busy ? "Refunding…" : `Refund ${fmtMoney(finalAmount || 0, tx.currency)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBilling() {
  const [metrics, setMetrics] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [picked, setPicked] = useState(null);

  const load = useCallback(async (query, st) => {
    setLoading(true);
    try {
      const [mRes, listRes] = await Promise.allSettled([
        api.get("/admin/billing/metrics"),
        api.get("/admin/transactions", { params: { q: query, status: st } }),
      ]);
      if (mRes.status === "fulfilled") {
        setMetrics(mRes.value.data);
        setMetricsError(false);
      } else {
        setMetrics(null);
        setMetricsError(true);
        toast.error(formatApiError(mRes.reason));
      }
      if (listRes.status === "fulfilled") {
        setItems(listRes.value.data);
      } else {
        setItems([]);
        toast.error(formatApiError(listRes.reason));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, status), 250);
    return () => clearTimeout(t);
  }, [q, status, load]);

  const onRefunded = (fresh) => {
    setItems((prev) => prev.map((t) => (t.tx_id === fresh.tx_id ? { ...t, ...fresh } : t)));
    api.get("/admin/billing/metrics")
      .then(({ data }) => setMetrics(data))
      .catch((err) => toast.error(formatApiError(err) || "Could not refresh billing metrics"));
  };

  const currency = metrics?.currency || "gbp";

  return (
    <div data-testid="admin-billing">
      <AdminPageIntro
        caveat="Super-admin tools"
        title="Billing & Refunds"
        subtitle="Stripe transactions across the platform. Super-admins can issue refunds here."
        actions={<AdminStaffBadge label="Super-admin only" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : metricsError || !metrics ? (
          <AdminSurfaceCard className="col-span-full">
            <p className="text-sm text-[var(--c-muted-fg)]">Billing KPIs unavailable — transaction list may still load below.</p>
          </AdminSurfaceCard>
        ) : (
          <>
            <AdminStatCard
              icon={PoundSterling}
              label="Gross revenue"
              value={fmtMoney(metrics.totals.gross, currency)}
              tone="success"
              sub={`${metrics.totals.paid_count} paid`}
              testId={`billing-kpi-${slugAdminTestId("Gross revenue")}`}
            />
            <AdminStatCard
              icon={RefreshCcw}
              label="Refunded"
              value={fmtMoney(metrics.totals.refunded, currency)}
              tone="warning"
              sub={`${metrics.totals.refunded_count} refund(s)`}
              testId={`billing-kpi-${slugAdminTestId("Refunded")}`}
            />
            <AdminStatCard
              icon={TrendingUp}
              label="Net revenue"
              value={fmtMoney(metrics.totals.net, currency)}
              tone="teal"
              sub="Gross − refunded"
              testId={`billing-kpi-${slugAdminTestId("Net revenue")}`}
            />
            <AdminStatCard
              icon={ReceiptText}
              label="Transactions"
              value={metrics.totals.transactions}
              tone="info"
              sub="All time"
              testId={`billing-kpi-${slugAdminTestId("Transactions")}`}
            />
          </>
        )}
      </div>

      {metrics?.series?.length ? (
        <AdminSurfaceCard className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Revenue, last 30 days</p>
            <span className="text-xs text-[var(--c-muted-fg)]">Gross vs refunded</span>
          </div>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.series}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmtMoney(v, currency)} />
                <Area type="monotone" dataKey="gross" stroke="#16A34A" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="refunded" stroke="#DC2626" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminSurfaceCard>
      ) : null}

      {metrics?.by_plan && Object.keys(metrics.by_plan).length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Object.entries(metrics.by_plan).map(([plan, p]) => (
            <AdminSurfaceCard key={plan}>
              <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{plan}</p>
              <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{fmtMoney(p.net, currency)}</p>
              <div className="mt-1 text-[11.5px] font-medium text-[var(--c-muted-fg)]">
                {p.count} paid · gross {fmtMoney(p.gross, currency)} · refunded {fmtMoney(p.refunded, currency)}
              </div>
            </AdminSurfaceCard>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or session ID…" className="pl-9" data-testid="billing-search" />
        </div>
        <AdminPillTabs
          tabs={STATUS_TABS}
          value={status}
          onChange={setStatus}
          testId="billing-status-filter"
        />
      </div>

      <AdminSurfaceCard flush className="mt-4 overflow-hidden">
        <AdminSectionHeader
          title="Transactions"
          subtitle="Stripe checkout payments and refund history"
          icon={ReceiptText}
        />
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={AlertCircle}
            title="No transactions found"
            description="When users upgrade via Stripe Checkout, the payments will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--c-paper-2)] text-left text-xs uppercase tracking-wide text-[var(--c-muted-fg)]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => {
                  const refundable = tx.payment_status === "paid" && tx.refund_status !== "refunded";
                  return (
                    <tr key={tx.tx_id} className="border-t border-[var(--c-border)]" data-testid={`tx-row-${tx.tx_id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--c-ink)]">{tx.user_name}</div>
                        <div className="text-xs text-[var(--c-muted-fg)]">{tx.user_email}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{tx.plan_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{fmtMoney(tx.amount, tx.currency || currency)}</div>
                        {tx.promotion_code ? (
                          <div className="text-xs text-[var(--c-primary)]">Promo: {tx.promotion_code}</div>
                        ) : null}
                        {Number(tx.promotion_discount || 0) > 0 ? (
                          <div className="text-xs text-emerald-700">−{fmtMoney(tx.promotion_discount, tx.currency || currency)}</div>
                        ) : null}
                        {Number(tx.refund_amount || 0) > 0 ? (
                          <div className="text-xs text-rose-600">-{fmtMoney(tx.refund_amount, tx.currency || currency)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3"><StatusPill tx={tx} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--c-muted-fg)]">{fmtDate(tx.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {refundable ? (
                          <Button size="sm" variant="outline" data-testid={`refund-button-${tx.tx_id}`} onClick={() => setPicked(tx)}>
                            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refund
                          </Button>
                        ) : tx.refund_status === "refunded" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Refunded</span>
                        ) : (
                          <span className="text-xs text-[var(--c-muted-fg)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      <RefundDialog tx={picked} onClose={() => setPicked(null)} onRefunded={onRefunded} />
    </div>
  );
}