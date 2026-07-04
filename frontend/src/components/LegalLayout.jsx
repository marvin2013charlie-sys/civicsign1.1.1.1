import React, { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";

export const LegalLayout = ({ title, updated, intro, sections = [] }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />
      {/* Hero band */}
      <div className="border-b border-[var(--c-border)] bg-[var(--c-ink-solid)]">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          {updated && <p className="mt-2 text-sm text-white/60">Last updated: {updated}</p>}
          {intro && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80">{intro}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[220px_1fr]">
        {/* TOC */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">On this page</p>
            {sections.map((s, i) => (
              <a key={i} href={`#sec-${i}`} className="block rounded-md px-2 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]">
                {s.heading}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <article className="max-w-3xl">
          {sections.map((s, i) => (
            <section key={i} id={`sec-${i}`} className="mb-9 scroll-mt-24">
              <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">{i + 1}. {s.heading}</h2>
              {(s.paragraphs || []).map((p, j) => (
                <p key={j} className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{p}</p>
              ))}
              {s.list && (
                <ul className="mt-3 space-y-2">
                  {s.list.map((li, k) => (
                    <li key={k} className="flex gap-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--c-primary)" }} />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <div className="mt-10 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4 text-xs text-[var(--muted-foreground)]">
            This document is provided for general informational purposes and does not constitute legal advice. CivicSign recommends consulting qualified counsel for your specific circumstances.
          </div>
        </article>
      </div>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
};
