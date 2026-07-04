import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  Search, PoundSterling, RefreshCcw, ShieldCheck, TrendingUp, ReceiptText, AlertCircle, CheckCircle2,
} from "lucide-react";

const KPI = ({ icon: Icon, label, value, accent, sub }) => (
  <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid={`billing-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent + "22" }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </span>
    </div>
    <p className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">{value}</p>
    {sub ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{sub}</p> : null}
  </div>
);

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
      const body = { reason, downgrade_plan: downgrade };
      if (partial) body.amount = finalAmount;
      const { data } = await api.post(`/admin/transactions/${tx.tx_id}/refund`, body);
      toast.success(`Refund issued (${data.refund_status}). ${data.plan_downgraded ? "User plan was downgraded to Free." : ""}`);
      onRefunded?.(data.transaction);
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
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
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Customer</span><span className="font-medium">{tx.user_name}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Email</span><span>{tx.user_email}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Plan</span><span className="capitalize">{tx.plan_id}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Paid</span><span>{fmtMoney(tx.amount, tx.currency)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Already refunded</span><span>{fmtMoney(tx.refund_amount, tx.currency)}</span></div>
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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [picked, setPicked] = useState(null);

  const load = useCallback(async (query, st) => {
    setLoading(true);
    try {
      const [m, list] = await Promise.all([
        api.get("/admin/billing/metrics"),
        api.get("/admin/transactions", { params: { q: query, status: st } }),
      ]);
      setMetrics(m.data);
      setItems(list.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
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
    // Reload metrics so KPIs reflect the refund.
    api.get("/admin/billing/metrics").then(({ data }) => setMetrics(data)).catch(() => {});
  };

  const currency = metrics?.currency || "gbp";

  return (
    <div data-testid="admin-billing">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Billing &amp; Refunds</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Stripe transactions across the platform. Super-admins can issue refunds here.</p>
        </div>
        <Badge variant="outline" className="gap-1.5 border-[var(--c-primary)]/30 bg-[var(--c-primary)]/5 text-[var(--c-primary)]">
          <ShieldCheck className="h-3.5 w-3.5" /> Super-admin only
        </Badge>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KPI icon={PoundSterling} label="Gross revenue" value={fmtMoney(metrics.totals.gross, currency)} accent="#16A34A" sub={`${metrics.totals.paid_count} paid`} />
            <KPI icon={RefreshCcw} label="Refunded" value={fmtMoney(metrics.totals.refunded, currency)} accent="#DC2626" sub={`${metrics.totals.refunded_count} refund(s)`} />
            <KPI icon={TrendingUp} label="Net revenue" value={fmtMoney(metrics.totals.net, currency)} accent="#14B8A6" sub="Gross − refunded" />
            <KPI icon={ReceiptText} label="Transactions" value={metrics.totals.transactions} accent="#0284C7" sub="All time" />
          </>
        )}
      </div>

      {/* 30-day revenue chart */}
      {metrics?.series?.length ? (
        <div className="mt-5 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-[var(--c-ink)]">Revenue — last 30 days</h2>
            <span className="text-xs text-[var(--muted-foreground)]">Gross vs refunded</span>
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
        </div>
      ) : null}

      {/* By-plan breakdown */}
      {metrics?.by_plan && Object.keys(metrics.by_plan).length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Object.entries(metrics.by_plan).map(([plan, p]) => (
            <div key={plan} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{plan}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-[var(--c-ink)]">{fmtMoney(p.net, currency)}</p>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {p.count} paid · gross {fmtMoney(p.gross, currency)} · refunded {fmtMoney(p.refunded, currency)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or session ID…" className="pl-9" data-testid="billing-search" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44" data-testid="billing-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--c-paper-2)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
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
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="mx-auto flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                      <AlertCircle className="h-6 w-6" />
                      <p className="text-sm">No transactions found.</p>
                      <p className="text-xs">When users upgrade via Stripe Checkout, the payments will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((tx) => {
                  const refundable = tx.payment_status === "paid" && tx.refund_status !== "refunded";
                  return (
                    <tr key={tx.tx_id} className="border-t border-[var(--c-border)]" data-testid={`tx-row-${tx.tx_id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--c-ink)]">{tx.user_name}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{tx.user_email}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{tx.plan_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{fmtMoney(tx.amount, tx.currency || currency)}</div>
                        {Number(tx.refund_amount || 0) > 0 ? (
                          <div className="text-xs text-rose-600">-{fmtMoney(tx.refund_amount, tx.currency || currency)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3"><StatusPill tx={tx} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--muted-foreground)]">{fmtDate(tx.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {refundable ? (
                          <Button size="sm" variant="outline" data-testid={`refund-button-${tx.tx_id}`} onClick={() => setPicked(tx)}>
                            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refund
                          </Button>
                        ) : tx.refund_status === "refunded" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Refunded</span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RefundDialog tx={picked} onClose={() => setPicked(null)} onRefunded={onRefunded} />
    </div>
  );
}
