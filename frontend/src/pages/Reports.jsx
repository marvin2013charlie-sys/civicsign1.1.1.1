import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Files, Clock, CheckCircle2, TrendingUp, Send, Eye, XCircle, FileWarning,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid={`report-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent + "22" }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </span>
    </div>
    <p className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">{value}</p>
  </div>
);

const STATUS_META = [
  { key: "draft", label: "Draft", icon: FileWarning, color: "#B45309" },
  { key: "sent", label: "Sent", icon: Send, color: "#0284C7" },
  { key: "viewed", label: "Viewed", icon: Eye, color: "#6366F1" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "#16A34A" },
  { key: "declined", label: "Declined", icon: XCircle, color: "#DC2626" },
];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/stats");
        setStats(data);
      } catch (err) {
        toast.error(formatApiError(err.response?.data?.detail));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pieData = stats ? STATUS_META
    .map((m) => ({ name: m.label, value: stats.counts[m.key] || 0, color: m.color }))
    .filter((d) => d.value > 0) : [];

  return (
    <AppShell title="Reports">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Files} label="Total" value={stats.total} accent="#1FB8A6" />
            <StatCard icon={Clock} label="Awaiting" value={stats.pending} accent="#0284C7" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.counts.completed} accent="#16A34A" />
            <StatCard icon={TrendingUp} label="Completion" value={`${stats.completion_rate}%`} accent="#FF7A5C" />
          </>
        )}
      </div>

      {!loading && stats && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5 lg:col-span-2" data-testid="report-trend-chart">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Envelopes created · last 7 days</p>
            {stats.total > 0 ? (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1FB8A6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#1FB8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E3D7C6", fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#1FB8A6" strokeWidth={2} fill="url(#rg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-6 text-sm text-[var(--muted-foreground)]">Send your first document to see trends.</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="report-status-breakdown">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Status breakdown</p>
            {pieData.length > 0 ? (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E3D7C6", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-6 text-sm text-[var(--muted-foreground)]">No envelopes yet. Send one to see the status mix.</p>
            )}
          </div>
        </div>
      )}

      {!loading && stats && (
        <div className="mt-4 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="report-status-rows">
          <p className="text-sm font-semibold text-[var(--c-ink)]">By status</p>
          <div className="mt-3 divide-y divide-[var(--c-border)]">
            {STATUS_META.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md" style={{ background: m.color + "22" }}>
                    <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                  </span>
                  <span className="text-sm font-medium text-[var(--c-ink)]">{m.label}</span>
                </div>
                <span className="font-heading text-base font-bold text-[var(--c-ink)]">{stats.counts[m.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
