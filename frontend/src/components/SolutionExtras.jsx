import React from "react";
import { MarketingDarkSection, MarketingInkSurface } from "@/components/MarketingDarkBand";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
import { SECTION_EYEBROW, H_FONT, MARKETING_CARD, INK, PAPER_TEXT } from "@/lib/marketingUi";
import { SECURITY_POINTS } from "@/lib/solutionContent";

export function SolutionWorkflowSection({ headline, subhead, workflows }) {
  if (!workflows?.length) return null;
  return (
    <section className="border-y border-[var(--c-border)] bg-[var(--card)] py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Typical workflow</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            {headline}<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          {subhead && (
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">{subhead}</p>
          )}
        </div>
        <div className="mt-10 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {workflows.map((w) => (
            <div key={w.step} className={`p-6 ${MARKETING_CARD}`}>
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                style={{ ...H_FONT, background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}
              >
                {w.step}
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionTestimonial({ testimonial }) {
  if (!testimonial) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div
        className={`relative overflow-hidden rounded-[24px] border border-[var(--c-border)] p-8 sm:p-10 ${MARKETING_CARD}`}
        style={{ boxShadow: "0 20px 50px rgba(18,33,32,.08)" }}
      >
        <div className="text-xs tracking-[3px]" style={{ color: "#FF7A5C" }}>★★★★★</div>
        <blockquote className="mt-4 font-heading text-xl font-medium leading-relaxed text-[var(--c-ink)] sm:text-2xl">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <div className="mt-6 flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: testimonial.color }}
          >
            {testimonial.initials}
          </span>
          <div>
            <p className="font-semibold text-[var(--c-ink)]">{testimonial.name}</p>
            <p className="text-sm text-[var(--c-muted-fg)]">{testimonial.role}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SolutionSecuritySection() {
  return (
    <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <div className={SECTION_EYEBROW}>Security</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Built to hold up in court<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Every industry page on CivicSign shares the same tamper-evident completion engine — intent, consent, attribution and a sealed audit trail on every document.
          </p>
        </div>
        <div className="relative">
          <div className="absolute rounded-[22px] opacity-[.12]" style={{ inset: "16px -14px -14px 16px", background: "#FF7A5C" }} aria-hidden />
          <MarketingInkSurface className="relative rounded-[20px] p-7 text-white" style={{ boxShadow: "0 24px 56px rgba(18,33,32,.2)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: "#2DD4BF" }}>Certificate of Completion</span>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide" style={{ background: "rgba(45,212,191,.14)", color: "#2DD4BF" }}>VERIFIED</span>
            </div>
            <ul className="mt-6 space-y-4">
              {SECURITY_POINTS.map((s) => (
                <li key={s.t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "rgba(45,212,191,.16)", color: "#2DD4BF" }}>✓</span>
                  <div>
                    <p className="text-sm font-semibold">{s.t}</p>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "rgba(248,247,242,.65)" }}>{s.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </MarketingInkSurface>
        </div>
      </div>
    </section>
  );
}

export function SolutionHowItWorksStrip({ steps }) {
  if (!steps?.length) return null;
  return (
    <MarketingDarkSection className="relative overflow-hidden border-y border-[var(--c-border)]">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 280px at 70% 0%, rgba(45,212,191,.1), transparent)" }} />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>How it works</div>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl" style={H_FONT}>Three steps to signed</h2>
        </div>
        <div className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          <div className="absolute left-[16.6%] right-[16.6%] top-[22px] hidden h-0.5 md:block" style={{ background: "linear-gradient(90deg,#2DD4BF,#FF7A5C)" }} aria-hidden />
          {steps.map((s) => (
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
  );
}

export function SolutionTestimonialsGrid({ testimonials }) {
  if (!testimonials?.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <div className={SECTION_EYEBROW}>Trusted across sectors</div>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
          Teams that stopped chasing paper<span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
      </div>
      <div className="mt-10 grid gap-[18px] md:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.name} className={`flex flex-col p-6 ${MARKETING_CARD}`}>
            <div className="text-xs tracking-[3px]" style={{ color: "#FF7A5C" }}>★★★★★</div>
            <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-[var(--c-ink)]">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <div className="mt-5 flex items-center gap-3 border-t border-[var(--c-border)] pt-5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: t.color }}
              >
                {t.initials}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--c-ink)]">{t.name}</p>
                <p className="text-xs text-[var(--c-muted-fg)]">{t.role}</p>
                {t.industry && (
                  <p className="mt-0.5 text-[11px] font-medium text-[var(--badge-teal-fg)]">{t.industry}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SolutionSwitchSection({ items }) {
  if (!items?.length) return null;
  return (
    <section className="border-y border-[var(--c-border)] bg-[var(--card)] py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Why teams switch</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Less admin, stronger evidence<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-[18px] sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.before} className={`grid gap-4 p-6 sm:grid-cols-2 ${MARKETING_CARD}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--c-muted-fg)]">Before</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)] line-through decoration-[var(--c-border)]">{item.before}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--badge-teal-fg)" }}>With CivicSign</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--c-ink)]">{item.after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionFaqSection({ faqs, testIdPrefix = "solution" }) {
  if (!faqs?.length) return null;
  return (
    <MarketingFaqSection
      eyebrow="FAQ"
      caveat="Industry-specific"
      title="Common questions"
      faqs={faqs}
      testIdPrefix={testIdPrefix}
      defaultOpen={0}
      className="mx-auto max-w-6xl"
    />
  );
}