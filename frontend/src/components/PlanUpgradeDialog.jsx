import React from "react";
import { Loader2, ArrowUpRight, BadgePercent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function fmtMoney(amount, currency = "gbp") {
  const sym = currency.toLowerCase() === "gbp" ? "£" : "";
  return `${sym}${Number(amount || 0).toFixed(2)}`;
}

/**
 * Confirms a prorated mid-cycle upgrade (e.g. Pro → Business) with credit for unused time.
 */
export function PlanUpgradeDialog({
  open,
  onOpenChange,
  preview,
  confirming,
  onConfirm,
}) {
  if (!preview) return null;

  const {
    current_plan_name: fromName,
    target_plan_name: toName,
    credit = 0,
    charge = 0,
    amount_due: amountDue = 0,
    currency = "gbp",
    requires_payment: requiresPayment,
    renewal_amount_inc_vat: renewalIncVat,
    current_interval: fromInterval,
    target_interval: toInterval,
  } = preview;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!confirming) onOpenChange(next); }}>
      <DialogContent className="max-w-md" data-testid="plan-upgrade-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <ArrowUpRight className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
            Upgrade to {toName}
          </DialogTitle>
          <DialogDescription>
            You&apos;re moving from {fromName} ({fromInterval}) to {toName} ({toInterval}) mid billing cycle.
            Unused {fromName} time is credited automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] p-4 text-sm">
          {credit > 0 && (
            <div className="flex items-center justify-between text-emerald-700">
              <span className="inline-flex items-center gap-1.5">
                <BadgePercent className="h-4 w-4" />
                Credit for unused {fromName} time
              </span>
              <span className="font-semibold">−{fmtMoney(credit, currency)}</span>
            </div>
          )}
          {charge > 0 && (
            <div className="flex items-center justify-between text-[var(--c-ink)]">
              <span>{toName} for the rest of this cycle</span>
              <span className="font-semibold">{fmtMoney(charge, currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-3 font-semibold text-[var(--c-ink)]">
            <span>{requiresPayment ? "Pay today" : "Due today"}</span>
            <span className="text-lg" style={{ color: "var(--c-primary)" }}>
              {fmtMoney(amountDue, currency)}
            </span>
          </div>
          {renewalIncVat > 0 && (
            <p className="pt-1 text-xs text-[var(--c-muted-fg)]">
              Then {fmtMoney(renewalIncVat, currency)} per {toInterval === "yearly" ? "year" : "month"} incl. VAT at renewal.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            disabled={confirming}
            onClick={onConfirm}
            data-testid="plan-upgrade-confirm"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            {confirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {requiresPayment
              ? `Pay ${fmtMoney(amountDue, currency)} and upgrade`
              : `Confirm upgrade to ${toName}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}