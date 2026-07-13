import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, LayoutTemplate, PenTool, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import {
  SolutionFaqSection,
  SolutionHowItWorksStrip,
  SolutionSecuritySection,
  SolutionSwitchSection,
  SolutionTestimonialsGrid,
} from "@/components/SolutionExtras";
import {
  SOLUTIONS_HUB_FAQS,
  SOLUTIONS_HUB_STATS,
  SOLUTIONS_HUB_STEPS,
  SOLUTIONS_HUB_SWITCH,
  SOLUTIONS_HUB_TESTIMONIALS,
} from "@/lib/solutionContent";
import { formatFreePlanSignupPitch } from "@/lib/pricing";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import {
  SOLUTION_GROUPS,
  solutionGroupBadgeBg,
  solutionTestId,
} from "@/lib/solutionsNav";
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
  "BuildRight Ltd", "Volta Consulting",
];

const CAPABILITIES = [
  { icon: FileText, title: "Prepare Studio", body: "Drag signature, date, text and checkbox fields onto any PDF or Word document with pixel precision." },
  { icon: PenTool, title: "Manage PDF", body: "One 2-in-1 platform — edit, compress, watermark, protect, merge and split, then send for signature without switching tools. Included with every paid plan (not Free)." },
  { icon: LayoutTemplate, title: "Reusable templates", body: "Save your sector's repeat documents once — ASTs, offer letters, engagement packs, RAMS and more." },
  { icon: Users, title: "Team & organisation", body: "Shared templates, usage reporting and organisation plans for banks and enterprise teams." },
];

const PLATFORM_PILLARS = [
  {
    icon: ShieldCheck,
    emoji: "🛡",
    bg: "var(--badge-teal-bg)",
    title: "Court-ready audit trails",
    body: "Every signature is timestamped, IP-logged and sealed with a Certificate of Completion — standard on every plan.",
  },
  {
    icon: Zap,
    emoji: "⚡",
    bg: "var(--badge-coral-bg)",
    title: "Minutes, not days",
    body: "Upload, place fields, send. Signers complete on any device without creating an account.",
  },
  {
    icon: Sparkles,
    emoji: "✨",
    bg: "var(--badge-warning-bg)",
    title: "Templates that scale",
    body: "Save your AST, offer letter or engagement pack once — reuse it on every matter, every hire, every let.",
  },
];

