import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CreditCard, Gift, ShieldCheck } from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection } from "@/components/MarketingDarkBand";
import { PricingPlansSection } from "@/components/PricingPlansSection";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { PRICING_FAQS } from "@/lib/pricingPlans";
import api from "@/lib/api";
import { formatFreePlanSignupPitch, formatSubscriptionTrialPitch, SUBSCRIPTION_TRIAL_DAYS_DEFAULT } from "@/lib/pricing";
import {
  CTA_ACTIONS_CLASS,
  CTA_HEADLINE_CLASS,
  CTA_PRIMARY_BTN,
  CTA_PRIMARY_BTN_STYLE,
  CTA_SCRIPT_STYLE,
  CTA_SECONDARY_BTN,
  CTA_SECTION,
  CTA_SUBTEXT_CLASS,
  H_FONT,
  INK,
  PAPER_TEXT,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

const INCLUDED_EVERY_PLAN = [
  "UK-hosted & UK GDPR aligned",
  "Tamper-evident audit trail on every envelope",
  "Certificate of Completion appended to signed PDFs",
  "Signers complete via secure link — no account required",
];

export default function Pricing() {
  const [trialDays, setTrialDays] = useState(SUBSCRIPTION_TRIAL_DAYS_DEFAULT);
  const trialPitch = formatSubscriptionTrialPitch(trialDays);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="pricing-page">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-14 lg:py-20">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <CreditCard className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
              Transparent plans
            </span>
            {trialDays > 0 ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: "var(--c-primary)" }}
                data-testid="pricing-trial-badge"
              >
                <Gift className="h-3.5 w-3.5" />
                {trialDays}-day free trial on Pro &amp; Business
              </span>
            ) : null}
          </div>
          <div
            className="mt-4"
            style={{ fontFamily: "'Caveat', cursive", fontSize: "30px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Pay for what you use
          </div>
          <h1 className="mt-1 font-heading text-[1.85rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl lg:text-5xl">
            Pricing that grows with you<span style={{ color: "var(--c-accent)" }}>.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
            {formatFreePlanSignupPitch()}. Pro and Business unlock Manage PDF, higher limits, and team features — billed monthly or yearly.
            {trialPitch ? (
              <>
                {" "}
                <span className="font-medium text-[var(--c-ink)]">{trialPitch}</span>
              </>
            ) : null}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE} data-testid="pricing-hero-cta">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--c-muted-fg)]">
            {TRUST_BULLETS.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PricingPlansSection showHeader={false} showComparison />

      <MarketingDarkSection className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>
            Every plan
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl" style={{ ...H_FONT, color: PAPER_TEXT }}>
            Court-ready signatures included<span style={{ color: "#FF7A5C" }}>.</span>
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {INCLUDED_EVERY_PLAN.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(248,247,242,.85)" }}>
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#2DD4BF" }} />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </MarketingDarkSection>

      <MarketingFaqSection
        id="pricing-faq"
        eyebrow="Pricing"
        title="Common questions"
        faqs={PRICING_FAQS}
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
      />

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <p style={CTA_SCRIPT_STYLE}>Ready to send your first document?</p>
          <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
            Start free — upgrade when you need more
          </h2>
          <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.72)" }}>
            Create your account in minutes. No card required on the Free plan.
            {trialDays > 0 ? ` Your first Pro or Business upgrade includes a ${trialDays}-day free trial.` : ""}
          </p>
          <div className={CTA_ACTIONS_CLASS}>
            <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className={CTA_SECONDARY_BTN} style={{ borderColor: "rgba(248,247,242,.22)", color: PAPER_TEXT }}>
              Talk to sales
            </Link>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <CookieBanner />
      <FloatingAssistant />
    </div>
  );
}