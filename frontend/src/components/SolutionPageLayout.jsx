import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";

/**
 * Shared layout for industry solution landing pages.
 *
 * Props:
 *   industry     — e.g. "Solutions · Legal"
 *   IndustryIcon — lucide icon component for the badge
 *   headline     — JSX: main H1
 *   subhead      — string: hero subhead
 *   heroImage    — { src, alt }
 *   stats        — [{ value, label }, ...]
 *   why          — [{ icon, title, body }, ...]
 *   docs         — [{ icon, title, body }, ...]
 *   compliance   — { eyebrow: { icon, label }, headline, body }
 *   docsHeadline — string for the docs section heading
 *   docsSubhead  — string subtitle for the docs section
 *   whyHeadline  — string for the why section heading
 *   whySubhead   — string subtitle for the why section
 *   ctaHeadline, ctaSubhead, ctaButton — final banner
 *   testidSlug   — slug used as data-testid prefix (e.g. "legal")
 */
export function SolutionPageLayout({
  industry, IndustryIcon,
  headline, subhead, heroImage,
  stats, why, docs, compliance,
  whyHeadline, whySubhead,
  docsHeadline, docsSubhead,
  ctaHeadline, ctaSubhead, ctaButton,
  testidSlug,
}) {
  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #FFF7F0 0%, var(--c-paper) 60%)" }} />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <IndustryIcon className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> {industry}
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted-foreground)]">{subhead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" data-testid={`${testidSlug}-cta-start`} style={{ background: "var(--c-primary)", color: "#fff" }}>
                  Start free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/#pricing"><Button size="lg" variant="outline">See pricing</Button></Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Free 5 docs / month</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> No card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> UK GDPR compliant</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] shadow-xl">
              <img src={heroImage.src} alt={heroImage.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center" data-testid={`${testidSlug}-stat`}>
              <p className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">{whyHeadline}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">{whySubhead}</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((w) => (
            <div key={w.title} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                <w.icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              </span>
              <h3 className="mt-3 font-heading font-semibold text-[var(--c-ink)]">{w.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPLIANCE CALLOUT */}
      {compliance && (
        <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)] py-16">
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
                <compliance.eyebrow.icon className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                {compliance.eyebrow.label}
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-[var(--c-ink)] sm:text-4xl">
                {compliance.headline}
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-[var(--muted-foreground)]">{compliance.body}</p>
          </div>
        </section>
      )}

      {/* DOCS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">{docsHeadline}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">{docsSubhead}</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <div key={d.title} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-5" data-testid={`${testidSlug}-doc`}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--c-accent)22" }}>
                <d.icon className="h-4 w-4" style={{ color: "var(--c-accent)" }} />
              </span>
              <h3 className="mt-3 font-heading font-semibold text-[var(--c-ink)]">{d.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink)] p-10 text-center text-white sm:p-14">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">{ctaHeadline}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{ctaSubhead}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" data-testid={`${testidSlug}-cta-bottom`} style={{ background: "var(--c-primary)", color: "#fff" }}>
                {ctaButton} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contact"><Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">Talk to us</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
