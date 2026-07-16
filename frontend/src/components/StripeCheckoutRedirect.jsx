import React from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BillingIntervalToggle } from "@/components/BillingIntervalToggle";
import { Button } from "@/components/ui/button";

/**
 * Full-screen handoff before Stripe Hosted Checkout — choose monthly or annual, then continue.
 */
export function StripeCheckoutRedirect({
  planLabel,
  priceLabel,
  billingInterval = "monthly",
  trialDays = 0,
  trialAlreadyRedeemed = false,
  onBillingIntervalChange,
  onContinue,
  continuing = false,
  preparing = false,
}) {
  const intervalNote = billingInterval === "yearly" ? "Annual billing · 2 months free" : "Monthly billing";
  const hasTrial = Number(trialDays) > 0;
  const canChangeInterval = typeof onBillingIntervalChange === "function";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--c-paper)] px-4"
      data-testid="stripe-checkout-redirect"
      role="alertdialog"
      aria-busy={preparing || continuing}
      aria-label="Choose billing and continue to secure checkout"
    >
      <div className="cs-auth-form-glow cs-auth-form-glow-a" aria-hidden />
      <div className="cs-auth-form-glow cs-auth-form-glow-b" aria-hidden />

      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--c-border)] bg-[var(--card)] shadow-[0_34px_80px_rgba(18,33,32,.18)]">
        <div
          className="px-6 py-5 text-white sm:px-8"
          style={{ background: "var(--c-ink-solid)" }}
        >
          <Logo to="/" dark className="mb-5" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Secure checkout</p>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            {planLabel || "Your plan"}
          </h1>
          {priceLabel && (
            <p className="mt-2 text-lg font-semibold text-[#2DD4BF]">{priceLabel}</p>
          )}
          <p className="mt-1 text-sm text-white/55">
            {hasTrial ? `${trialDays}-day free trial · ${intervalNote.toLowerCase()}` : intervalNote}
          </p>
        </div>

        <div className="space-y-4 px-6 py-8 sm:px-8">
          {canChangeInterval ? (
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--c-ink)]">Billing frequency</p>
              <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
                Switch between monthly and annual before you continue. Annual saves 2 months.
              </p>
              <BillingIntervalToggle
                className="mt-4 w-full justify-center"
                value={billingInterval}
                onChange={onBillingIntervalChange}
              />
            </div>
          ) : null}

          {preparing ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 text-sm text-[var(--c-ink)]">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: "var(--c-primary)" }} />
              <span>Updating your checkout…</span>
            </div>
          ) : null}

          {trialAlreadyRedeemed && !hasTrial ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950" data-testid="trial-already-redeemed-notice">
              You&apos;ve already redeemed your free trial on this account. Stripe will charge the normal plan price when your subscription starts.
            </p>
          ) : null}
          {hasTrial && (
            <p className="text-xs text-[var(--c-muted-fg)]">
              Card required. You will not be charged until your {trialDays}-day trial ends. After that, payment continues at your chosen plan price unless you cancel from Settings.
            </p>
          )}
          <p className="text-xs text-[var(--c-muted-fg)]">
            Have a promo code? You can enter it on the next screen before you pay.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--c-muted-fg)]">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Card details never touch our servers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Powered by Stripe
            </span>
          </div>

          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            style={{ background: "var(--c-primary)", color: "#fff" }}
            disabled={preparing || continuing || !onContinue}
            onClick={onContinue}
            data-testid="stripe-checkout-continue"
          >
            {continuing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening Stripe…
              </>
            ) : (
              "Continue to secure checkout"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}