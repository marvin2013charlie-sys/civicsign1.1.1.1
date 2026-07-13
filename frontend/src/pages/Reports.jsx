import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { envelopeFilterPath, envelopeStatusToDashboardFilter } from "@/lib/envelopeFilters";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Files, Send, Eye, XCircle, FileWarning, FilePlus2, BarChart3, CheckCircle2,
} from "lucide-react";

const StatCard = ({ emoji, bg, label, value, sub, onClick, testId, hint }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      aria-label={onClick ? hint || label : undefined}
      title={onClick ? hint || label : undefined}
      className={`cs-portal-surface-card rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${onClick ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink-solid)]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-sm" style={{ background: bg }}>{emoji}</span>
      </div>
      <p className="mt-2 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{value}</p>
      {sub && <p className="mt-1 text-[11.5px] font-medium text-[var(--c-muted-fg)]">{sub}</p>}
    </Tag>
  );
};

const STATUS_META = [
  { key: "draft", label: "Draft", icon: FileWarning, color: "#B45309", bg: "var(--badge-coral-bg)" },
  { key: "sent", label: "Sent", icon: Send, color: "#0284C7", bg: "var(--badge-info-bg)" },
  { key: "viewed", label: "Viewed", icon: Eye, color: "#6366F1", bg: "var(--badge-info-bg)" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "#16A34A", bg: "var(--badge-success-bg)" },
  { key: "declined", label: "Declined", icon: XCircle, color: "#DC2626", bg: "var(--badge-coral-bg)" },
];

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/stats");
        setStats(data);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pieData = stats ? STATUS_META
    .map((m) => ({ name: m.label, value: stats.counts[m.key] || 0, color: m.color }))
    .filter((d) => d.value > 0) : [];

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Insights
          </div>
          <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
            Reports
            <span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Track envelopes sent, completion rate, and status mix across your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/new")}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
        >
          <FilePlus2 className="h-4 w-4" />
          <span className="hidden sm:inline">New envelope</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              emoji="📤" bg="var(--badge-teal-bg)" label="Sent" value={stats.total} sub="envelopes sent for signature"
              onClick={() => navigate(envelopeFilterPath("all"))} testId="report-kpi-sent" hint="View all envelopes on dashboard"
            />
            <StatCard
              emoji="⏳" bg="var(--badge-info-bg)" label="Awaiting" value={stats.pending} sub="pending signature"
              onClick={() => navigate(envelopeFilterPath("awaiting"))} testId="report-kpi-awaiting" hint="View awaiting envelopes on dashboard"
            />
            <StatCard
              emoji="✅" bg="var(--badge-success-bg)" label="Completed" value={stats.counts.completed} sub={`of ${stats.total} sent`}
              onClick={() => navigate(envelopeFilterPath("completed"))} testId="report-kpi-completed" hint="View completed envelopes on dashboard"
            />
            <StatCard
              emoji="📈" bg="var(--badge-coral-bg)" label="Completion" value={`${stats.completion_rate}%`} sub="completed ÷ sent"
              onClick={() => navigate(envelopeFilterPath("completed"))} testId="report-kpi-completion" hint="View completed envelopes on dashboard"
            />
          </>
        )}
      </div>

      {!loading && stats && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-stretch">
          <button
            type="button"
            onClick={() => navigate(envelopeFilterPath("all"))}
            className="cs-portal-surface-card w-full cursor-pointer rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink-solid)]"
            data-testid="report-trend-chart"
            title="View all envelopes on dashboard"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">Envelopes sent · last 7 days</p>
            </div>
            {stats.total > 0 ? (
              <div className="mt-3 h-64 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#14B8A6" strokeWidth={2} fill="url(#rg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center py-8 text-center">
                <Files className="h-10 w-10 text-[var(--c-muted-fg)]" />
                <p className="mt-3 text-sm text-[var(--c-muted-fg)]">Send your first document to see trends.</p>
              </div>
            )}
          </button>

          <div className="cs-portal-surface-card rounded-2xl p-5" data-testid="report-status-breakdown">
            <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">Status breakdown</p>
            {pieData.length > 0 ? (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E1DDD1", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-[var(--c-muted-fg)]">No envelopes yet.</p>
            )}
          </div>
        </div>
      )}

      {!loading && stats && (
        <div className="cs-portal-surface-card mt-4 overflow-hidden rounded-2xl" data-testid="report-status-rows">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">By status</h3>
          </div>
          <div className="divide-y divide-[var(--c-border)] px-5">
            {STATUS_META.map((m) => {
              const count = stats.counts[m.key] || 0;
              const filter = envelopeStatusToDashboardFilter(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => navigate(envelopeFilterPath(filter))}
                  disabled={count === 0}
                  data-testid={`report-status-row-${m.key}`}
                  title={count > 0 ? `View ${m.label.toLowerCase()} envelopes on dashboard` : undefined}
                  className="flex w-full items-center justify-between py-3.5 text-left transition-colors hover:bg-[var(--c-paper-2)] disabled:cursor-default disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: m.bg }}>
                      <m.icon className="h-4 w-4" style={{ color: m.color }} />
                    </span>
                    <span className="text-sm font-medium text-[var(--c-ink)]">{m.label}</span>
                  </div>
                  <span className="rounded-full bg-[var(--c-paper-2)] px-2.5 py-0.5 font-heading text-base font-bold text-[var(--c-ink)]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}