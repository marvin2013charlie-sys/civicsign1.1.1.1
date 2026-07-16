import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check, Sparkles, Zap } from "lucide-react";
import { PlanPriceBreakdown, PricingVatFootnote } from "@/components/PlanPriceBreakdown";
import { buildPricingPlans, PRICING_COMPARISON_ROWS } from "@/lib/pricingPlans";
import {
  formatFreePlanSignupPitch,
  formatPlanTrialPriceLabel,
  formatSubscriptionTrialPitch,
  getPlanPriceDisplay,
  isPaidPlanWithTrial,
  SUBSCRIPTION_TRIAL_DAYS_DEFAULT,
} from "@/lib/pricing";
import { buildPlanCtaPath } from "@/lib/planCheckout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { H_FONT, INK, MARKETING_CARD, PAPER_TEXT } from "@/lib/marketingUi";

const PLAN_ICONS = {
  Free: Sparkles,
  Pro: Zap,
  Business: Building2,
};

function CompareCell({ value }) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4" style={{ color: "var(--c-primary)" }} aria-label="Included" />;
  }
  if (value === false) {
    return <span className="text-[var(--c-muted-fg)]" aria-label="Not included">—</span>;
  }
  return <span className="text-xs font-semibold text-[var(--c-ink)]">{value}</span>;
}

