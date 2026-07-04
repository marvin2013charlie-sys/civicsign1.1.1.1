import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, AlertTriangle, Calendar, TrendingUp, CheckCircle2 } from "lucide-react";

export default function Usage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/usage");
        setUsage(data);
      } catch (err) {
        toast.error(formatApiError(err.response?.data?.detail));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !usage) {
    return (
      <AppShell title="Usage">
        <Skeleton className="h-40 rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  const percent = Math.min(100, usage.percent || 0);
  const danger = !usage.unlimited && percent >= 90;
  const warn = !usage.unlimited && percent >= 70 && percent < 90;

  const barColor = danger ? "#DC2626" : warn ? "#F59E0B" : "var(--c-primary)";
  const borderColor = danger ? "#FCA5A5" : "var(--c-border)";

  return (
    <AppShell
      title="Usage"
      actions={
        !usage.unlimited && (
          <Button onClick={() => navigate("/settings?tab=subscription")} data-testid="usage-upgrade-button"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            <Crown className="mr-1.5 h-4 w-4" /> Upgrade plan
          </Button>
        )
      }
    >
      <div
        className="rounded-xl border bg-[var(--card)] p-6"
        style={{ borderColor }}
        data-testid="usage-quota-card"
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
            <p className="mt-2 font-heading text-4xl font-bold text-[var(--c-ink)]" data-testid="usage-counter">
              {usage.unlimited ? (
                "Unlimited"
              ) : (
                <>
                  {usage.used} <span className="text-xl font-medium text-[var(--muted-foreground)]">/ {usage.limit}</span>
                </>
              )}
            </p>
            {!usage.unlimited && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {usage.remaining} remaining · resets on the 1st of next month
              </p>
            )}
          </div>
        </div>

        {!usage.unlimited && (
          <div className="mt-5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--c-paper-2)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, background: barColor }}
                data-testid="usage-bar"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>{percent}% used</span>
              <span>Resets {usage.month}</span>
            </div>
            {danger && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-rose-700" data-testid="usage-danger-banner">
                <AlertTriangle className="h-4 w-4" /> You&rsquo;re almost out of envelopes this month. Upgrade to keep sending.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="usage-stat-plan">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Current plan</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#14B8A622" }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-bold capitalize text-[var(--c-ink)]">{usage.plan}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {usage.unlimited ? "Unlimited envelopes" : `${usage.limit} envelopes / month`}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="usage-stat-cycle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Billing cycle</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#0284C722" }}>
              <Calendar className="h-4 w-4" style={{ color: "#0284C7" }} />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-bold text-[var(--c-ink)]">{usage.month}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Counter resets on the 1st</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="usage-stat-rate">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Used this cycle</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#FF7A5C22" }}>
              <TrendingUp className="h-4 w-4" style={{ color: "#FF7A5C" }} />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-bold text-[var(--c-ink)]">
            {usage.unlimited ? "—" : `${percent}%`}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {usage.unlimited ? "Unmetered usage" : `${usage.used} of ${usage.limit} envelopes`}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
