import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CircleHelp, ChevronDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizeFaq(item) {
  if (Array.isArray(item)) return { q: item[0], a: item[1] };
  return { q: item.q, a: item.a };
}

/**
 * Public marketing FAQ — Caveat header, portal surface accordion cards.
 * Accepts faqs as [question, answer] tuples or { q, a } objects.
 */
export function MarketingFaqSection({
  id = "faq",
  eyebrow,
  caveat = "Common questions",
  title = "Frequently asked questions",
  subtitle,
  faqs = [],
  testIdPrefix = "faq",
  showContactCta = false,
  className,
  defaultOpen = 0,
  centered = true,
  embedded = false,
  renderAnswer,
}) {
  const [openIndex, setOpenIndex] = useState(defaultOpen);
  const items = faqs.map(normalizeFaq);
  if (!items.length) return null;

  const list = (
    <div className={cn("flex flex-col gap-3", !embedded && "mx-auto mt-10 max-w-3xl")}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpenIndex(isOpen ? -1 : i)}
            aria-expanded={isOpen}
            data-testid={`${testIdPrefix}-faq-${i}`}
            className="cs-portal-surface-card rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-px hover:shadow-md sm:px-6 sm:py-5"
            style={{
              borderLeft: isOpen ? "3px solid var(--c-primary)" : "3px solid transparent",
              boxShadow: isOpen ? "0 0 0 1px color-mix(in srgb, var(--c-primary) 22%, var(--c-border))" : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-left text-[15px] font-semibold leading-snug text-[var(--c-ink)] sm:text-base">
                {item.q}
              </span>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all"
                style={
                  isOpen
                    ? { background: "var(--c-primary)", color: "#fff" }
                    : { background: "var(--c-paper-2)", color: "var(--c-muted-fg)" }
                }
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              </span>
            </div>
            {isOpen ? (
              <div className="mt-3 max-w-[640px] text-sm leading-relaxed text-[var(--c-muted-fg)] sm:text-[15px]">
                {renderAnswer ? renderAnswer(item) : item.a}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (embedded) {
    return (
      <div className={className} data-testid={`${testIdPrefix}-section`}>
        {list}
      </div>
    );
  }

  return (
    <section
      id={id}
      className={cn("scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20", className)}
      data-testid={`${testIdPrefix}-section`}
    >
      <div className={cn("mx-auto max-w-3xl", centered && "text-center")}>
        {eyebrow ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <CircleHelp className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
            {eyebrow}
          </span>
        ) : null}
        <p
          className={cn(eyebrow ? "mt-4" : "", !centered && "text-left")}
          style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", fontWeight: 600, color: "var(--c-primary-hover)" }}
        >
          {caveat}
        </p>
        <h2
          className={cn(
            "mt-1 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl",
            !centered && "text-left",
          )}
        >
          {title}<span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
        {subtitle ? (
          <p className={cn("mt-3 text-base leading-relaxed text-[var(--c-muted-fg)]", centered && "mx-auto max-w-2xl")}>
            {subtitle}
          </p>
        ) : null}
      </div>

      {list}

      {showContactCta ? (
        <div
          className="cs-portal-surface-card mx-auto mt-10 max-w-3xl rounded-2xl p-6 text-center sm:p-8"
          style={{ background: "color-mix(in srgb, var(--c-primary) 5%, var(--c-portal-card))" }}
        >
          <MessageSquare className="mx-auto h-6 w-6" style={{ color: "var(--c-primary)" }} />
          <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">Still have a question?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--c-muted-fg)]">
            Our team typically replies within one business day.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px"
            style={{ background: "var(--c-ink-solid)", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
          >
            Contact support
          </Link>
        </div>
      ) : null}
    </section>
  );
}