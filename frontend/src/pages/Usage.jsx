import React, { useCallback, useEffect, useState } from "react";
import { usePoll, POLL_FAST_MS } from "@/hooks/usePoll";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { AppShell } from "@/components/AppShell";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { purchaseOptionsForPlan } from "@/lib/quota";
import { formatExtraDocumentBuyLabel, formatExtraDocumentLimitMessage, formatExtraDocumentPrice } from "@/lib/pricing";
import { ORG_STAFF_LIMIT_MESSAGE } from "@/lib/orgLabels";

import { Link } from "react-router-dom";
import { Crown, AlertTriangle, Calendar, TrendingUp, CheckCircle2, Building2, Users, FileText, ExternalLink } from "lucide-react";
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
      <AppShell title="Usage">
        <Skeleton className="h-40 rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
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
      if (data.url) window.location.assign(data.url);
      else throw new Error("No checkout URL");
    } catch (err) {
      toast.error(formatApiError(err));
      setBuying(false);
    }
  };

  const barColor = danger ? "#DC2626" : warn ? "#F59E0B" : "var(--c-primary)";
  const borderColor = danger ? "#FCA5A5" : "var(--c-border)";

  return (
    <AppShell
      title="Usage"
      actions={
        !usage.unlimited && (
          <div className="flex flex-wrap gap-2">
            {atLimit && !isOrg && (
              <Button variant="outline" onClick={buyDocument} disabled={buying} data-testid="usage-buy-document-button">
                <FileText className="mr-1.5 h-4 w-4" /> Buy 1 doc ({formatExtraDocumentPrice({ includeTaxNote: true })})
              </Button>
            )}
            {!isOrgStaffView && (
              <Button
                onClick={() => (isOrgOwnerView ? window.location.assign("/contact") : atLimit ? setQuotaModal(true) : navigate("/settings?tab=subscription"))}
                data-testid="usage-upgrade-button"
                style={{ background: "var(--c-primary)", color: "#fff" }}
              >
                <Crown className="mr-1.5 h-4 w-4" /> {isOrgOwnerView ? "Contact account team" : atLimit ? "Get more documents" : "Upgrade plan"}
              </Button>
            )}
          </div>
        )
      }
    >
      {isOrg && usage.organization && (
        <div className="mb-4 rounded-xl border border-[var(--c-primary)]/30 bg-[var(--c-primary)]/5 p-4" data-testid="usage-org-banner">
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
        className="rounded-xl border bg-[var(--card)] p-6"
        style={{ borderColor }}
        data-testid="usage-quota-card"
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
                {usage.plan} plan
              </span>
            </div>
            <p className="mt-2 font-heading text-4xl font-bold text-[var(--c-ink)]" data-testid="usage-counter">
              {usage.unlimited ? (
                usage.enterprise_unlimited ? "Unlimited" : `${usage.used.toLocaleString()}`
              ) : (
                <>
                  {usage.used.toLocaleString()}{" "}
                  <span className="text-xl font-medium text-[var(--c-muted-fg)]">/ {usage.limit.toLocaleString()}</span>
                </>
              )}
            </p>
            {usage.quota_note && (
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">{usage.quota_note}</p>
            )}
            {!usage.unlimited && (
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
                {atLimit
                  ? "Maximum reached · deleting documents does not restore allowance"
                  : `${usage.remaining?.toLocaleString()} remaining · resets ${usage.resets_label || "next billing cycle"}`}
              </p>
            )}
            {usage.extra_document_credits > 0 && (
              <p className="mt-1 text-xs font-medium text-[var(--c-primary)]">
                {usage.extra_document_credits} extra document credit{usage.extra_document_credits !== 1 ? "s" : ""} available
              </p>
            )}
            {isOrgOwnerView && usage.org_used != null && (
              <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
                Organisation pool total: {usage.org_used.toLocaleString()} documents this month
                {!usage.org_unlimited && usage.org_limit ? ` (cap ${usage.org_limit.toLocaleString()})` : ""}
              </p>
            )}
            {usage.fair_use && usage.hourly_burst_limit && !isOrg && (
              <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
                Burst protection: {usage.hourly_burst_limit} documents per hour max
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
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--c-muted-fg)]">
              <span>{percent}% used</span>
              <span>Resets {usage.resets_label || usage.month}</span>
            </div>
            {danger && (
              <div className="mt-3 space-y-2" data-testid="usage-danger-banner">
                <p className="flex items-center gap-1.5 text-sm font-medium text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <RichTextWithContactEmail
                      text={
                        atLimit
                          ? isOrgStaffView
                            ? ORG_STAFF_LIMIT_MESSAGE
                            : isOrgOwnerView
                              ? "You've reached your organisation seat limit or the shared pool cap. Contact info@civicbot.co.uk to review your contract."
                              : `You've reached your monthly document limit. Upgrade your plan or ${formatExtraDocumentLimitMessage()}.`
                          : isOrgStaffView
                            ? "You're nearing your monthly allowance. Contact your organisation admin first."
                            : isOrgOwnerView
                              ? "You're nearing your seat or organisation pool limit. Contact info@civicbot.co.uk to discuss your contract."
                              : usage.fair_use
                                ? "You're nearing your included Business fair-use allocation. Contact info@civicbot.co.uk to raise your limit."
                                : "You're almost out of envelopes this month. Upgrade to keep sending."
                      }
                    />
                  </span>
                </p>
                {atLimit && !isOrg && (
                  <div className="flex flex-wrap gap-2">
                    {(usage.purchase_options?.upgrade_pro || usage.plan === "free") && (
                      <Button size="sm" onClick={() => navigate("/settings?tab=subscription")} style={{ background: "var(--c-primary)", color: "#fff" }}>
                        Upgrade to Pro
                      </Button>
                    )}
                    {usage.plan === "pro" && (usage.purchase_options?.upgrade_business !== false) && (
                      <Button size="sm" onClick={() => navigate("/contact")} style={{ background: "var(--c-primary)", color: "#fff" }}>
                        Talk to our team, Business
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={buyDocument} disabled={buying}>
                      {formatExtraDocumentBuyLabel()}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="usage-stat-plan">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Current plan</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#14B8A622" }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-bold capitalize text-[var(--c-ink)]">{isOrg ? "Organisation" : usage.plan}</p>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
            {isOrg
              ? `${usage.seat_limit?.toLocaleString() ?? usage.limit} docs/month (your allowance)`
              : usage.unlimited
                ? "Unlimited envelopes"
                : `${usage.limit} envelopes / month`}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="usage-stat-cycle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Billing cycle</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#0284C722" }}>
              <Calendar className="h-4 w-4" style={{ color: "#0284C7" }} />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-bold text-[var(--c-ink)]">{usage.month}</p>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
            {usage.billing_cycle === "anniversary"
              ? `Resets ${usage.resets_label || "on your signup anniversary"}`
              : `Resets ${usage.resets_label || "monthly"}`}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="usage-stat-rate">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Used this cycle</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#FF7A5C22" }}>
              <TrendingUp className="h-4 w-4" style={{ color: "#FF7A5C" }} />
            </span>
          </div>
          <p className="mt-2 font-heading text-xl font-bold text-[var(--c-ink)]">
            {usage.unlimited ? "—" : `${percent}%`}
          </p>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
            {isOrg
              ? `Seat: ${usage.seat_used?.toLocaleString() ?? usage.used} / ${usage.seat_limit?.toLocaleString() ?? usage.limit}`
              : usage.unlimited
                ? "Unmetered usage"
                : `${usage.used} of ${usage.limit} envelopes`}
          </p>
        </div>
      </div>

      <QuotaLimitModal
        open={quotaModal}
        onOpenChange={setQuotaModal}
        detail={{
          message: "You've reached your monthly document limit. Deleting envelopes does not restore your allowance.",
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
