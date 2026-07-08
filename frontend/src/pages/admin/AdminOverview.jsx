import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Cell,
} from "recharts";
import {
  Users, FileText, CheckCircle2, Inbox, LayoutTemplate, UserCheck, TrendingUp,
} from "lucide-react";

const KPI = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid={`kpi-${label.toLowerCase().replace(/\\s+/g, "-")}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{label}</span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent + "22" }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </span>
    </div>
    <p className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">{value}</p>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg bg-[var(--c-paper-2)] p-3 text-center">
    <p className="font-heading text-xl font-bold text-[var(--c-ink)]">{value}</p>
    <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">{label}</p>
  </div>
);

const STATUS_COLORS = {
  draft: "#B08968", sent: "#14B8A6", viewed: "#0284C7",
  completed: "#16A34A", declined: "#DC2626", expired: "#B45309",
};

export default function AdminOverview() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/metrics");
        setM(data);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !m) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Platform overview</h1>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      </div>
    );
  }

  const t = m.totals;
  const statusData = Object.entries(m.status_counts).map(([k, v]) => ({ name: k, count: v }));
  const planData = Object.entries(m.plan_counts).map(([k, v]) => ({ name: k, count: v }));

  return (
    <div data-testid="admin-overview">
      <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Platform overview</h1>
      <p className="mt-0.5 text-sm text-[var(--c-muted-fg)]">A live snapshot of CivicSign usage across all accounts.</p>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI icon={Users} label="Total Users" value={t.users} accent="#14B8A6" />
        <KPI icon={UserCheck} label="Active Users" value={t.active_users} accent="#0284C7" />
        <KPI icon={FileText} label="Envelopes" value={t.envelopes} accent="#FF7A5C" />
        <KPI icon={TrendingUp} label="Completion" value={`${t.completion_rate}%`} accent="#16A34A" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI icon={CheckCircle2} label="Completed" value={t.completed} accent="#16A34A" />
        <KPI icon={LayoutTemplate} label="Templates" value={t.templates} accent="#0284C7" />
        <KPI icon={Inbox} label="Messages" value={t.contacts} accent="#FF7A5C" />
        <KPI icon={Inbox} label="Unhandled" value={t.contacts_unhandled} accent="#B45309" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold text-[var(--c-ink)]">New signups · last 14 days</p>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.signup_series} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} /><stop offset="100%" stopColor="#14B8A6" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5C6B73" }} axisLine={false} tickLine={false} interval={1} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#14B8A6" strokeWidth={2} fill="url(#gs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold text-[var(--c-ink)]">Envelopes created · last 14 days</p>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.envelope_series} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs><linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF7A5C" stopOpacity={0.4} /><stop offset="100%" stopColor="#FF7A5C" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5C6B73" }} axisLine={false} tickLine={false} interval={1} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#FF7A5C" strokeWidth={2} fill="url(#ge)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold text-[var(--c-ink)]">Envelopes by status</p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} cursor={{ fill: "#00000008" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] || "#14B8A6"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold text-[var(--c-ink)]">Users by plan</p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} cursor={{ fill: "#00000008" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#14B8A6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {m.analytics && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3" data-testid="admin-analytics">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5 lg:col-span-2">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Signing funnel</p>
            <div className="mt-4 space-y-3">
              {m.analytics.funnel.map((f) => {
                const max = m.analytics.funnel[0].count || 1;
                const pct = Math.round((f.count / max) * 100);
                return (
                  <div key={f.stage}>
                    <div className="flex justify-between text-xs text-[var(--c-muted-fg)]"><span>{f.stage}</span><span>{f.count}</span></div>
                    <div className="mt-1 h-3 rounded-full bg-[var(--c-paper-2)]"><div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--c-primary)" }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat label="Avg time to sign" value={`${m.analytics.avg_time_to_sign_hours}h`} />
              <MiniStat label="Decline rate" value={`${m.analytics.decline_rate}%`} />
              <MiniStat label="Expired rate" value={`${m.analytics.expired_rate}%`} />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="admin-top-users">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Most active users</p>
            <div className="mt-3 space-y-2.5">
              {m.analytics.top_users.length === 0 ? (
                <p className="text-sm text-[var(--c-muted-fg)]">No data yet.</p>
              ) : m.analytics.top_users.map((u, i) => (
                <div key={u.email || u.user_id || `top-user-${i}`} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-paper-2)] text-xs font-bold text-[var(--c-ink)]">{i + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--c-ink)]">{u.name}</p><p className="truncate text-xs text-[var(--c-muted-fg)]">{u.email}</p></div>
                  <span className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
