import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { H_FONT } from "@/lib/marketingUi";

/**
 * Hero industry label for solution pages — replaces the old Solutions › breadcrumb.
 */
export function SolutionIndustryBadge({ label, Icon }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3" data-testid="solution-industry-badge">
      <Link
        to="/solutions"
        className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)]/80 px-3 py-1.5 text-[12px] font-semibold text-[var(--c-muted-fg)] shadow-sm backdrop-blur transition-all hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
        data-testid="solution-back-to-hub"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        All solutions
      </Link>
      <div
        className="inline-flex items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] py-2 pl-2 pr-5 shadow-[0_8px_24px_rgba(18,33,32,.07)]"
        style={{ boxShadow: "0 8px 24px rgba(18,33,32,.07), 0 0 0 1px rgba(20,184,166,.08)" }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
          style={{ background: "linear-gradient(135deg, var(--badge-teal-bg), rgba(20,184,166,.22))" }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: "var(--c-primary)" }} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Industry</p>
          <p className="truncate text-[15px] font-semibold leading-tight text-[var(--c-ink)]" style={H_FONT}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Strip "Solutions · " prefix from layout industry strings. */
export function solutionIndustryLabel(industry) {
  return (industry || "").replace(/^Solutions ·\s*/, "");
}