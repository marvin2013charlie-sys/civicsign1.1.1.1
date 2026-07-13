import React from "react";
import { Link } from "react-router-dom";
import { getRelatedSolutions } from "@/lib/solutionsNav";
import { H_FONT, MARKETING_CARD, SECTION_EYEBROW } from "@/lib/marketingUi";

const MARQUEE_COMPANIES = [
  "Northwind Studio", "Brightwave", "Tertia", "Apex Recruitment",
  "Harbor & Co", "Ledgerly Finance", "Cedar Health", "Owens & Price",
];

export function SolutionMarquee() {
  return (
    <section className="overflow-hidden border-y border-[var(--c-border)] bg-[var(--card)] py-4" aria-hidden="true">
      <style>{`
        @keyframes sol-shared-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion: reduce){.sol-shared-marquee{animation:none !important}}
      `}</style>
      <div
        className="sol-shared-marquee flex w-max gap-[72px] whitespace-nowrap text-[14px] font-semibold text-[var(--c-muted-fg)]/60"
        style={{ ...H_FONT, animation: "sol-shared-marquee 28s linear infinite" }}
      >
        {[...MARQUEE_COMPANIES, ...MARQUEE_COMPANIES].map((c, i) => (
          <span key={`${c}-${i}`}>{c}</span>
        ))}
      </div>
    </section>
  );
}

export function RelatedSolutionsSection({ solutionPath }) {
  const related = getRelatedSolutions(solutionPath, 3);
  if (!related.length) return null;
  return (
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
  );
}