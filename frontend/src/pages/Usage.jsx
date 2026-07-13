import React, { useCallback, useEffect, useState } from "react";
import { usePoll, POLL_FAST_MS } from "@/hooks/usePoll";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { assignStripeCheckout } from "@/lib/safeUrl";
import { AppShell } from "@/components/AppShell";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canUpgradePlan, purchaseOptionsForPlan } from "@/lib/quota";
import { formatExtraDocumentBuyLabel, formatExtraDocumentLimitMessage, formatExtraDocumentPrice } from "@/lib/pricing";
import {
  formatOrgPoolUsageLine,
  formatPlanAllowanceLabel,
  formatQuotaLimitReachedMessage,
  formatQuotaNearLimitMessage,
  formatQuotaResetSentence,
  QUOTA_SENT_ONLY_NOTE,
} from "@/lib/quotaDisplay";
import { ORG_STAFF_LIMIT_MESSAGE } from "@/lib/orgLabels";

import { Link } from "react-router-dom";
import { Crown, AlertTriangle, Building2, Users, ExternalLink } from "lucide-react";
import { RichTextWithContactEmail } from "@/components/BrandText";

export default function Usage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [quotaModal, setQuotaModal] = useState(false);
  const [buying, setBuying] = useState(false);

  const fetchUsage = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/usage", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      setUsage(data);
    } catch (err) {
      if (!silent) toast.error(formatApiError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  usePoll(() => fetchUsage(true), POLL_FAST_MS, { enabled: !quotaModal && !buying });

  if (loading || !usage) {
    return (
      <AppShell>
        <div className="mb-5">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-10 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-36 rounded-2xl" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </AppShell>
    );
  }

  const isOrg = usage.scope === "organization";
  const isOrgOwnerView = isOrg && usage.is_org_owner;
  const isOrgStaffView = isOrg && !usage.is_org_owner;
  const percent = Math.min(100, usage.percent || 0);
  const atLimit = usage.at_limit || (!usage.unlimited && usage.used >= usage.limit);
  const danger = !usage.unlimited && (atLimit || percent >= 90);
  const warn = !usage.unlimited && !atLimit && percent >= 70 && percent < 90;

  const buyDocument = async () => {
    setBuying(true);
    try {
      const { data } = await api.post("/billing/checkout-document", {
        origin_url: getAppOrigin(),
        quantity: 1,
      });
      if (data.url) assignStripeCheckout(data.url);
      else throw new Error("No checkout URL");
    } catch (err) {
      toast.error(formatApiError(err));
      setBuying(false);
    }
  };

  const barColor = danger ? "#DC2626" : warn ? "#F59E0B" : "var(--c-primary)";
  const borderColor = danger ? "#FCA5A5" : "var(--c-border)";

  const StatCard = ({ emoji, bg, label, value, sub, testId }) => (
    <div className="cs-portal-surface-card rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-sm" style={{ background: bg }}>{emoji}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{value}</p>
      {sub && <p className="mt-1 text-[11.5px] font-medium text-[var(--c-muted-fg)]">{sub}</p>}
    </div>
  );

  return (
    <AppShell>
      <div className="mb-5">
        <div
          style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
        >
          Billing & limits
        </div>
        <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
          Usage
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
        <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
          Only sent envelopes count toward your allowance — drafts and saved PDFs are free.
        </p>
      </div>

      {isOrg && usage.organization && (
        <div className="cs-portal-surface-card mb-4 rounded-2xl border-l-4 p-4" style={{ borderLeftColor: "var(--c-primary)" }} data-testid="usage-org-banner">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
              <Building2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">
                Organisation plan · {usage.organization.name}
              </p>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
                {isOrgStaffView ? (
                  <>
                    Your allowance: <strong className="text-[var(--c-ink)]">{usage.seat_used?.toLocaleString() ?? usage.used.toLocaleString()}</strong>
                    {" / "}{usage.seat_limit?.toLocaleString() ?? usage.limit.toLocaleString()} documents this billing period.
                  </>
                ) : (
                  <>
                    <strong className="text-[var(--c-ink)]">Custom seat allocation</strong> per your contract.
                    Your seat: <strong className="text-[var(--c-ink)]">{usage.seat_used?.toLocaleString() ?? usage.used.toLocaleString()}</strong>
                    {" / "}{usage.seat_limit?.toLocaleString() ?? usage.limit.toLocaleString()}.
                    {usage.org_used != null && (
                      <> Org pool: <strong className="text-[var(--c-ink)]">{usage.org_used.toLocaleString()}</strong>
                      {usage.org_unlimited ? "" : ` / ${usage.org_limit?.toLocaleString()}`}
                      {usage.organization.member_count > 1 && (
                        <> · <Users className="inline h-3.5 w-3.5" /> {usage.organization.member_count} seats</>
                      )}.</>
                    )}
                  </>
                )}
              </p>
              {isOrgOwnerView && usage.pricing_note && (
                <p className="mt-1 text-xs text-[var(--c-muted-fg)]">{usage.pricing_note}</p>
              )}
              <Link to="/organisation" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--c-primary)] hover:underline">
                Open organisation portal <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div
        className="cs-portal-surface-card overflow-hidden rounded-2xl p-5"
        style={{ borderColor: danger ? borderColor : undefined }}
        data-testid="usage-quota-card"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--c-portal-muted)]">
                {isOrg ? <Building2 className="h-4 w-4 text-[var(--c-primary)]" /> : <Crown className="h-4 w-4 text-[var(--c-primary)]" />}
              </span>
              <p className="font-heading text-xs font-semibold uppercase tracking-[0.06em] text-[var(--c-muted-fg)]">
                {isOrg ? "Your allowance" : "Document quota"}
              </p>
              <span className="rounded-full bg-[var(--c-portal-muted)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                {usage.month}
              </span>
              <span className="rounded-full bg-[var(--badge-teal-bg)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-teal-fg)]">
                {usage.plan} plan
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="font-heading text-2xl font-bold leading-none text-[var(--c-ink)] sm:text-[1.75rem]" data-testid="usage-counter">
                {usage.unlimited ? (
                  usage.enterprise_unlimited ? "Unlimited" : `${usage.used.toLocaleString()}`
                ) : (
                  <>
                    {usage.used.toLocaleString()}
                    <span className="text-base font-medium text-[var(--c-muted-fg)] sm:text-lg">
                      {" "}/ {usage.limit.toLocaleString()}
                    </span>
                  </>
                )}
              </p>
              {!usage.unlimited && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: danger ? "var(--c-danger-bg)" : warn ? "var(--c-warning-bg)" : "var(--badge-teal-bg)",
                    color: danger ? "var(--c-danger)" : warn ? "var(--c-warning)" : "var(--badge-teal-fg)",
                  }}
                >
                  {atLimit ? "Limit reached" : `${usage.remaining?.toLocaleString()} left`}
                </span>
              )}
            </div>

            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--c-muted-fg)]">
              {usage.quota_note && <span>{usage.quota_note} </span>}
              <span>{QUOTA_SENT_ONLY_NOTE} </span>
              {!usage.unlimited && (
                atLimit
                  ? "Maximum reached — deleting documents does not restore allowance."
                  : formatQuotaResetSentence(usage)
              )}
              {usage.fair_use && usage.hourly_burst_limit && !isOrg && (
                <> Burst cap: {usage.hourly_burst_limit}/hour.</>
              )}
              {usage.extra_document_credits > 0 && (
                <> <span className="font-medium text-[var(--c-primary)]">{usage.extra_document_credits} extra credit{usage.extra_document_credits !== 1 ? "s" : ""} available.</span></>
              )}
            </p>
            {isOrgOwnerView && usage.org_used != null && (
              <p className="mt-1 text-[11px] text-[var(--c-muted-fg)]">
                {formatOrgPoolUsageLine(usage)}
              </p>
            )}
          </div>

          {!usage.unlimited && (
            <div className="w-full shrink-0 lg:max-w-[220px]">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[var(--c-muted-fg)]">
                <span>{percent}% used</span>
                <span>{usage.resets_label || "Next cycle"}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-portal-muted)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%`, background: barColor }}
                  data-testid="usage-bar"
                />
              </div>
            </div>
          )}
        </div>

        {danger && (
          <div
            className="mt-4 rounded-lg border px-3 py-2.5"
            style={{
              borderColor: atLimit ? "#FECACA" : "#FDE68A",
              background: atLimit ? "var(--c-danger-bg)" : "var(--c-warning-bg)",
            }}
            data-testid="usage-danger-banner"
          >
            <p className="flex items-start gap-2 text-xs font-medium leading-relaxed" style={{ color: atLimit ? "var(--c-danger)" : "var(--c-warning)" }}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <RichTextWithContactEmail
                  text={
                    atLimit
                      ? isOrgStaffView
                        ? ORG_STAFF_LIMIT_MESSAGE
                        : isOrgOwnerView
                          ? "You've reached your organisation seat limit or the shared pool cap. Contact info@civicbot.co.uk to review your contract."
                          : `${formatQuotaLimitReachedMessage({ includeDeleteNote: false })} Upgrade your plan or ${formatExtraDocumentLimitMessage()}.`
                      : isOrgStaffView
                        ? "You're nearing your allowance for this billing period. Contact your organisation admin first."
                        : isOrgOwnerView
                          ? "You're nearing your seat or organisation pool limit. Contact info@civicbot.co.uk to discuss your contract."
                          : usage.fair_use
                            ? "You're nearing your included Business fair-use allocation. Contact info@civicbot.co.uk to raise your limit."
                            : formatQuotaNearLimitMessage()
                  }
                />
              </span>
            </p>
            {atLimit && !isOrg && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(usage.purchase_options?.upgrade_pro || usage.plan === "free") && (
                  <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => navigate("/settings?tab=subscription")} style={{ background: "var(--c-primary)", color: "#fff" }}>
                    Upgrade to Pro
                  </Button>
                )}
                {usage.plan === "pro" && (usage.purchase_options?.upgrade_business !== false) && (
                  <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => navigate("/contact")} style={{ background: "var(--c-primary)", color: "#fff" }}>
                    Talk to our team, Business
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={buyDocument} disabled={buying}>
                  {formatExtraDocumentBuyLabel()}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          testId="usage-stat-plan"
          emoji="👑"
          bg="var(--badge-teal-bg)"
          label="Current plan"
          value={isOrg ? "Organisation" : usage.plan}
          sub={formatPlanAllowanceLabel(usage) || "—"}
        />
        <StatCard
          testId="usage-stat-cycle"
          emoji="📅"
          bg="var(--badge-info-bg)"
          label="Billing cycle"
          value={usage.month}
          sub={usage.billing_cycle === "anniversary"
            ? `Resets ${usage.resets_label || "on signup anniversary"}`
            : `Resets ${usage.resets_label || "monthly"}`}
        />
        <StatCard
          testId="usage-stat-rate"
          emoji="📈"
          bg="var(--badge-coral-bg)"
          label="Used this cycle"
          value={usage.unlimited ? "—" : `${percent}%`}
          sub={isOrg
            ? `${usage.seat_used?.toLocaleString() ?? usage.used} / ${usage.seat_limit?.toLocaleString() ?? usage.limit} documents`
            : usage.unlimited
              ? "Unmetered usage"
              : `${usage.used} of ${usage.limit} documents`}
        />
      </div>

      <QuotaLimitModal
        open={quotaModal}
        onOpenChange={setQuotaModal}
        detail={{
          message: formatQuotaLimitReachedMessage(),
          plan: usage.plan,
          used: usage.used,
          limit: usage.limit,
          at_limit: atLimit,
          options: usage.purchase_options || purchaseOptionsForPlan(usage.plan, atLimit, usage.scope),
        }}
        usage={usage}
      />
    </AppShell>
  );
}
