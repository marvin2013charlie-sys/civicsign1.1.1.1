import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
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
  MARKETING_CARD,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

/**
 * Shared layout for SEO money pages (DocuSign alternative, UK e-signature software, etc.).
 */
export function MarketingMoneyPage({
  testId,
  eyebrow,
  headline,
  subhead,
  points = [],
  comparison = null,
  faqs = [],
  related = [],
  ctaHeadline = "Start signing with CivicSign",
  ctaSubhead = "UK e-signature software with legally binding signatures, UK GDPR hosting, and a free plan to try.",
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]" data-testid={testId}>
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">{eyebrow}</p>
            ) : null}
            <h1
              className="mt-3 text-4xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl lg:text-[56px]"
              style={H_FONT}
            >
              {headline}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">{subhead}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className={`${PRIMARY_CTA} w-full justify-center sm:w-auto`}
                style={PRIMARY_CTA_STYLE}
                data-testid={`${testId}-cta-register`}
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/pricing" className={`${SECONDARY_CTA} w-full justify-center sm:w-auto`}>
                See pricing
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
        </div>
      </section>

      {points.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="grid gap-5 md:grid-cols-3">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className={`${MARKETING_CARD} p-6`}>
                  {Icon ? (
                    <span
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                      style={{ background: "var(--badge-teal-bg)" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                    </span>
                  ) : null}
                  <h2 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
                    {point.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{point.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {comparison ? (
        <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">
                {comparison.eyebrow || "Why teams switch"}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
                {comparison.title}
              </h2>
              {comparison.subtitle ? (
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{comparison.subtitle}</p>
              ) : null}
            </div>
            <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
              {(comparison.items || []).map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 text-sm leading-relaxed text-[var(--c-ink)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <MarketingFaqSection
          id={`${testId}-faq`}
          eyebrow="UK signing FAQs"
          title="Questions teams ask"
          faqs={faqs}
          testIdPrefix={`${testId}-faq`}
          showContactCta
        />
      ) : null}

      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {related.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-2 font-medium text-[var(--c-ink)] hover:border-[var(--c-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <p style={CTA_SCRIPT_STYLE}>Ready when you are</p>
          <h2 className={CTA_HEADLINE_CLASS} style={H_FONT}>
            {ctaHeadline}
          </h2>
          <p className={CTA_SUBTEXT_CLASS}>{ctaSubhead}</p>
          <div className={CTA_ACTIONS_CLASS}>
            <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className={CTA_SECONDARY_BTN}>
              Talk to us
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
