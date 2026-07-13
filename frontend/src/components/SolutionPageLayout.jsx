import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { SolutionIndustryBadge, solutionIndustryLabel } from "@/components/SolutionIndustryBadge";
import {
  SolutionFaqSection,
  SolutionSecuritySection,
  SolutionTestimonial,
  SolutionWorkflowSection,
} from "@/components/SolutionExtras";
import { getSolutionExtras } from "@/lib/solutionContent";
import { getRelatedSolutions } from "@/lib/solutionsNav";
import {
  CTA_ACTIONS_CLASS,
  CTA_BANNER,
  CTA_HEADLINE_CLASS,
  CTA_PRIMARY_BTN,
  CTA_PRIMARY_BTN_STYLE,
  CTA_SCRIPT_STYLE,
  CTA_SECONDARY_BTN,
  CTA_SECTION,
  CTA_SUBTEXT_CLASS,
  HERO_GRID,
  HERO_IMAGE,
  HERO_IMAGE_FRAME,
  H_FONT,
  INK,
  MARKETING_CARD,
  PAPER_TEXT,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  SECTION_EYEBROW,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

const MARQUEE_COMPANIES = [
  "Northwind Studio", "Brightwave", "Tertia", "Apex Recruitment",
  "Harbor & Co", "Ledgerly Finance", "Cedar Health", "Owens & Price",
];

const STEPS = [
  { n: "1", t: "Upload", d: "PDF or Word — rendered instantly in your browser.", ring: "#2DD4BF" },
  { n: "2", t: "Prepare", d: "Drag fields, set signing order, add your message.", ring: "#7AC9BE" },
  { n: "3", t: "Seal", d: "Completed PDF with Certificate of Completion.", ring: "#FF7A5C" },
];

/**
 * Shared layout for industry solution landing pages (Landing v3 design).
 */
export function SolutionPageLayout({
  industry,
  industryLabel,
  IndustryIcon,
  headline,
  subhead,
  heroImage,
  stats,
  why,
  docs,
  compliance,
  whyHeadline,
  whySubhead,
  docsHeadline,
  docsSubhead,
  ctaHeadline,
  ctaSubhead,
  ctaButton,
  testidSlug,
  solutionPath,
  children,
}) {
  const industryDisplay = industryLabel || solutionIndustryLabel(industry);
  const related = solutionPath ? getRelatedSolutions(solutionPath, 3) : [];
  const extras = solutionPath ? getSolutionExtras(solutionPath) : null;

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]" data-testid={`solution-${testidSlug}`}>
      <style>{`
        @keyframes sol-page-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion: reduce){.sol-page-anim{animation:none !important}}
      `}</style>
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <MarketingGradient />
        <div className={HERO_GRID}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <SolutionIndustryBadge label={industryDisplay} Icon={IndustryIcon} />
            <h1 className="mt-2 font-heading text-[1.85rem] font-bold leading-[1.08] tracking-[-0.03em] sm:text-4xl sm:leading-[1.05] lg:text-6xl" style={H_FONT}>
              {headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--c-muted-fg)]">{subhead}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/register"
                data-testid={`${testidSlug}-cta-start`}
                className={`${PRIMARY_CTA} w-full justify-center sm:w-auto`}
                style={PRIMARY_CTA_STYLE}
              >
                Start free <ArrowRight className="h-4 w-4" style={{ color: "var(--c-logo-dot)" }} />
              </Link>
              <Link to="/pricing" className={`${SECONDARY_CTA} w-full justify-center sm:w-auto`}>See pricing</Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className={HERO_IMAGE_FRAME}>
              <img src={heroImage.src} alt={heroImage.alt} className={HERO_IMAGE} loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <section className="overflow-hidden border-y border-[var(--c-border)] bg-[var(--card)] py-4" aria-hidden="true">
        <div
          className="sol-page-anim flex w-max gap-[72px] whitespace-nowrap text-[14px] font-semibold text-[var(--c-muted-fg)]/60"
          style={{ ...H_FONT, animation: "sol-page-marquee 28s linear infinite" }}
        >
          {[...MARQUEE_COMPANIES, ...MARQUEE_COMPANIES].map((c, i) => (
            <span key={`${c}-${i}`}>{c}</span>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center" data-testid={`${testidSlug}-stat`}>
              <p className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>{s.value}</p>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Why CivicSign</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            {whyHeadline}<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">{whySubhead}</p>
        </div>
        <div className="mt-10 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {why.map((w) => (
            <div key={w.title} className={`p-6 ${MARKETING_CARD}`}>
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                style={{ background: "var(--badge-teal-bg)" }}
              >
                <w.icon className="h-5 w-5" style={{ color: "var(--badge-teal-fg)" }} />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — compact dark strip */}
      <MarketingDarkSection className="relative overflow-hidden border-y border-[var(--c-border)]">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 280px at 70% 0%, rgba(45,212,191,.1), transparent)" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>How it works</div>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl" style={H_FONT}>Three steps to signed</h2>
          </div>
          <div className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            <div className="absolute left-[16.6%] right-[16.6%] top-[22px] hidden h-0.5 md:block" style={{ background: "linear-gradient(90deg,#2DD4BF,#FF7A5C)" }} aria-hidden />
            {STEPS.map((s) => (
              <div key={s.n} className="relative px-4 text-center">
                <div
                  className="relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 text-base font-bold"
                  style={{ ...H_FONT, background: "#122120", borderColor: s.ring, color: s.ring }}
                >{s.n}</div>
                <h3 className="mt-4 text-lg font-semibold" style={H_FONT}>{s.t}</h3>
                <p className="mx-auto mt-1.5 max-w-[240px] text-[13.5px] leading-relaxed" style={{ color: "rgba(248,247,242,.6)" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </MarketingDarkSection>

      {/* COMPLIANCE CALLOUT */}
      {compliance && (
        <section className="border-b border-[var(--c-border)] bg-[var(--card)] py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--badge-teal-fg)] shadow-sm">
                <compliance.eyebrow.icon className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                {compliance.eyebrow.label}
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
                {compliance.headline}
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-[var(--c-muted-fg)]">{compliance.body}</p>
          </div>
        </section>
      )}

      {/* DOCS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Documents</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            {docsHeadline}<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">{docsSubhead}</p>
        </div>
        <div className="mt-10 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <div key={d.title} className={`p-6 ${MARKETING_CARD}`} data-testid={`${testidSlug}-doc`}>
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                style={{ background: "var(--badge-coral-bg)" }}
              >
                <d.icon className="h-5 w-5" style={{ color: "var(--badge-coral-fg)" }} />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{d.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {extras && (
        <SolutionWorkflowSection
          headline={extras.workflowHeadline}
          subhead={extras.workflowSubhead}
          workflows={extras.workflows}
        />
      )}

      <SolutionSecuritySection />

      {extras?.testimonial && <SolutionTestimonial testimonial={extras.testimonial} />}

      {/* Optional extra sections (Real Estate custom blocks, etc.) */}
      {children}

      {extras?.faqs && (
        <SolutionFaqSection faqs={extras.faqs} testIdPrefix={testidSlug} />
      )}

      {/* Related solutions */}
      {related.length > 0 && (
        <section className="border-t border-[var(--c-border)] bg-[var(--card)] py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className={SECTION_EYEBROW}>More solutions</div>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-3xl" style={H_FONT}>
                  Related industries
                </h2>
              </div>
              <Link to="/solutions" className="text-sm font-semibold text-[var(--c-primary)] hover:underline">
                View all solutions →
              </Link>
            </div>
            <div className="mt-8 grid gap-[18px] sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.to} to={r.to} className={`flex gap-3 p-5 ${MARKETING_CARD}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: "var(--badge-teal-bg)" }}>
                    <r.icon className="h-4 w-4" style={{ color: "var(--badge-teal-fg)" }} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--c-ink)]">{r.label}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--c-muted-fg)]">{r.blurb}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }}
          />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Ready when you are</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              {ctaHeadline}<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>{ctaSubhead}</p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link
                to="/register"
                data-testid={`${testidSlug}-cta-bottom`}
                className={CTA_PRIMARY_BTN}
                style={CTA_PRIMARY_BTN_STYLE}
              >
                {ctaButton} →
              </Link>
              <Link
                to="/contact"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >
                Talk to us
              </Link>
            </div>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}