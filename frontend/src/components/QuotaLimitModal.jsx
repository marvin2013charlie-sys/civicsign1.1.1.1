import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { assignStripeCheckout } from "@/lib/safeUrl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Building2, Crown, FileText, Loader2 } from "lucide-react";
import { RichTextWithContactEmail } from "@/components/BrandText";
import { formatExtraDocumentBuyLabel, formatProMonthlyShort } from "@/lib/pricing";
import { formatQuotaLimitReachedMessage, formatQuotaLimitReachedTitle } from "@/lib/quotaDisplay";
import { ORG_STAFF_ESCALATION_NOTE } from "@/lib/orgLabels";

export function QuotaLimitModal({ open, onOpenChange, detail, usage }) {
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);

  const scope = detail?.scope || usage?.scope || "user";
  const isOrgStaffView = scope === "organization"
    && (detail?.is_org_owner === false || usage?.is_org_owner === false);
  const options = isOrgStaffView ? {} : (detail?.options || usage?.purchase_options || {});
  const plan = detail?.plan || usage?.plan || "free";
  const used = detail?.used ?? usage?.used;
  const limit = detail?.limit ?? usage?.limit;
  const credits = usage?.extra_document_credits ?? 0;
  const showUpgradePro = Boolean(options.upgrade_pro);
  const showUpgradeBusiness = Boolean(options.upgrade_business);
  const showContact = Boolean(options.contact_support);
  const showBuyOne = Boolean(options.buy_single_document_gbp);

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
      toast.error(formatApiError(err) || "Could not start checkout");
      setBuying(false);
    }
  };

  const goUpgrade = (targetPlan) => {
    onOpenChange(false);
    navigate(`/settings?tab=subscription${targetPlan ? `&upgrade=${targetPlan}` : ""}`);
  };

  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const actionBtn =
    "box-border min-h-11 h-auto w-full max-w-full min-w-0 whitespace-normal rounded-xl px-4 py-2.5 text-sm font-medium leading-snug shadow-sm transition-colors [&_svg]:shrink-0";
  const primaryBtn = `${actionBtn} border-0 hover:opacity-95`;
  const secondaryBtn =
    `${actionBtn} border border-[var(--c-portal-border)] bg-[var(--c-portal-card)] text-[var(--c-ink)] hover:bg-[var(--c-portal-muted)]`;

  const ActionLabel = ({ icon: Icon, children }) => (
    <span className="inline-flex w-full min-w-0 items-center justify-center gap-2">
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span className="min-w-0 text-balance">{children}</span>
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="box-border w-full max-w-md gap-5 overflow-hidden border-[var(--c-portal-border)] bg-[var(--c-portal-card)] p-6 shadow-xl [&>*]:min-w-0"
        data-testid="quota-limit-modal"
      >
        <DialogHeader className="space-y-3 pr-8 text-left">
          <DialogTitle className="flex items-center gap-2.5 font-heading text-lg font-semibold text-[var(--c-ink)]">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" strokeWidth={2.25} />
            {formatQuotaLimitReachedTitle()}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="min-w-0 space-y-4 text-left text-sm leading-relaxed text-[var(--c-muted-fg)]">
              <p>
                {isOrgStaffView ? (
                  detail?.message || ORG_STAFF_ESCALATION_NOTE
                ) : (
                  <RichTextWithContactEmail
                    text={
                      detail?.message ||
                      formatQuotaLimitReachedMessage()
                    }
                  />
                )}
              </p>
              {limit > 0 && (
                <div className="box-border min-w-0 max-w-full overflow-hidden rounded-xl border border-rose-200/90 bg-rose-50 px-4 py-3.5">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                      Documents used
                    </p>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" strokeWidth={2.25} />
                  </div>
                  <p className="mt-1.5 font-heading text-[1.35rem] font-bold leading-none text-[var(--c-ink)]">
                    {used?.toLocaleString?.() ?? used}
                    <span className="text-base font-medium text-[var(--c-muted-fg)]">
                      {" "}/ {limit?.toLocaleString?.() ?? limit}
                    </span>
                  </p>
                  <div className="mt-3 h-2 min-w-0 max-w-full overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full max-w-full rounded-full bg-rose-500 transition-[width] duration-300"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                </div>
              )}
              {credits > 0 && (
                <p className="text-xs text-[var(--c-muted-fg)]">
                  You have <strong className="text-[var(--c-ink)]">{credits}</strong> extra document credit{credits !== 1 ? "s" : ""} available.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex w-full min-w-0 max-w-full flex-col gap-2.5 sm:flex-col sm:space-x-0">
          {isOrgStaffView && (
            <Button
              className={primaryBtn}
              style={{ background: "var(--c-primary)", color: "#fff" }}
              onClick={() => goUpgrade()}
              data-testid="quota-org-admin-button"
            >
              <ActionLabel icon={Building2}>View your allowance</ActionLabel>
            </Button>
          )}
          {showUpgradePro && (
            <Button
              className={primaryBtn}
              style={{ background: "var(--c-primary)", color: "#fff" }}
              onClick={() => goUpgrade("pro")}
              data-testid="quota-upgrade-pro-button"
            >
              <ActionLabel icon={Crown}>
                Upgrade to Pro, {formatProMonthlyShort()}
              </ActionLabel>
            </Button>
          )}
          {showUpgradeBusiness && (
            <Button
              className={showUpgradePro ? secondaryBtn : primaryBtn}
              variant={showUpgradePro ? "outline" : "default"}
              style={!showUpgradePro ? { background: "var(--c-primary)", color: "#fff" } : undefined}
              onClick={() => goUpgrade("business")}
              data-testid="quota-upgrade-business-button"
            >
              <ActionLabel icon={Building2}>Upgrade to Business</ActionLabel>
            </Button>
          )}
          {showBuyOne && (
            <Button
              variant={showUpgradePro || showUpgradeBusiness ? "outline" : "default"}
              className={showUpgradePro || showUpgradeBusiness ? secondaryBtn : primaryBtn}
              disabled={buying}
              onClick={buyDocument}
              data-testid="quota-buy-document-button"
              style={!(showUpgradePro || showUpgradeBusiness) ? { background: "var(--c-primary)", color: "#fff" } : undefined}
            >
              {buying ? (
                <span className="inline-flex w-full items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Please wait…</span>
                </span>
              ) : (
                <ActionLabel icon={FileText}>{formatExtraDocumentBuyLabel()}</ActionLabel>
              )}
            </Button>
          )}
          {showContact && !showBuyOne && (
            <Button className={primaryBtn} onClick={() => goUpgrade()}>
              <ActionLabel>Contact support to raise your limit</ActionLabel>
            </Button>
          )}
          <Button
            variant="ghost"
            className="box-border h-9 w-full max-w-full min-w-0 rounded-lg text-sm font-medium text-[var(--c-muted-fg)] hover:bg-transparent hover:text-[var(--c-ink)]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}