function PlanCard({ plan, billingInterval, ctaTo, trialDays }) {
  const hot = plan.highlight;
  const Icon = PLAN_ICONS[plan.name] || Sparkles;
  const display = getPlanPriceDisplay(plan.name, billingInterval);
  const trialPriceLabel = formatPlanTrialPriceLabel(plan.name, billingInterval, trialDays);
  const showTrial = Boolean(trialPriceLabel && isPaidPlanWithTrial(plan.name));

  return (
    <div
      data-testid={`landing-plan-${plan.name.toLowerCase()}`}
      className={`relative flex flex-col rounded-[22px] border p-7 sm:p-8 ${hot ? "md:-mt-3 md:scale-[1.02]" : ""}`}
      style={
        hot
          ? {
              background: INK,
              color: PAPER_TEXT,
              borderColor: INK,
              boxShadow: "0 28px 64px rgba(18,33,32,.28)",
            }
          : {
              background: "var(--card)",
              color: "var(--c-ink)",
              borderColor: "var(--c-border)",
            }
      }
    >
      {hot && (
        <span
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white"
          style={{ background: "#FF7A5C", boxShadow: "0 4px 14px rgba(255,122,92,.35)" }}
        >
          Most popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold" style={H_FONT}>
            {plan.name}
          </div>
          <p className="mt-1 text-[13px]" style={{ color: hot ? "rgba(248,247,242,.65)" : "var(--c-muted-fg)" }}>
            {plan.tag}
          </p>
        </div>
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
          style={{
            background: hot ? "rgba(45,212,191,.16)" : plan.accent === "coral" ? "var(--badge-coral-bg)" : "var(--badge-teal-bg)",
          }}
        >
          <Icon className="h-5 w-5" style={{ color: hot ? "#2DD4BF" : "var(--c-primary)" }} />
        </span>
      </div>

      <div className="mt-5">
        {showTrial ? (
          <div className="mb-3">
            <div
              className="font-heading text-[2.75rem] font-bold leading-none tracking-[-0.03em]"
              style={{ color: hot ? "#2DD4BF" : "var(--c-primary)" }}
            >
              £0
            </div>
            <p className="mt-1 text-[13px] font-medium" style={{ color: hot ? "rgba(248,247,242,.82)" : "var(--c-ink)" }}>
              {trialPriceLabel}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: hot ? "rgba(248,247,242,.55)" : "var(--c-muted-fg)" }}>
              {display.price} {display.note}
              {display.savings ? ` · ${display.savings}` : ""}
            </p>
          </div>
        ) : null}
        <PlanPriceBreakdown
          price={showTrial ? null : display.price}
          note={showTrial ? null : display.note}
          savings={showTrial ? null : display.savings}
          tax={display.tax}
          compact={hot}
          priceClassName={`font-heading text-[2.75rem] font-bold tracking-[-0.03em] leading-none ${
            hot ? "text-white" : "text-[var(--c-ink)]"
          }`}
          noteClassName={`text-[13px] ${hot ? "text-white/60" : "text-[var(--c-muted-fg)]"}`}
        />
      </div>

      <div className="my-5 h-px" style={{ background: hot ? "rgba(248,247,242,.12)" : "var(--c-border)" }} />

      <ul className="flex flex-1 flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm leading-snug">
            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#2DD4BF" }} />
            <span style={{ color: hot ? "rgba(248,247,242,.9)" : "var(--c-ink)" }}>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to={ctaTo}
        data-testid={plan.name === "Free" ? "cta-getstarted-button" : `pricing-cta-${plan.name.toLowerCase()}`}
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-center text-[14px] font-semibold transition-all hover:-translate-y-px"
        style={
          hot
            ? { background: "#2DD4BF", color: "#122120", boxShadow: "0 10px 24px rgba(45,212,191,.28)" }
            : { background: INK, color: "#fff" }
        }
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * Redesigned pricing plans grid — used on /pricing and landing #pricing.
 */
export function PricingPlansSection({
  id = "pricing",
  showHeader = true,
  showComparison = true,
  className = "",
  embedded = false,
}) {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [trialDays, setTrialDays] = useState(SUBSCRIPTION_TRIAL_DAYS_DEFAULT);
  const [trialAlreadyRedeemed, setTrialAlreadyRedeemed] = useState(false);
  const effectiveTrialDays = user?.subscription_trial_used || trialAlreadyRedeemed ? 0 : trialDays;
  const plans = buildPricingPlans(billingInterval, effectiveTrialDays);
  const trialPitch = formatSubscriptionTrialPitch(effectiveTrialDays);

  useEffect(() => {
    let cancelled = false;
    api.get("/billing/config")
      .then(({ data }) => {
        if (cancelled) return;
        const days = data?.subscription_trial_enabled ? Number(data.subscription_trial_days) || 0 : 0;
        setTrialDays(days > 0 ? days : 0);
      })
      .catch(() => {
        if (!cancelled) setTrialDays(SUBSCRIPTION_TRIAL_DAYS_DEFAULT);
      });
    if (user) {
      api.get("/billing/trial-status")
        .then(({ data }) => {
          if (cancelled) return;
          setTrialAlreadyRedeemed(Boolean(data?.trial_already_redeemed));
        })
        .catch(() => { /* non-fatal */ });
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section
      id={id}
      className={`scroll-mt-header ${embedded ? "" : "mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"} ${className}`}
      data-testid="pricing-section"
    >
      {showHeader && (
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Pricing</p>
          <div
            className="mt-4"
            style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            No surprises. Try before you pay.
          </div>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl lg:text-[42px]" style={H_FONT}>
            Simple, honest pricing<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            {formatFreePlanSignupPitch()}. {trialPitch || "Upgrade when you grow."} Extra documents from 80p excl. VAT when you run over.
          </p>

          <div className="mt-7 flex w-full max-w-md flex-col gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-1 shadow-sm sm:mx-auto sm:inline-flex sm:w-auto sm:flex-row sm:rounded-full sm:p-[4px]">
            {[["monthly", "Monthly"], ["yearly", "Annual — 2 months free", "Annual (2 mo. free)"]].map(([val, label, shortLabel]) => {
              const active = billingInterval === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBillingInterval(val)}
                  data-testid={`billing-toggle-${val}`}
                  className="min-h-[44px] rounded-full px-4 py-2.5 text-xs font-semibold transition-all sm:px-5 sm:py-2 sm:text-[13px]"
                  style={active ? { background: INK, color: "#fff" } : { color: "var(--c-muted-fg)" }}
                >
                  <span className="sm:hidden">{shortLabel || label}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`grid items-stretch gap-5 lg:gap-6 ${showHeader ? "mt-12" : "mt-0"} md:grid-cols-3`}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            billingInterval={billingInterval}
            ctaTo={buildPlanCtaPath(plan.name, billingInterval, user || null)}
            trialDays={effectiveTrialDays}
          />
        ))}
      </div>

      {user && trialAlreadyRedeemed && trialDays > 0 ? (
        <p className="mt-6 text-center text-sm text-[var(--c-muted-fg)]" data-testid="pricing-trial-redeemed-note">
          Signed in as <span className="font-medium text-[var(--c-ink)]">{user.email}</span> — your free trial has already been used on this account.
        </p>
      ) : null}

      {showComparison && (
        <div className={`${MARKETING_CARD} mt-8 overflow-hidden p-0`} data-testid="pricing-comparison-table">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-4">
            <h3 className="font-heading text-base font-semibold text-[var(--c-ink)]">Compare plans at a glance</h3>
          </div>
          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">
                  <th className="px-5 py-3 font-semibold">Feature</th>
                  <th className="px-4 py-3 text-center">Free</th>
                  <th className="px-4 py-3 text-center">Pro</th>
                  <th className="px-4 py-3 text-center">Business</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-5 py-3.5 font-medium text-[var(--c-ink)]">{row.label}</td>
                    <td className="px-4 py-3.5 text-center"><CompareCell value={row.free} /></td>
                    <td className="px-4 py-3.5 text-center"><CompareCell value={row.pro} /></td>
                    <td className="px-4 py-3.5 text-center"><CompareCell value={row.business} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className={`${MARKETING_CARD} mt-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center`}
        data-testid="pricing-organisation-card"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Enterprise</p>
          <h3 className="mt-1 font-heading text-xl font-bold text-[var(--c-ink)]">Organisation plan</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--c-muted-fg)]">
            Custom multi-seat contracts with tailored document pools, onboarding, and dedicated support for banks and larger teams.
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex shrink-0 items-center gap-2 rounded-[14px] border border-[var(--c-border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
        >
          Contact sales <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 text-center">
        <PricingVatFootnote />
      </div>
    </section>
  );
}