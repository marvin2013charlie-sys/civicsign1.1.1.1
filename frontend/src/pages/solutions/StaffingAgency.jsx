import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, FileText, ShieldCheck, Clock, CheckCircle2, ArrowRight,
  Briefcase, FileSignature, ScrollText, UserPlus, Sparkles, Globe,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { BrandAccent } from "@/components/BrandText";
import { SolutionIndustryBadge } from "@/components/SolutionIndustryBadge";
import { RelatedSolutionsSection, SolutionMarquee } from "@/components/SolutionSharedSections";
import {
  SolutionFaqSection,
  SolutionSecuritySection,
  SolutionTestimonial,
  SolutionWorkflowSection,
} from "@/components/SolutionExtras";
import { getSolutionExtras } from "@/lib/solutionContent";
import { formatFreePlanSignupPitch } from "@/lib/pricing";
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

const DOCS = [
  { icon: Briefcase, title: "Permanent and temporary employment contracts", body: "Send IR35-aware contracts to candidates with pre-placed signature, initials and start-date fields. Tamper-evident audit trail on every page." },
  { icon: FileSignature, title: "Terms of business with clients", body: "Get hirers to sign your terms of business, fee schedules and PSL agreements before the first CV is sent across." },
  { icon: ScrollText, title: "Right to Work and GDPR consent forms", body: "Capture Right to Work declarations and UK GDPR consent forms electronically, timestamped, with full audit log." },
  { icon: UserPlus, title: "Candidate registration and assignment schedules", body: "Onboard contractors with assignment schedules, AWR opt-outs and timesheet authorisation in one signing flow." },
  { icon: FileText, title: "Confidentiality and restrictive covenants", body: "Send NDAs, restrictive covenants and post-termination undertakings, signed before the placement, every time." },
  { icon: Globe, title: "Umbrella and limited-company schedules", body: "Multi-party routing handles candidate, umbrella and end client in the correct order with one click." },
];

const WHY = [
  { icon: Clock, title: "Place candidates faster", body: "Send a contract to a candidate and have it signed before they leave the desk, cutting time-to-place from days to hours." },
  { icon: ShieldCheck, title: "UK GDPR and safer-recruitment ready", body: "Candidate and client data is processed under UK GDPR. Audit log captures every IP address, timestamp and signing action for due diligence." },
  { icon: CheckCircle2, title: "Built for UK employment law", body: "Aligned with the Electronic Communications Act 2000 and UK eIDAS, signatures hold up in tribunals." },
  { icon: Sparkles, title: "Your agency, your branding", body: "Add your agency logo, colours and signing-page banner so every email and signing screen looks like yours, not ours." },
];

const STATS = [
  { value: "< 2 hrs", label: "Average contract turnaround" },
  { value: "10x", label: "Faster placements vs. paper" },
  { value: "100%", label: "UK-owned and UK-hosted" },
];

export default function StaffingAgency() {
  const extras = getSolutionExtras("/solutions/staffing-agency");
  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <MarketingGradient />
        <div className={HERO_GRID}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <SolutionIndustryBadge label="Staffing Agencies" Icon={Users} />
            <h1 className="mt-2 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Place candidates. <BrandAccent>Sign contracts.</BrandAccent> Done.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign is the UK-built e-signature platform for recruitment agencies, staffing firms and umbrella companies. Get terms of business, employment contracts and Right to Work forms signed, legally binding, UK GDPR compliant, in minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE} data-testid="staff-cta-start">
                Start free <ArrowRight className="h-4 w-4" style={{ color: "var(--c-logo-dot)" }} />
              </Link>
              <Link to="/pricing" className={SECONDARY_CTA}>See pricing</Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative">
            <div className={HERO_IMAGE_FRAME}>
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="UK recruiter shaking hands with candidate after signing a contract"
                className={HERO_IMAGE}
              />
            </div>
          </motion.div>
        </div>
      </section>

      <SolutionMarquee />

      {/* STATS strip */}
      <section className="border-b border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Why CivicSign</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Why UK recruiters choose CivicSign<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">Designed around the way British staffing agencies actually work, from perm contracts to umbrella schedules, not adapted from an American product.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className={`p-6 ${MARKETING_CARD}`}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: "var(--badge-teal-bg)" }}>
                <w.icon className="h-5 w-5" style={{ color: "var(--badge-teal-fg)" }} />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{w.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOCUMENTS */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <div className={SECTION_EYEBROW}>Documents</div>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              Every recruitment document, signed in minutes<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">Pre-built workflows for the documents you send most. Save them once as templates, reuse them every placement, every renewal.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.map((d) => (
              <div key={d.title} className={`p-6 ${MARKETING_CARD}`}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: "var(--badge-coral-bg)" }}>
                  <d.icon className="h-5 w-5" style={{ color: "var(--badge-coral-fg)" }} />
                </span>
                <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{d.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{d.body}</p>
              </div>
            ))}
          </div>
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
      {extras?.faqs && <SolutionFaqSection faqs={extras.faqs} testIdPrefix="staffing" />}
      <RelatedSolutionsSection solutionPath="/solutions/staffing-agency" />

      {/* CTA */}
      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Ready when you are</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Ready to place faster<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Get your first contract signed today. {formatFreePlanSignupPitch()}, UK GDPR compliant from day one.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/register" data-testid="staff-cta-bottom" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>
                Start free for recruiters →
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
