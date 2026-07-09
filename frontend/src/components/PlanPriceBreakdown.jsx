import React from "react";
import { formatGbp, UK_VAT_PERCENT } from "@/lib/pricing";

/**
 * Shows plan price with an ex-VAT slab and VAT / total lines for paid tiers.
 */
export function PlanPriceBreakdown({
  price,
  note,
  savings,
  tax,
  priceClassName = "font-heading text-4xl font-bold text-[var(--c-ink)]",
  noteClassName = "mb-1 text-sm text-[var(--c-muted-fg)]",
  compact = false,
}) {
  return (
    <div>
      {savings && (
        <span
          className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
          style={{ background: "#0d9488" }}
        >
          {savings}
        </span>
      )}
      <div className="flex flex-wrap items-end gap-x-1 gap-y-1">
        <span className={priceClassName}>{price}</span>
        {note ? <span className={noteClassName}>{note}</span> : null}
      </div>
      {tax ? (
        <div
          className={`mt-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] ${
            compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm"
          }`}
          data-testid="plan-tax-breakdown"
        >
          <div className="flex items-center justify-between gap-3 text-[var(--c-muted-fg)]">
            <span>VAT ({tax.vatPercent}%)</span>
            <span className="font-medium text-[var(--c-ink)]">{formatGbp(tax.vat)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--c-border)] pt-1 font-semibold text-[var(--c-ink)]">
            <span>Total incl. VAT</span>
            <span>{formatGbp(tax.total)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PricingVatFootnote({ className = "" }) {
  return (
    <p className={`text-sm text-[var(--c-muted-fg)] ${className}`}>
      All prices exclude VAT. UK VAT at {UK_VAT_PERCENT}% is added at checkout.
    </p>
  );
}