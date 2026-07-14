import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { buildQuotaDetailFromUsage, canUpgradePlan } from "@/lib/quota";
import { formatExtraDocumentLimitMessage } from "@/lib/pricing";
import {
  formatQuotaCounterSuffix,
  formatQuotaLimitReachedMessage,
  formatQuotaNearLimitMessage,
  formatQuotaRemainingLine,
} from "@/lib/quotaDisplay";
import { ORG_STAFF_LIMIT_MESSAGE } from "@/lib/orgLabels";

import { AppShell } from "@/components/AppShell";
import { PortalDashboardGreeting } from "@/components/portal/PortalPrimitives";
import { useAuth } from "@/context/AuthContext";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import { StatusBadge } from "@/components/StatusBadge";
import { ListPagination } from "@/components/ListPagination";
import { ENVELOPE_PAGE_SIZE, fetchEnvelopesPage } from "@/lib/envelopes";
import { normalizeEnvelopeStatusFilter } from "@/lib/envelopeFilters";
import { Button } from "@/components/ui/button";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
// Lazy so the recharts chunk (~97 KB gzip) doesn't block the dashboard shell.
const EnvelopeTrendChart = React.lazy(() => import("@/components/portal/EnvelopeTrendChart"));
import {
  FilePlus2, FileText, MoreVertical, Trash2, Send, Eye,
  CheckCircle2, Clock, Files, TrendingUp, Inbox, Crown, AlertTriangle, Building2,
} from "lucide-react";

const FILTER_HINTS = {
  all: "View all envelopes",
  awaiting: "View envelopes awaiting signature",
  completed: "View completed envelopes",
  draft: "View draft envelopes",
  declined: "View declined envelopes",
};

