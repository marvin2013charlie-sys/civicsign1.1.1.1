import React from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

/**
 * Full-screen handoff while redirecting to Stripe Hosted Checkout.
 * Emergent-style polish before the secure payment page loads.
 */
export function StripeCheckoutRedirect({ planLabel, priceLabel, billingInterval = "monthly" }) {
  const intervalNote = billingInterval === "yearly" ? "Annual billing · 2 months free" : "Monthly billing";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--c-paper)] px-4"
      data-testid="stripe-checkout-redirect"
      role="alertdialog"
      aria-busy="true"
      aria-label="Redirecting to secure checkout"
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
          <p className="mt-1 text-sm text-white/55">{intervalNote}</p>
        </div>

        <div className="space-y-4 px-6 py-8 sm:px-8">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 text-sm text-[var(--c-ink)]">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: "var(--c-primary)" }} />
            <span>Taking you to Stripe to pay securely…</span>
          </div>
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
        </div>
      </div>
    </div>
  );
}