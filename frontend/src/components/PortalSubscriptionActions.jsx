import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown, FileText, Loader2, Sparkles } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { formatExtraDocumentPrice, PRO_MONTHLY_GBP } from "@/lib/pricing";
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
export function PortalSubscriptionActions({ user }) {
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);

  if (!user || user === false || user.org_id) return null;

  const plan = (user.plan || "free").toLowerCase();
  if (plan !== "free") return null;

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

  const goSubscription = () => navigate("/settings?tab=subscription");

  return (
    <div className="flex items-center gap-1.5" data-testid="portal-subscription-actions">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={buying}
        onClick={buyDocument}
        data-testid="header-buy-document-button"
        className="hidden h-9 gap-1.5 rounded-xl border-[var(--c-border)] bg-[var(--card)] text-xs font-semibold sm:inline-flex"
      >
        {buying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        <span className="hidden md:inline">Buy 1 doc</span>
        <span>{formatExtraDocumentPrice()}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            data-testid="header-subscription-menu"
            className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            <Crown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Subscription</span>
            <span className="sm:hidden">Plans</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-[var(--c-muted-fg)]">
            Free plan · 2 documents / month
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={goSubscription} data-testid="header-upgrade-pro-item">
            <Crown className="mr-2 h-4 w-4" style={{ color: "var(--c-primary)" }} />
            Upgrade to Pro — £{PRO_MONTHLY_GBP}/mo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={buyDocument} disabled={buying} data-testid="header-buy-document-item">
            {buying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" style={{ color: "var(--c-primary)" }} />
            )}
            Buy 1 document — {formatExtraDocumentPrice()}
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