import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
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

export function QuotaLimitModal({ open, onOpenChange, detail, usage }) {
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);

  const options = detail?.options || usage?.purchase_options || {};
  const plan = detail?.plan || usage?.plan || "free";
  const used = detail?.used ?? usage?.used;
  const limit = detail?.limit ?? usage?.limit;
  const atLimit = detail?.at_limit ?? usage?.at_limit ?? (limit > 0 && used >= limit);
  const credits = usage?.extra_document_credits ?? 0;
  const showUpgradePro = Boolean(options.upgrade_pro);
  const showUpgradeBusiness = Boolean(options.upgrade_business);
  const showContact = Boolean(options.contact_support);
  const showBuyOne = Boolean(options.buy_single_document_gbp);
  const buyPrice = options.buy_single_document_gbp ?? 0.8;

  const buyDocument = async () => {
    setBuying(true);
    try {
      const { data } = await api.post("/billing/checkout-document", {
        origin_url: window.location.origin,
        quantity: 1,
      });
      if (data.url) window.location.assign(data.url);
      else throw new Error("No checkout URL");
    } catch (err) {
      toast.error(formatApiError(err) || "Could not start checkout");
      setBuying(false);
    }
  };

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="quota-limit-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            Monthly limit reached
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left text-sm text-[var(--c-muted-fg)]">
              <p>
                <RichTextWithContactEmail
                  text={
                    detail?.message ||
                    `You've used all documents on your ${planLabel} plan this month. Deleting sent or signed envelopes does not restore your allowance.`
                  }
                />
              </p>
              {limit > 0 && (
                <p className="font-medium text-[var(--c-ink)]">
                  {used?.toLocaleString?.() ?? used} / {limit?.toLocaleString?.() ?? limit} documents used
                </p>
              )}
              {credits > 0 && (
                <p className="text-xs">
                  You have <strong>{credits}</strong> extra document credit{credits !== 1 ? "s" : ""} available.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {showUpgradePro && (
            <Button
              className="w-full"
              style={{ background: "var(--c-primary)", color: "#fff" }}
              onClick={() => {
                onOpenChange(false);
                navigate("/settings?tab=subscription");
              }}
              data-testid="quota-upgrade-pro-button"
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Pro, £{options.upgrade_pro_amount_gbp ?? 15}/month
            </Button>
          )}
          {showUpgradeBusiness && (
            <Button
              className="w-full"
              style={{ background: "var(--c-primary)", color: "#fff" }}
              onClick={() => {
                onOpenChange(false);
                navigate("/contact");
              }}
              data-testid="quota-upgrade-business-button"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Talk to our team, Business plan
            </Button>
          )}
          {showBuyOne && (
            <Button
              variant={showUpgradePro || showUpgradeBusiness ? "outline" : "default"}
              className="w-full"
              disabled={buying}
              onClick={buyDocument}
              data-testid="quota-buy-document-button"
              style={!(showUpgradePro || showUpgradeBusiness) ? { background: "var(--c-primary)", color: "#fff" } : undefined}
            >
              {buying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Buy 1 extra document, £{buyPrice.toFixed(2)}
            </Button>
          )}
          {showContact && !showBuyOne && (
            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                navigate("/contact");
              }}
            >
              Contact support to raise your limit
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}