import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import {
  FilePlus2, Search, FileText, MoreVertical, Trash2, Send, Eye,
  CheckCircle2, Clock, Files, TrendingUp, Inbox, Crown, AlertTriangle,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent + "22" }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </span>
    </div>
    <p className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">{value}</p>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState([]);
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    try {
      const [e, s, u] = await Promise.all([
        api.get("/envelopes"),
        api.get("/stats"),
        api.get("/usage"),
      ]);
      setEnvelopes(e.data);
      setStats(s.data);
      setUsage(u.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    return envelopes.filter((e) => {
      const okQ = !query || e.title.toLowerCase().includes(query.toLowerCase());
      const okS = statusFilter === "all" || e.status === statusFilter;
      return okQ && okS;
    });
  }, [envelopes, query, statusFilter]);

  const openEnvelope = (e) => {
    if (e.status === "draft") navigate(`/prepare/${e.envelope_id}`);
    else navigate(`/envelope/${e.envelope_id}`);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/envelopes/${id}`);
      toast.success("Envelope deleted");
      setEnvelopes((prev) => prev.filter((x) => x.envelope_id !== id));
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

  return (
    <AppShell
      title="Dashboard"
      actions={
        <Button onClick={() => navigate("/new")} data-testid="dashboard-new-envelope-button"
          style={{ background: "var(--c-primary)", color: "#fff" }}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> New Envelope
        </Button>
      }
    >
      {/* Stats */}
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

      {/* Monthly quota meter */}
      {!loading && usage && (
        <div
          className="mt-4 rounded-xl border bg-[var(--card)] p-5"
          style={{ borderColor: usage.percent >= 90 && !usage.unlimited ? "#FCA5A5" : "var(--c-border)" }}
          data-testid="dashboard-quota-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                  <Crown className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                </span>
                <p className="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--c-ink)]">
                  Document quota · {usage.month}
                </p>
                <span className="rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--c-ink)]">
                  {usage.plan} plan
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold font-heading text-[var(--c-ink)]" data-testid="dashboard-quota-counter">
                {usage.unlimited ? (
                  <>Unlimited</>
                ) : (
                  <>
                    {usage.used} <span className="text-base font-medium text-[var(--muted-foreground)]">/ {usage.limit} this month</span>
                  </>
                )}
              </p>
              {!usage.unlimited && (
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {usage.remaining} remaining · resets on the 1st
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!usage.unlimited && usage.percent >= 80 && (
                <Button size="sm" variant="outline" onClick={() => navigate("/settings?tab=billing")} data-testid="dashboard-quota-upgrade">
                  <Crown className="mr-1.5 h-3.5 w-3.5" /> Upgrade plan
                </Button>
              )}
            </div>
          </div>
          {!usage.unlimited && (
            <div className="mt-4">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--c-paper-2)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, usage.percent)}%`,
                    background:
                      usage.percent >= 90 ? "#DC2626" :
                      usage.percent >= 70 ? "#F59E0B" : "var(--c-primary)",
                  }}
                  data-testid="dashboard-quota-bar"
                />
              </div>
              {usage.percent >= 90 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> You&rsquo;re almost out of envelopes this month. Upgrade to keep sending.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {!loading && stats && stats.total > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold text-[var(--c-ink)]">Envelopes created · last 7 days</p>
          <div className="mt-3 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1FB8A6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#1FB8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E3D7C6", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#1FB8A6" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…"
            className="pl-9" data-testid="envelope-search-input" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44" data-testid="envelope-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table / list */}
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="envelope-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
              <Inbox className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
            </span>
            <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No envelopes yet</h3>
            <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">Upload a PDF or Word document to send your first document for signature.</p>
            <Button onClick={() => navigate("/new")} className="mt-5" data-testid="empty-new-envelope-button"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Send your first document
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid">
              <div className="col-span-5">Document</div>
              <div className="col-span-2">Recipients</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1" />
            </div>
            {filtered.map((e) => (
              <div key={e.envelope_id} data-testid="envelope-row"
                className="grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)] sm:grid-cols-12"
                onClick={() => openEnvelope(e)}>
                <div className="col-span-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                    <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{e.title}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{e.document?.page_count} page(s) · {e.document?.file_type?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{e.recipients?.length || 0} signer(s)</div>
                <div className="col-span-2"><StatusBadge status={e.status} /></div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{fmtDate(e.updated_at)}</div>
                <div className="col-span-1 flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="envelope-row-menu"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEnvelope(e)}>
                        {e.status === "draft" ? <><Send className="mr-2 h-4 w-4" /> Continue</> : <><Eye className="mr-2 h-4 w-4" /> View</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => remove(e.envelope_id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
