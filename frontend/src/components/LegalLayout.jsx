import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Cookie,
  FileText,
  Mail,
  MapPin,
  RefreshCw,
  Scale,
  Shield,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { RichTextWithContactEmail } from "@/components/BrandText";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { LEGAL_COMPANY, LEGAL_TRUST_POINTS } from "@/lib/legalConstants";

const POLICY_ICONS = {
  "/legal/privacy": Shield,
  "/legal/terms": Scale,
  "/legal/cookies": Cookie,
  "/legal/refunds": RefreshCw,
};

const SCRIPT_FONT = { fontFamily: "'Caveat', cursive" };

function LegalNav({ variant = "hero" }) {
  const { pathname } = useLocation();
  const isHero = variant === "hero";

  return (
    <nav
      className={
        isHero
          ? "-mx-1 flex gap-2 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible"
          : "flex flex-wrap gap-2 lg:flex-col lg:gap-1"
      }
      aria-label="Legal policies"
      data-testid="legal-nav"
    >
      {LEGAL_LINKS.map((item) => {
        const active = pathname === item.to;
        const Icon = POLICY_ICONS[item.to] || FileText;
        return (
          <Link
            key={item.to}
            to={item.to}
            data-testid={item.testid}
            className={
              isHero
                ? `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:shrink sm:text-sm ${
                    active
                      ? "bg-[var(--c-ink-solid)] text-white shadow-sm"
                      : "border border-[var(--c-border)] bg-[var(--card)] text-[var(--c-ink)] hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
                  }`
                : `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[var(--c-primary)]/10 font-medium text-[var(--c-primary)]"
                      : "text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
                  }`
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {isHero ? item.label : item.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}

function SectionContent({ section, index }) {
  return (
    <section
      id={`sec-${index}`}
      className="scroll-mt-header-loose rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-5 sm:p-8"
      data-testid={`legal-section-${index}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-heading text-sm font-bold"
          style={{
            background: "var(--badge-teal-bg)",
            color: "var(--badge-teal-fg)",
            border: "1px solid color-mix(in srgb, var(--c-primary) 22%, transparent)",
          }}
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-bold tracking-tight text-[var(--c-ink)] sm:text-[1.35rem]">
            {section.heading}
          </h2>

          {(section.paragraphs || []).map((p, j) => (
            <p key={j} className="mt-4 text-[15px] leading-[1.75] text-[var(--c-muted-fg)]">
              <RichTextWithContactEmail text={p} />
            </p>
          ))}

          {section.list && (
            <ul className="mt-4 space-y-2.5">
              {section.list.map((li, k) => (
                <li key={k} className="flex gap-3 text-[15px] leading-[1.7] text-[var(--c-muted-fg)]">
                  <span
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--c-primary)" }}
                  />
                  <span>
                    <RichTextWithContactEmail text={li} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {section.table && (
            <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--c-border)]">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)]">
                    {section.table.headers.map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-ink)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-[var(--c-border)] last:border-0">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-3 align-top text-[var(--c-muted-fg)]">
                          <RichTextWithContactEmail text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section.callout && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${
                section.callout.type === "warning"
                  ? "border-[var(--status-sent-border)] bg-[var(--status-sent-bg)] text-[var(--c-ink)]"
                  : "border-[var(--c-primary)]/25 bg-[var(--c-primary)]/5 text-[var(--c-ink)]"
              }`}
            >
              <RichTextWithContactEmail text={section.callout.text} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Highlight the current section in the desktop TOC as the reader scrolls.
    Scroll-based (not IntersectionObserver) so it always resolves to a section,
    even when a tall section fully fills the viewport. */
function useScrollSpy(count) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!count) return undefined;
    const threshold = 160; // px below the sticky header
    const compute = () => {
      let current = 0;
      for (let i = 0; i < count; i += 1) {
        const el = document.getElementById(`sec-${i}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) current = i;
        else break;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [count]);
  return active;
}

/** Thin teal reading-progress bar under the site header. */
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const next = max > 0 ? Math.min(100, Math.max(0, (doc.scrollTop / max) * 100)) : 0;
      setPct((prev) => (Math.abs(prev - next) < 0.4 ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="sticky top-0 z-20 h-[3px] w-full bg-transparent" aria-hidden>
      <div
        className="h-full transition-[width] duration-150 ease-out"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, var(--c-logo-dot), var(--c-primary))",
        }}
      />
    </div>
  );
}

export const LegalLayout = ({
  title,
  updated,
  intro,
  highlights = [],
  sections = [],
}) => {
  const { pathname } = useLocation();
  const HeroIcon = POLICY_ICONS[pathname] || FileText;
  const activeSection = useScrollSpy(sections.length);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const readMinutes = Math.max(
    2,
    Math.round(
      sections.reduce(
        (n, s) =>
          n +
          (s.paragraphs || []).join(" ").split(/\s+/).length +
          (s.list || []).join(" ").split(/\s+/).length,
        0,
      ) / 200,
    ),
  );

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />
      <ReadingProgress />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: "var(--badge-teal-bg)" }}
              >
                <HeroIcon className="h-4 w-4" style={{ color: "var(--badge-teal-fg)" }} />
              </span>
              <span className="text-[1.6rem] leading-none" style={{ ...SCRIPT_FONT, color: "var(--c-primary-hover)" }}>
                The fine print, made readable
              </span>
            </div>
            <h1 className="mt-4 font-heading text-[1.85rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl lg:text-[2.7rem]">
              {title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--c-muted-fg)]">
              {updated && (
                <span>
                  Last updated <span className="font-medium text-[var(--c-ink)]">{updated}</span>
                </span>
              )}
              <span className="hidden h-1 w-1 rounded-full bg-[var(--c-muted-fg)]/50 sm:inline-block" />
              <span>{readMinutes} min read</span>
              <span className="hidden h-1 w-1 rounded-full bg-[var(--c-muted-fg)]/50 sm:inline-block" />
              <span>{sections.length} sections</span>
            </div>
            {intro && (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">
                {intro}
              </p>
            )}
            <div className="mt-6 hidden sm:block">
              <LegalNav variant="hero" />
            </div>
          </div>

          {highlights.length > 0 && (
            <ul className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--c-ink)] shadow-sm"
                >
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--c-primary)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10 lg:py-14">
        <aside className="mb-2 lg:mb-0">
          <details className="group rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] lg:hidden" data-testid="legal-mobile-toc">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--c-ink)] [&::-webkit-details-marker]:hidden">
              On this page
              <span className="text-xs font-medium text-[var(--c-muted-fg)] group-open:hidden">Show</span>
              <span className="hidden text-xs font-medium text-[var(--c-muted-fg)] group-open:inline">Hide</span>
            </summary>
            <div className="border-t border-[var(--c-border)] px-3 pb-3 pt-2">
              <div className="max-h-[40vh] space-y-0.5 overflow-y-auto cs-scroll">
                {sections.map((s, i) => (
                  <a
                    key={i}
                    href={`#sec-${i}`}
                    className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm text-[var(--c-muted-fg)]"
                  >
                    <span className="w-5 shrink-0 text-right font-heading text-xs tabular-nums text-[var(--c-muted-fg)]/60">
                      {i + 1}
                    </span>
                    {s.heading}
                  </a>
                ))}
              </div>
              <div className="mt-3 border-t border-[var(--c-border)] pt-3">
                <LegalNav variant="sidebar" />
              </div>
            </div>
          </details>
          <div className="hidden lg:block lg:sticky lg:top-[calc(var(--site-header-height,64px)+1.5rem)]">
            <nav className="rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                On this page
              </p>
              <div className="max-h-[50vh] space-y-0.5 overflow-y-auto cs-scroll pr-1">
                {sections.map((s, i) => {
                  const active = i === activeSection;
                  return (
                    <a
                      key={i}
                      href={`#sec-${i}`}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-[var(--badge-teal-bg)] font-medium text-[var(--badge-teal-fg)]"
                          : "text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
                      }`}
                    >
                      <span
                        className="w-5 shrink-0 text-right font-heading text-xs tabular-nums"
                        style={{ color: active ? "var(--c-primary)" : "var(--c-muted-fg)" }}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate">{s.heading}</span>
                    </a>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-[var(--c-border)] pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                  All policies
                </p>
                <LegalNav variant="sidebar" />
              </div>
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {sections.map((s, i) => (
            <SectionContent key={i} section={s} index={i} />
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                Questions?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                For privacy, billing, or general enquiries, contact us and we will respond as soon as we can.
              </p>
              <Link
                to="/contact"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-primary)] hover:underline"
              >
                <Mail className="h-4 w-4" />
                Contact us
              </Link>
            </div>
            <div className="rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                {LEGAL_COMPANY.name}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--c-primary)]" />
                {LEGAL_COMPANY.address}
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-4 text-xs leading-relaxed text-[var(--c-muted-fg)]">
            This document is provided for general information only and does not constitute legal advice.
            CivicSign recommends consulting qualified counsel for your specific circumstances.
            Related policies:{" "}
            {LEGAL_LINKS.filter((l) => l.to !== pathname).map((l, i, arr) => (
              <span key={l.to}>
                <Link to={l.to} className="font-medium text-[var(--c-primary)] hover:underline">
                  {l.shortLabel}
                </Link>
                {i < arr.length - 1 ? ", " : "."}
              </span>
            ))}
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--c-muted-fg)]">
            {LEGAL_TRUST_POINTS.map((point) => (
              <li key={point} className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[var(--c-primary)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
};
