import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown, FileText, Loader2, Sparkles } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { assignStripeCheckout } from "@/lib/safeUrl";
import { formatExtraDocumentPrice, formatFreePlanPortalLabel, PRO_MONTHLY_GBP } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Top-right subscription actions for self-serve accounts (especially Free plan).
 * Lets users upgrade or buy a pay-as-you-go document without hunting through Settings.
 */
/** Pages that already surface plan upgrades / pay-as-you-go — skip duplicate header chrome. */
function headerSubscriptionHidden(pathname, search) {
  if (pathname === "/usage" || pathname === "/new") return true;
  if (pathname === "/settings" && new URLSearchParams(search).get("tab") === "subscription") {
    return true;
  }
  return false;
}

export function PortalSubscriptionActions({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = useState(false);

  if (!user || user === false || user.org_id) return null;
  if (headerSubscriptionHidden(location.pathname, location.search)) return null;

  const plan = (user.plan || "free").toLowerCase();
  if (plan !== "free") return null;

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

  const goSubscription = () => navigate("/settings?tab=subscription");

  return (
    <div className="flex items-center gap-1.5" data-testid="portal-subscription-actions">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            data-testid="header-subscription-menu"
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            <Crown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Subscription</span>
            <span className="sm:hidden">Plans</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-[var(--c-muted-fg)]">
            {formatFreePlanPortalLabel()}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={goSubscription} data-testid="header-upgrade-pro-item">
            <Crown className="mr-2 h-4 w-4" style={{ color: "var(--c-primary)" }} />
            Upgrade to Pro — £{PRO_MONTHLY_GBP}/mo excl. VAT
          </DropdownMenuItem>
          <DropdownMenuItem onClick={buyDocument} disabled={buying} data-testid="header-buy-document-item">
            {buying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" style={{ color: "var(--c-primary)" }} />
            )}
            Buy 1 document — {formatExtraDocumentPrice({ includeTaxNote: true })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={goSubscription} data-testid="header-all-plans-item">
            <Sparkles className="mr-2 h-4 w-4" style={{ color: "var(--c-primary)" }} />
            Compare all plans
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}