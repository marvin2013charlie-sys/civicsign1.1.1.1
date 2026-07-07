import React from "react";

/**
 * Monthly / yearly billing toggle with sliding pill (yearly = 10 months paid).
 */
export function BillingIntervalToggle({ value, onChange, className = "" }) {
  const yearly = value === "yearly";
  return (
    <div
      className={`inline-flex flex-col items-center gap-2 sm:flex-row sm:gap-3 ${className}`}
      data-testid="billing-interval-toggle"
    >
      <div
        className="relative inline-flex rounded-full border border-[var(--c-border)] bg-[var(--card)] p-1"
        role="group"
        aria-label="Billing interval"
      >
        <span
          className="pointer-events-none absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out"
          style={{
            left: yearly ? "calc(50% + 2px)" : "4px",
            width: "calc(50% - 6px)",
            background: "var(--c-primary)",
            boxShadow: "0 4px 14px rgba(20,184,166,0.35)",
          }}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className="relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors"
          style={{ color: !yearly ? "#fff" : "var(--c-ink)" }}
          data-testid="billing-interval-monthly"
          aria-pressed={!yearly}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange("yearly")}
          className="relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors"
          style={{ color: yearly ? "#fff" : "var(--c-ink)" }}
          data-testid="billing-interval-yearly"
          aria-pressed={yearly}
        >
          Yearly
        </button>
      </div>
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
        style={{
          background: yearly ? "var(--status-sent-bg)" : "transparent",
          color: yearly ? "var(--c-primary)" : "var(--c-muted-fg)",
          border: yearly ? "1px solid rgba(20,184,166,0.25)" : "1px solid transparent",
        }}
      >
        {yearly ? "2 months free on annual" : "Save with yearly billing"}
      </span>
    </div>
  );
}