export default function Solutions() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="solutions-hub">
      <style>{`
        @keyframes sol-fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes sol-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion: reduce){.sol-anim{animation:none !important}}
      `}</style>
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <div className="sol-anim mx-auto max-w-3xl" style={{ animation: "sol-fadeUp .7s ease both" }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--badge-teal-fg)] shadow-sm">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 0 3px rgba(22,163,74,.18)" }} />
              Solutions by industry
            </div>
            <h1 className="mt-6 text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl sm:leading-[1.05] lg:text-6xl" style={H_FONT}>
              E-signatures built for{" "}
              <span className="relative sm:whitespace-nowrap" style={{ color: "var(--c-primary-hover)" }}>
                your sector
                <svg viewBox="0 0 200 16" className="absolute -bottom-2.5 left-0 w-full" fill="none" aria-hidden="true">
                  <path d="M4 12 C 60 3, 140 3, 196 9" stroke="#FF7A5C" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign is UK-owned, UK-hosted and aligned with UK law. Explore workflows, document types and compliance
              guidance tailored to how your industry actually signs.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE} data-testid="solutions-hub-cta-start">
                Start free <ArrowRight className="h-4 w-4" style={{ color: "#2DD4BF" }} />
              </Link>
              <Link to="/contact" className={SECONDARY_CTA}>Talk to us</Link>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="overflow-hidden border-y border-[var(--c-border)] bg-[var(--card)] py-5" aria-hidden="true">
        <div
          className="sol-anim flex w-max gap-[72px] whitespace-nowrap text-[15px] font-semibold text-[var(--c-muted-fg)]/70"
          style={{ ...H_FONT, animation: "sol-marquee 30s linear infinite" }}
        >
          {[...MARQUEE_COMPANIES, ...MARQUEE_COMPANIES].map((c, i) => (
            <span key={`${c}-${i}`}>{c}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <MarketingDarkSection className="relative overflow-hidden border-b border-[var(--c-border)]">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 300px at 50% 0%, rgba(45,212,191,.1), transparent)" }} />
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:py-16">
          {SOLUTIONS_HUB_STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[34px] font-bold" style={{ ...H_FONT, color: s.color }}>{s.value}</div>
              <div className="mt-1 text-[13px]" style={{ color: "rgba(248,247,242,.55)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </MarketingDarkSection>

      {/* Industry groups */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Browse by industry</div>
          <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
            Find your workflow<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Nine UK-focused solution pages — each with document checklists, compliance notes and templates you can start using today.
          </p>
        </div>

        <div className="mt-14 space-y-14">
          {SOLUTION_GROUPS.map((group, gi) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">{group.label}</h3>
              <div className="mt-5 grid gap-[18px] sm:grid-cols-2">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={solutionTestId(item.label)}
                    className={`group flex gap-4 p-6 ${MARKETING_CARD}`}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] transition-transform group-hover:scale-105"
                      style={{ background: solutionGroupBadgeBg(gi) }}
                    >
                      <item.icon className="h-5 w-5" style={{ color: "var(--badge-teal-fg)" }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{item.label}</h4>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--c-muted-fg)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--c-primary)]" />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{item.blurb}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SolutionHowItWorksStrip steps={SOLUTIONS_HUB_STEPS} />

      <SolutionSwitchSection items={SOLUTIONS_HUB_SWITCH} />

      {/* Platform capabilities */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="text-center">
            <div className={SECTION_EYEBROW}>Platform</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
              One 2-in-1 platform<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              E-signatures and Manage PDF in a single workflow — industry pages show what to send; the engine underneath is the same.
            </p>
          </div>
          <div className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className={`p-7 ${MARKETING_CARD}`}>
                <c.icon className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
                <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform pillars — dark */}
      <MarketingDarkSection className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px 340px at 80% 0%, rgba(45,212,191,.12), transparent), radial-gradient(520px 280px at 12% 100%, rgba(255,122,92,.08), transparent)" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>One platform</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em]" style={H_FONT}>
              Same engine, every industry<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: "rgba(248,247,242,.62)" }}>
              Whether you let flats or onboard nurses, CivicSign gives you prepare-and-send workflows, signer-friendly pages and audit-grade completion records.
            </p>
          </div>
          <div className="mt-12 grid gap-[18px] md:grid-cols-3">
            {PLATFORM_PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-[20px] border p-7 transition-all hover:-translate-y-0.5"
                style={{ borderColor: "rgba(248,247,242,.12)", background: "rgba(248,247,242,.04)" }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[13px] text-xl" style={{ background: "rgba(45,212,191,.14)" }}>{p.emoji}</div>
                <h3 className="mt-4 text-lg font-semibold" style={H_FONT}>{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(248,247,242,.65)" }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </MarketingDarkSection>

      <SolutionTestimonialsGrid testimonials={SOLUTIONS_HUB_TESTIMONIALS} />

      <SolutionSecuritySection />

      <SolutionFaqSection faqs={SOLUTIONS_HUB_FAQS} testIdPrefix="solutions-hub" />

      {/* CTA */}
      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Pick your industry</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Start sending in minutes<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Create a free account — {formatFreePlanSignupPitch()}. Upgrade when your team scales.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE} data-testid="solutions-hub-cta-bottom">Start free →</Link>
              <Link
                to="/pricing"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >See pricing</Link>
            </div>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <CookieBanner />
      <FloatingAssistant />
    </div>
  );
}