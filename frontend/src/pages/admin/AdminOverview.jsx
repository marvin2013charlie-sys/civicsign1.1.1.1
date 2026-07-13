import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { PortalDashboardGreeting } from "@/components/portal/PortalPrimitives";
import {
  AdminStatCard, AdminSurfaceCard, AdminEmptyState, slugAdminTestId,
} from "@/components/portal/AdminPrimitives";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Cell,
} from "recharts";
import {
  Users, FileText, CheckCircle2, Inbox, LayoutTemplate, UserCheck, TrendingUp,
} from "lucide-react";

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl bg-[var(--c-paper-2)] p-3 text-center">
    <p className="font-heading text-xl font-bold text-[var(--c-ink)]">{value}</p>
    <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">{label}</p>
  </div>
);

const STATUS_COLORS = {
  draft: "#B08968", sent: "#14B8A6", viewed: "#0284C7",
  completed: "#16A34A", declined: "#DC2626", expired: "#B45309",
};

export default function AdminOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const { data } = await api.get("/admin/metrics", { signal: controller.signal });
      setM(data);
    } catch (err) {
      const timedOut = err?.code === "ECONNABORTED" || err?.name === "CanceledError";
      const message = timedOut
        ? "Metrics request timed out — check that the backend is running on port 8001."
        : (formatApiError(err) || "Could not load platform metrics");
      setLoadError(message);
      setM(null);
      toast.error(message);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div data-testid="admin-overview">
        <PortalDashboardGreeting user={user} subtitle="Loading metrics…" testId="admin-overview-greeting" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (loadError || !m) {
    return (
      <div data-testid="admin-overview">
        <PortalDashboardGreeting user={user} subtitle="Metrics could not be loaded." testId="admin-overview-greeting" />
        <AdminSurfaceCard>
          <AdminEmptyState
            icon={TrendingUp}
            title="Overview unavailable"
            description={loadError || "The metrics service did not return data. Check that the backend is running and you are signed in as a super-admin."}
            action={(
              <Button onClick={loadMetrics} className="rounded-xl" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                Retry
              </Button>
            )}
          />
        </AdminSurfaceCard>
      </div>
    );
  }

  const t = m.totals || {};
  const statusData = Object.entries(m.status_counts || {}).map(([k, v]) => ({ name: k, count: v }));
  const planData = Object.entries(m.plan_counts || {}).map(([k, v]) => ({ name: k, count: v }));

  return (
    <div data-testid="admin-overview">
      <PortalDashboardGreeting
        user={user}
        subtitle="A live snapshot of CivicSign usage across all accounts."
        testId="admin-overview-greeting"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStatCard
          icon={Users} label="Total users" value={t.users} tone="teal"
          onClick={() => navigate("/admin/users")} testId={`kpi-${slugAdminTestId("total users")}`}
          hint="Browse all users"
        />
        <AdminStatCard
          icon={UserCheck} label="Active users" value={t.active_users} tone="info"
          onClick={() => navigate("/admin/users")} testId={`kpi-${slugAdminTestId("active users")}`}
          hint="Browse active users"
        />
        <AdminStatCard
          icon={FileText} label="Envelopes" value={t.envelopes} tone="accent"
          testId={`kpi-${slugAdminTestId("envelopes")}`}
        />
        <AdminStatCard
          icon={TrendingUp} label="Completion" value={`${t.completion_rate}%`} tone="success"
          testId={`kpi-${slugAdminTestId("completion")}`}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStatCard
          icon={CheckCircle2} label="Completed" value={t.completed} tone="success"
          testId={`kpi-${slugAdminTestId("completed")}`}
        />
        <AdminStatCard
          icon={LayoutTemplate} label="Templates" value={t.templates} tone="info"
          onClick={() => navigate("/admin/users")} testId={`kpi-${slugAdminTestId("templates")}`}
          hint="Browse users with templates"
        />
        <AdminStatCard
          icon={Inbox} label="Messages" value={t.contacts} tone="accent"
          onClick={() => navigate("/admin/contacts")} testId={`kpi-${slugAdminTestId("messages")}`}
          hint="Open contact inbox"
        />
        <AdminStatCard
          icon={Inbox} label="Unhandled" value={t.contacts_unhandled} tone="warning"
          onClick={() => navigate("/admin/contacts")} testId={`kpi-${slugAdminTestId("unhandled")}`}
          hint="Triage new contact messages"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AdminSurfaceCard>
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
        </AdminSurfaceCard>
        <AdminSurfaceCard>
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
        </AdminSurfaceCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AdminSurfaceCard>
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
        </AdminSurfaceCard>
        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="cs-portal-surface-card w-full cursor-pointer rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
          title="Browse users by plan"
        >
          <p className="text-sm font-semibold text-[var(--c-ink)]">Users by plan</p>
          <div className="mt-3 h-44 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} cursor={{ fill: "#00000008" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#14B8A6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </button>
      </div>

      {m.analytics && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3" data-testid="admin-analytics">
          <AdminSurfaceCard className="lg:col-span-2">
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
          </AdminSurfaceCard>
          <AdminSurfaceCard testId="admin-top-users">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Most active users</p>
            <div className="mt-3 space-y-2.5">
              {m.analytics.top_users.length === 0 ? (
                <p className="text-sm text-[var(--c-muted-fg)]">No data yet.</p>
              ) : (m.analytics.top_users || []).map((u, i) => (
                <button
                  key={u.email || u.user_id || `top-user-${i}`}
                  type="button"
                  onClick={() => u.user_id && navigate(`/admin/users/${u.user_id}`)}
                  disabled={!u.user_id}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-[var(--c-paper-2)] disabled:cursor-default"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-paper-2)] text-xs font-bold text-[var(--c-ink)]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--c-ink)]">{u.name}</p>
                    <p className="truncate text-xs text-[var(--c-muted-fg)]">{u.email}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>{u.count}</span>
                </button>
              ))}
            </div>
          </AdminSurfaceCard>
        </div>
      )}
    </div>
  );
}