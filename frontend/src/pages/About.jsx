import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection, MarketingInkSurface } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import {
  ArrowRight,
  Building2,
  Globe,
  Heart,
  Landmark,
  Lock,
  MapPin,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
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

const STATS = [
  { value: "500k+", label: "UK documents prepared", color: "#2DD4BF" },
  { value: "100%", label: "UK-owned & hosted", color: "#2DD4BF" },
  { value: "99.9%", label: "Platform uptime", color: "#2DD4BF" },
  { value: "< 3 min", label: "Avg. time to sign", color: "#FF7A5C" },
];

const VALUES = [
  {
    icon: ShieldCheck,
    emoji: "🛡",
    bg: "var(--badge-teal-bg)",
    title: "Trust by default",
    body: "Every completed document ships with a tamper-evident audit trail and a sealed Certificate of Completion — not as an add-on, but as the default.",
  },
  {
    icon: Zap,
    emoji: "⚡",
    bg: "var(--badge-coral-bg)",
    title: "Ruthless speed",
    body: "From upload to signed in minutes. We obsess over removing every click between you and a closed agreement.",
  },
  {
    icon: Sparkles,
    emoji: "✨",
    bg: "var(--badge-warning-bg)",
    title: "Delightful simplicity",
    body: "Powerful doesn't have to mean complicated. CivicSign is approachable for solo founders and ops teams alike.",
  },
  {
    icon: Lock,
    emoji: "🔒",
    bg: "var(--badge-teal-bg)",
    title: "Privacy first",
    body: "Your documents are yours. Encryption, strict access controls, and a clear UK GDPR posture — we never sell your data.",
  },
];

const MILESTONES = [
  { year: "2023", title: "The frustration", body: "A small team kept waiting days for signatures on simple contracts. Enterprise tools felt bloated; consumer tools felt flimsy. We sketched something better." },
  { year: "2024", title: "Built in Britain", body: "We designed CivicSign around UK law from day one — intent, consent, attribution, and tamper-evidence baked into every envelope." },
  { year: "2025", title: "Teams onboard", body: "Templates, shared workspaces, Pro and Business tiers, Prepare Studio, and Manage PDF — one 2-in-1 platform for preparing and signing documents." },
  { year: "2026", title: "Scaling with trust", body: "Organisation plans for banks and enterprises, bulk send, API access, and the same friendly experience at every tier." },
];

const DIFFERENTIATORS = [
  { icon: Globe, title: "UK-first infrastructure", body: "UK-owned, UK-hosted, and aligned with UK GDPR. Your data stays under British jurisdiction." },
  { icon: Scale, title: "Court-ready by design", body: "Built around the Electronic Communications Act 2000, UK eIDAS, and the Law Commission's guidance on electronic execution." },
  { icon: Heart, title: "Honest pricing", body: "Clear document allowances, no envelope-metering games, and a free tier so you can try before you commit." },
  { icon: Users, title: "Signers stay frictionless", body: "Recipients sign via a secure link — no account, no app download. You look professional; they finish in one tap." },
];

const WHO_WE_SERVE = [
  { icon: "💼", title: "Founders & freelancers", body: "Send proposals and contracts that clients can sign the same afternoon.", bg: "var(--badge-teal-bg)" },
  { icon: "🧑‍💼", title: "HR & People teams", body: "Offer letters, NDAs and policy acknowledgements at scale.", bg: "var(--badge-coral-bg)", to: "/solutions/hr" },
  { icon: "⚖️", title: "Legal & compliance", body: "Engagement letters and settlements with evidence that holds up.", bg: "var(--badge-warning-bg)", to: "/solutions/legal" },
  { icon: "🏦", title: "Finance & enterprise", body: "Organisation plans with pooled allowances and admin controls.", bg: "var(--badge-teal-bg)", to: "/solutions/financial-services" },
  { icon: "🏠", title: "Property & lettings", body: "Tenancy agreements and disclosures from any device.", bg: "var(--badge-coral-bg)", to: "/solutions/real-estate" },
  { icon: "🏗", title: "Construction & trades", body: "Variations, sub-contracts and handover packs signed on site.", bg: "var(--badge-warning-bg)", to: "/solutions/construction" },
];

const PRINCIPLES = [
  { t: "Audit trails are not optional", d: "Every action is timestamped and logged. The Certificate of Completion is standard, not a paid extra." },
  { t: "Signers deserve a beautiful experience", d: "Mobile-first signing pages, clear consent, and zero account friction for recipients." },
  { t: "Security is visible", d: "SHA-256 sealing, tokenized links, and encryption in transit — explained plainly, not buried in legalese." },
  { t: "We earn trust slowly", d: "No dark patterns, no surprise limits, and a support team that replies like humans." },
];

export default function About() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="about-page">
      <style>{`
        @keyframes about-fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes about-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes about-floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @media (prefers-reduced-motion: reduce){.about-anim{animation:none !important}}
      `}</style>
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <MarketingGradient />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="about-anim" style={{ animation: "about-fadeUp .7s ease both" }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--badge-teal-fg)] shadow-sm">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 0 3px rgba(22,163,74,.18)" }} />
              UK-built · UK-hosted
            </div>
            <h1 className="mt-6 text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl sm:leading-[1.05] lg:text-[58px]" style={H_FONT}>
              Britain&apos;s own way to{" "}
              <span className="relative sm:whitespace-nowrap" style={{ color: "var(--c-primary-hover)" }}>
                sign
                <svg viewBox="0 0 200 16" className="absolute -bottom-2.5 left-0 w-full" fill="none" aria-hidden="true">
                  <path d="M4 12 C 60 3, 140 3, 196 9" stroke="#FF7A5C" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign started with a simple frustration: getting a signature shouldn&apos;t feel like enterprise software from a decade ago.
              We set out to build a fresh, fast, genuinely trustworthy way to sign — from the UK, for the UK and beyond.
            </p>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              Today we&apos;re the UK&apos;s first homegrown, UK GDPR-aligned e-signature platform — helping freelancers, growing teams,
              and organisations close agreements with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>
                Start free <ArrowRight className="h-4 w-4" style={{ color: "#2DD4BF" }} />
              </Link>
              <Link to="/careers" className={SECONDARY_CTA}>Join our team</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="about-anim relative" style={{ animation: "about-fadeUp .7s .12s ease both" }}>
            <div
              className="absolute rounded-3xl opacity-[.14]"
              style={{ inset: "28px -24px -24px 28px", background: "linear-gradient(135deg,#14B8A6,#0D9488)", transform: "rotate(2deg)" }}
            />
            <div className="relative rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-7" style={{ boxShadow: "0 30px 70px rgba(18,33,32,.16)" }}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] text-xl" style={{ background: "var(--badge-teal-bg)" }}>🇬🇧</span>
                <div>
                  <div className="text-[15px] font-semibold text-[var(--c-ink)]" style={H_FONT}>CivicSign Ltd</div>
                  <div className="text-[12px] text-[var(--c-muted-fg)]">E-signatures · Audit trails · UK law</div>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Mission", "Make signing fast, fair & court-ready"],
                  ["HQ", "Covent Garden, London"],
                  ["Focus", "Freelancers → Enterprise"],
                  ["Since", "Building since 2023"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{k}</div>
                    <div className="mt-0.5 text-[13.5px] font-medium text-[var(--c-ink)]">{v}</div>
                  </div>
                ))}
              </div>
              <MarketingInkSurface className="mt-5 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#2DD4BF" }}>
                  <Landmark className="h-4 w-4" /> UK eIDAS · ECA 2000 aligned
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                  Intent, consent, attribution and tamper-evidence — designed for documents that matter in British courts.
                </p>
              </MarketingInkSurface>
            </div>
            <div
              className="about-anim absolute -top-4 right-0 hidden items-center gap-2.5 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] px-4 py-3 sm:flex"
              style={{ boxShadow: "0 10px 26px rgba(18,33,32,.14)", animation: "about-floaty 5s ease-in-out infinite" }}
            >
              <Heart className="h-5 w-5" style={{ color: "#FF7A5C" }} />
              <div>
                <div className="text-[12.5px] font-semibold text-[var(--c-ink)]">Built for people</div>
                <div className="text-[11px] text-[var(--c-muted-fg)]">Not procurement committees</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="overflow-hidden border-y border-[var(--c-border)] bg-[var(--card)] py-5" aria-hidden="true">
        <div
          className="about-anim flex w-max gap-[72px] whitespace-nowrap text-[15px] font-semibold text-[var(--c-muted-fg)]/70"
          style={{ ...H_FONT, animation: "about-marquee 30s linear infinite" }}
        >
          {[...MARQUEE_COMPANIES, ...MARQUEE_COMPANIES].map((c, i) => (
            <span key={`${c}-${i}`}>{c}</span>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className={SECTION_EYEBROW}>Our mission</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
              Signing should feel effortless<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              To give every team — from freelancers to fast-growing companies — a signing experience that is quick to use,
              legally sound, and a pleasure to look at. We believe trust should be built in, audit trails should be standard,
              and pricing should be honest.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              We&apos;re proudly UK-owned and UK-hosted, fully aligned with UK GDPR, the UK eIDAS Regulation and the
              Electronic Communications Act 2000, so the documents you complete on CivicSign are designed to hold up when it matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>Try CivicSign free</Link>
              <Link to="/contact" className={SECONDARY_CTA}>Talk to us</Link>
            </div>
          </div>
          <MarketingInkSurface className="rounded-[20px] p-8 text-white transition-all hover:-translate-y-0.5 hover:shadow-2xl">
            <Rocket className="h-8 w-8" style={{ color: "#2DD4BF" }} />
            <h3 className="mt-4 text-2xl font-bold" style={H_FONT}>Built for the next generation of teams</h3>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "rgba(248,247,242,.72)" }}>
              No envelope-metering games. No bloated dashboards. Just upload, drag, send — and a sealed, court-ready record on the other side.
            </p>
            <ul className="mt-6 space-y-3 text-[14px]" style={{ color: "rgba(248,247,242,.8)" }}>
              {["Free tier to start — no card required", "Pro & Business when you scale", "Organisation plans for enterprise"].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold" style={{ color: "#2DD4BF" }}>✓</span>{line}
                </li>
              ))}
            </ul>
          </MarketingInkSurface>
        </div>
      </section>

      {/* Story timeline */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="text-center">
            <div className={SECTION_EYEBROW}>Our story</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
              From frustration to platform<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign didn&apos;t begin in a boardroom. It began with contracts stuck in inboxes and tools that made simple work feel heavy.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {MILESTONES.map((m, i) => (
              <div key={m.year} className={`relative p-6 ${MARKETING_CARD}`}>
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{ ...H_FONT, background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}
                >
                  {m.year.slice(2)}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{m.body}</p>
                {i < MILESTONES.length - 1 && (
                  <span className="absolute -right-3 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 lg:block" style={{ background: "var(--c-border)" }} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className={SECTION_EYEBROW}>Why we exist</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
              What makes CivicSign different
            </h2>
          </div>
          <p className="max-w-sm pb-1 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            We&apos;re not trying to be everything to everyone. We&apos;re trying to be the best signing experience for UK teams.
          </p>
        </div>
        <div className="mt-12 grid gap-[18px] sm:grid-cols-2">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className={`flex gap-4 p-6 ${MARKETING_CARD}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]" style={{ background: "var(--badge-teal-bg)" }}>
                <d.icon className="h-5 w-5" style={{ color: "var(--badge-teal-fg)" }} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-[var(--c-ink)]" style={H_FONT}>{d.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{d.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dark stats + principles */}
      <MarketingDarkSection className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px 340px at 80% 0%, rgba(45,212,191,.12), transparent), radial-gradient(520px 280px at 12% 100%, rgba(255,122,92,.08), transparent)" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>By the numbers</div>
              <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em]" style={H_FONT}>
                Trusted where it counts<span style={{ color: "#FF7A5C" }}>.</span>
              </h2>
              <div className="mt-10 grid grid-cols-2 gap-8">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <div className="text-[34px] font-bold" style={{ ...H_FONT, color: s.color }}>{s.value}</div>
                    <div className="mt-0.5 text-[13px]" style={{ color: "rgba(248,247,242,.55)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>How we build</div>
              <h3 className="mt-3 text-2xl font-bold" style={H_FONT}>Principles we won&apos;t compromise on</h3>
              <div className="mt-8 flex flex-col gap-5">
                {PRINCIPLES.map((p) => (
                  <div key={p.t} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: "rgba(45,212,191,.16)", color: "#2DD4BF" }}>✓</span>
                    <div>
                      <div className="text-base font-semibold">{p.t}</div>
                      <div className="mt-0.5 text-sm leading-relaxed" style={{ color: "rgba(248,247,242,.62)" }}>{p.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MarketingDarkSection>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Values</div>
          <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
            What we stand for<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-[18px] md:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className={`p-7 ${MARKETING_CARD}`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-[13px] text-xl" style={{ background: v.bg }}>{v.emoji}</div>
              <h3 className="mt-4 text-xl font-semibold text-[var(--c-ink)]" style={H_FONT}>{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who we serve */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className={SECTION_EYEBROW}>Who we serve</div>
              <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>Teams of every size</h2>
            </div>
            <p className="max-w-sm pb-1 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              From your first client contract to organisation-wide rollout — same product, same audit trail.
            </p>
          </div>
          <div className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {WHO_WE_SERVE.map((u) => {
              const inner = (
                <>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[19px]" style={{ background: u.bg }}>{u.icon}</div>
                  <div>
                    <h3 className="text-[16.5px] font-semibold text-[var(--c-ink)]" style={H_FONT}>{u.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--c-muted-fg)]">{u.body}</p>
                  </div>
                </>
              );
              const cls = "flex gap-4 rounded-[18px] border border-[var(--c-border)] bg-[var(--c-paper)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-lg";
              return u.to ? (
                <Link key={u.title} to={u.to} className={cls}>{inner}</Link>
              ) : (
                <div key={u.title} className={cls}>{inner}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Company + careers */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-[18px] lg:grid-cols-2">
          <div className={`p-8 ${MARKETING_CARD}`}>
            <Building2 className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
            <h3 className="mt-4 text-2xl font-bold text-[var(--c-ink)]" style={H_FONT}>CivicSign Ltd</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign is operated by CivicSign Ltd, registered in England and Wales. We build software for electronic signatures,
              document preparation, and audit-grade completion records.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--c-primary)" }} />
              <div className="text-sm">
                <div className="font-semibold text-[var(--c-ink)]">Registered office</div>
                <div className="mt-0.5 text-[var(--c-muted-fg)]">71-75 Shelton Street, Covent Garden, London WC2H 9JQ, United Kingdom</div>
              </div>
            </div>
            <Link to="/legal/privacy" className="mt-5 inline-block text-sm font-semibold text-[var(--c-primary)] hover:underline">
              Privacy & data protection →
            </Link>
          </div>
          <div className={`p-8 ${MARKETING_CARD}`}>
            <Target className="h-7 w-7" style={{ color: "#FF7A5C" }} />
            <h3 className="mt-4 text-2xl font-bold text-[var(--c-ink)]" style={H_FONT}>Work with us</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              We&apos;re a small, product-focused team obsessed with craft, clarity, and UK digital trust.
              If you care about thoughtful software and helping real businesses move faster, we&apos;d love to hear from you.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              For partnerships, press, or enterprise enquiries, reach us at{" "}
              <a href="mailto:info@civicbot.co.uk" className="font-medium text-[var(--c-primary)] hover:underline">info@civicbot.co.uk</a>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/careers" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>View open roles</Link>
              <Link to="/contact" className={SECONDARY_CTA}>Contact us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Join thousands signing smarter</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Your next signature<br />is minutes away<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Create a free CivicSign account and send your first document today. No card required.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>Start free →</Link>
              <Link
                to="/contact"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >Talk to us</Link>
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