const StatCard = ({ emoji, bg, label, value, sub, subColor, onClick, active, testId, hint }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      aria-pressed={onClick ? !!active : undefined}
      aria-label={onClick ? hint || label : undefined}
      title={onClick ? hint || label : undefined}
      className={`cs-portal-surface-card rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${onClick ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink-solid)]" : ""}`}
      style={active ? { boxShadow: "0 0 0 2px var(--c-ink-solid)" } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-sm" style={{ background: bg }}>
          {emoji}
        </span>
      </div>
      <p className="mt-2 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{value}</p>
      {sub && (
        <p className="mt-1 text-[11.5px] font-medium" style={{ color: subColor || "var(--c-muted-fg)" }}>{sub}</p>
      )}
    </Tag>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState([]);
  const [envelopeTotal, setEnvelopeTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const statusFilter = normalizeEnvelopeStatusFilter(searchParams.get("status"));
  const [quotaModal, setQuotaModal] = useState(false);
  const [quotaDetail, setQuotaDetail] = useState(null);
  const [reminding, setReminding] = useState(false);
  const envelopesSectionRef = useRef(null);
  const didDeepLinkScroll = useRef(false);

  const scrollToEnvelopes = useCallback(() => {
    requestAnimationFrame(() => {
      envelopesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const applyStatusFilter = useCallback((filter, { scroll = true } = {}) => {
    const next = normalizeEnvelopeStatusFilter(filter);
    setPage(1);
    if (next === "all") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ status: next }, { replace: true });
    }
    if (scroll) scrollToEnvelopes();
  }, [setSearchParams, scrollToEnvelopes]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);

  useEffect(() => {
    if (didDeepLinkScroll.current) return undefined;
    const status = searchParams.get("status");
    if (status && status !== "all") {
      didDeepLinkScroll.current = true;
      const t = setTimeout(scrollToEnvelopes, 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchParams, scrollToEnvelopes]);

  const loadEnvelopes = useCallback(async () => {
    try {
      const data = await fetchEnvelopesPage({
        page,
        limit: ENVELOPE_PAGE_SIZE,
        status: statusFilter,
        q: debouncedQuery,
      });
      setEnvelopes(data.items);
      setEnvelopeTotal(data.total);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, [page, statusFilter, debouncedQuery]);

  const loadMeta = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api.get("/stats"), api.get("/usage")]);
      setStats(s.data);
      setUsage(u.data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadEnvelopes(), loadMeta()]);
    } finally {
      setLoading(false);
    }
  }, [loadEnvelopes, loadMeta]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const idle = stats?.idle || [];
  const statusCounts = stats?.counts || {};

  const openEnvelope = (e) => {
    if (e.status === "draft") navigate(`/prepare/${e.envelope_id}`);
    else navigate(`/envelope/${e.envelope_id}`);
  };

  const openQuotaModal = () => {
    if (!usage) return;
    setQuotaDetail(buildQuotaDetailFromUsage(usage));
    setQuotaModal(true);
  };

  const startNewEnvelope = () => {
    navigate("/new");
  };

  const sendReminders = async () => {
    if (!idle.length || reminding) return;
    setReminding(true);
    try {
      const results = await Promise.allSettled(
        idle.map((e) =>
          api.post(`/envelopes/${e.envelope_id}/remind`, { base_url: getAppOrigin() }),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (ok) toast.success(`Reminder${ok === 1 ? "" : "s"} sent for ${ok} envelope${ok === 1 ? "" : "s"}`);
      if (failed) toast.error(`${failed} reminder${failed === 1 ? "" : "s"} could not be sent`);
      load();
    } finally {
      setReminding(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(
      "Delete this envelope permanently? This cannot be undone and will not restore your monthly document allowance."
    )) return;
    try {
      await api.delete(`/envelopes/${id}`);
      toast.success("Envelope deleted");
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

  return (
    <AppShell
      headerSearch={{
        value: query,
        onChange: setQuery,
        placeholder: "Search documents…",
        testId: "envelope-search-input",
      }}
      actions={(
        <button
          type="button"
          onClick={startNewEnvelope}
          data-testid="dashboard-new-envelope-button"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-px sm:px-5"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
        >
          <FilePlus2 className="h-4 w-4" />
          <span className="hidden sm:inline">New envelope</span>
        </button>
      )}
    >
      <PortalDashboardGreeting user={user} testId="dashboard-greeting" />

      {/* Action-needed strip */}
      {!loading && idle.length > 0 && (
        <div
          className="mb-5 flex flex-wrap items-center gap-3 rounded-[14px] border bg-[var(--card)] px-4 py-3.5"
          style={{ borderColor: "var(--badge-coral-bg)", borderLeft: "4px solid var(--c-accent)" }}
          data-testid="dashboard-reminder-strip"
        >
          <span className="text-lg" aria-hidden>✍️</span>
          <button
            type="button"
            onClick={() => applyStatusFilter("awaiting")}
            className="min-w-0 flex-1 cursor-pointer rounded-lg text-left text-[13.5px] font-medium text-[var(--c-ink)] transition-colors hover:opacity-90"
            data-testid="dashboard-reminder-view"
            title="View envelopes awaiting signature"
          >
            <b>{idle.length} envelope{idle.length === 1 ? "" : "s"} need{idle.length === 1 ? "s" : ""} a nudge</b>
            {" — "}
            {idle.slice(0, 2).map((e) => `“${e.title}”`).join(" and ")}
            {idle.length > 2 ? ` and ${idle.length - 2} more` : ""} {idle.length === 1 ? "hasn't" : "haven't"} moved in 3+ days.
          </button>
          <button
            type="button"
            disabled={reminding}
            onClick={sendReminders}
            className="rounded-[10px] px-4 py-2 text-[12.5px] font-semibold transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--badge-coral-bg)", color: "var(--badge-coral-fg)" }}
            data-testid="dashboard-reminder-send"
          >
            {reminding ? "Sending…" : "Send reminders"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              emoji="📦" bg="var(--badge-teal-bg)" label="Total envelopes" value={stats.total} sub="sent for signature"
              onClick={() => applyStatusFilter("all")} active={statusFilter === "all"} testId="dashboard-stat-total" hint={FILTER_HINTS.all}
            />
            <StatCard
              emoji="⏳" bg="var(--badge-info-bg)" label="Awaiting signature" value={stats.pending}
              sub={idle.length ? `${idle.length} need reminders` : "all moving"}
              subColor={idle.length ? "var(--badge-coral-fg)" : "var(--badge-teal-fg)"}
              onClick={() => applyStatusFilter("awaiting")} active={statusFilter === "awaiting"} testId="dashboard-stat-awaiting" hint={FILTER_HINTS.awaiting}
            />
            <StatCard
              emoji="✅" bg="var(--badge-success-bg)" label="Completed" value={stats.counts.completed} sub={`of ${stats.total} sent`}
              onClick={() => applyStatusFilter("completed")} active={statusFilter === "completed"} testId="dashboard-stat-completed" hint={FILTER_HINTS.completed}
            />
            <StatCard
              emoji="📈" bg="var(--badge-coral-bg)" label="Completion rate" value={`${stats.completion_rate}%`} sub="completed ÷ sent"
              onClick={() => applyStatusFilter("completed")} active={statusFilter === "completed"} testId="dashboard-stat-completion-rate" hint={FILTER_HINTS.completed}
            />
          </>
        )}
      </div>

      {/* Chart + quota row (Dashboard design) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-stretch">
      {/* Chart */}
      {!loading && stats && stats.total > 0 && (
        <button
          type="button"
          onClick={() => applyStatusFilter("all")}
          className="cs-portal-surface-card w-full cursor-pointer rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink-solid)]"
          data-testid="dashboard-chart-card"
          title={FILTER_HINTS.all}
        >
          <p className="text-sm font-semibold text-[var(--c-ink)]">Envelopes sent · last 7 days</p>
          <div className="mt-3 h-32 pointer-events-none">
            <React.Suspense fallback={<div className="h-full w-full animate-pulse rounded-lg bg-[var(--c-paper-2)]" />}>
              <EnvelopeTrendChart data={stats.series} />
            </React.Suspense>
          </div>
        </button>
      )}

      {/* Monthly quota meter */}
      {!loading && usage && (() => {
        const isOrg = usage.scope === "organization";
        const isOrgOwnerView = isOrg && usage.is_org_owner;
        const isOrgStaffView = isOrg && !usage.is_org_owner;
        return (
        <div
          className="cs-portal-surface-card flex h-full flex-col rounded-2xl p-5"
          style={{ borderColor: (usage.at_limit || usage.percent >= 90) && !usage.unlimited ? "#FCA5A5" : "var(--c-border)" }}
          data-testid="dashboard-quota-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                  {isOrg ? <Building2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> : <Crown className="h-4 w-4" style={{ color: "var(--c-primary)" }} />}
                </span>
                <p className="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--c-ink)]">
                  {isOrg ? "Your allowance" : "Document quota"} · {usage.month}
                </p>
                <span className="rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--c-ink)]">
                  {isOrg ? "Organisation" : `${usage.plan} plan`}
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold font-heading text-[var(--c-ink)]" data-testid="dashboard-quota-counter">
                {usage.unlimited ? (
                  <>Unlimited</>
                ) : (
                  <>
                    {usage.used} <span className="text-base font-medium text-[var(--c-muted-fg)]">/ {usage.limit} {formatQuotaCounterSuffix(usage)}</span>
                  </>
                )}
              </p>
              {!usage.unlimited && (
                <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
                  {usage.at_limit
                    ? "Maximum reached · deleting documents does not restore allowance"
                    : formatQuotaRemainingLine(usage)}
                  {" · "}Drafts and saved PDFs do not count
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!usage.unlimited && (usage.at_limit || usage.percent >= 80) && isOrgOwnerView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/contact")}
                  data-testid="dashboard-org-contact-button"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" /> Contact account team
                </Button>
              )}
              {!usage.unlimited && (usage.at_limit || usage.percent >= 80) && canUpgradePlan(usage) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (usage.at_limit ? openQuotaModal() : navigate("/settings?tab=subscription"))}
                  data-testid="dashboard-quota-upgrade"
                >
                  <Crown className="mr-1.5 h-3.5 w-3.5" /> {
                    usage.at_limit ? "Get more documents" : "Upgrade plan"
                  }
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
                      usage.at_limit || usage.percent >= 90 ? "#DC2626" :
                      usage.percent >= 70 ? "#F59E0B" : "var(--c-primary)",
                  }}
                  data-testid="dashboard-quota-bar"
                />
              </div>
              {(usage.at_limit || usage.percent >= 90) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {usage.at_limit
                    ? isOrgStaffView
                      ? ORG_STAFF_LIMIT_MESSAGE
                      : isOrgOwnerView
                        ? "Organisation limit reached. Contact your account team to review your contract."
                        : `${formatQuotaLimitReachedMessage({ includeDeleteNote: false })} Upgrade your plan or ${formatExtraDocumentLimitMessage()}.`
                    : isOrgStaffView
                      ? "You're nearing your allowance for this billing period."
                      : isOrgOwnerView
                        ? "You're nearing your organisation limit."
                        : formatQuotaNearLimitMessage()}
                </p>
              )}
            </div>
          )}
          <div className="mt-auto flex gap-2 pt-4">
            {canUpgradePlan(usage) && (
              <button
                type="button"
                onClick={() => navigate("/settings?tab=subscription")}
                className="flex-1 rounded-[10px] border border-[var(--c-border)] bg-[var(--c-portal-card)] py-2.5 text-center text-[12.5px] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
                data-testid="dashboard-quota-upgrade-footer"
              >
                Upgrade plan
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/usage")}
              className="flex-1 rounded-[10px] border border-[var(--c-border)] bg-[var(--c-paper-2)] py-2.5 text-center text-[12.5px] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
              data-testid="dashboard-usage-report"
            >
              Usage report
            </button>
          </div>
        </div>
        );
      })()}

      </div>

      {/* Your envelopes + status pills (Dashboard design) */}
      <div ref={envelopesSectionRef} className="mt-6 mb-3 flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Your envelopes</h3>
        <div
          className="flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px]"
          data-testid="envelope-status-filter"
        >
          {[
            ["all", "All", null],
            ["awaiting", "Awaiting", (statusCounts.sent || 0) + (statusCounts.viewed || 0)],
            ["completed", "Completed", statusCounts.completed || 0],
            ["draft", "Drafts", statusCounts.draft || 0],
            ["declined", "Declined", statusCounts.declined || 0],
          ].map(([id, label, count]) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => applyStatusFilter(id, { scroll: false })}
                data-testid={`envelope-filter-${id}`}
                aria-pressed={active}
                title={FILTER_HINTS[id]}
                className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
              >
                {label}
                {count != null && count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table / list */}
      <div className="cs-portal-surface-card mt-4 overflow-hidden rounded-xl" data-testid="envelope-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : envelopes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
              <Inbox className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
            </span>
            <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">
              {envelopeTotal === 0 && !debouncedQuery && statusFilter === "all" ? "No envelopes yet" : "No envelopes found"}
            </h3>
            <p className="mt-1 max-w-xs text-sm text-[var(--c-muted-fg)]">
              {envelopeTotal === 0 && !debouncedQuery && statusFilter === "all"
                ? "Upload a PDF or Word document to send your first document for signature."
                : "Try clearing your search or choosing a different status filter."}
            </p>
            {envelopeTotal === 0 && !debouncedQuery && statusFilter === "all" && (
              <Button onClick={startNewEnvelope} className="mt-5" data-testid="empty-new-envelope-button"
                style={{ background: "var(--c-primary)", color: "#fff" }}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> Send your first document
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] sm:grid">
              <div className="col-span-5">Document</div>
              <div className="col-span-2">Recipients</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1" />
            </div>
            {envelopes.map((e) => (
              <div key={e.envelope_id} data-testid="envelope-row"
                className="grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)] sm:grid-cols-12"
                onClick={() => openEnvelope(e)}>
                <div className="col-span-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                    <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{e.title}</p>
                    <p className="truncate text-xs text-[var(--c-muted-fg)]">{e.document?.page_count} page(s) · {e.document?.file_type?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  {(e.recipients || []).slice(0, 3).map((r, i) => (
                    <span
                      key={r.recipient_id || i}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--c-portal-card)] text-[10px] font-semibold text-white"
                      style={{ background: ["#14B8A6", "#FF7A5C", "#122120"][i % 3], marginLeft: i ? -7 : 0 }}
                      title={r.name || r.email}
                    >
                      {(r.name || r.email || "?").slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                  <span className={`text-xs text-[var(--c-muted-fg)] ${e.recipients?.length ? "ml-2" : ""}`}>
                    {e.recipients?.length
                      ? `${(e.recipients || []).filter((r) => r.signed_at).length} of ${e.recipients.length}`
                      : "not sent"}
                  </span>
                </div>
                <div className="col-span-2"><StatusBadge status={e.status} /></div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{fmtDate(e.updated_at)}</div>
                <div className="col-span-1 flex items-center justify-end gap-0.5" onClick={(ev) => ev.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openEnvelope(e)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--badge-teal-bg)]"
                    style={{ color: "var(--c-primary-hover)" }}
                  >
                    {e.status === "draft" ? "Continue" : "View"}
                  </button>
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
            <ListPagination
              page={page}
              total={envelopeTotal}
              pageSize={ENVELOPE_PAGE_SIZE}
              onPageChange={setPage}
              testId="dashboard-pagination"
            />
          </div>
        )}
      </div>

      <QuotaLimitModal
        open={quotaModal}
        onOpenChange={setQuotaModal}
        detail={quotaDetail}
        usage={usage}
      />
    </AppShell>
  );
}
