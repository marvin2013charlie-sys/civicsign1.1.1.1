/** Shared pricing — yearly = 10 months paid (2 months free). All plan prices exclude UK VAT. */
export const PRO_MONTHLY_GBP = 15;
export const BUSINESS_MONTHLY_GBP = 79;
/** Pay-as-you-go when monthly plan allowance is used up (all self-serve plans). */
export const EXTRA_DOCUMENT_PRICE_GBP = 0.8;
export const UK_VAT_RATE = 0.2;
export const UK_VAT_PERCENT = 20;

export function formatExtraDocumentPrice({ includeTaxNote = false } = {}) {
  const base = EXTRA_DOCUMENT_PRICE_GBP < 1 ? "80p" : formatGbp(EXTRA_DOCUMENT_PRICE_GBP);
  return includeTaxNote ? `${base} excl. VAT` : base;
}

/** Plan card / feature bullet for pay-as-you-go overage. */
export function extraDocumentLimitFeature() {
  return `${formatExtraDocumentPrice({ includeTaxNote: true })} per extra document when at limit`;
}

/** Short Pro plan label for upgrade CTAs. */
export function formatProMonthlyShort() {
  return `£${PRO_MONTHLY_GBP}/month excl. VAT`;
}

/** Checkout / modal label for a single extra document. */
export function formatExtraDocumentBuyLabel({ quantity = 1 } = {}) {
  const tax = calculateTax(EXTRA_DOCUMENT_PRICE_GBP * quantity);
  if (quantity === 1) {
    return `Buy 1 extra document, ${formatExtraDocumentPrice({ includeTaxNote: true })} (${formatGbp(tax.total)} incl. VAT)`;
  }
  return `Buy ${quantity} extra documents, ${formatGbp(tax.net)} excl. VAT (${formatGbp(tax.total)} incl. VAT)`;
}

/** Inline sentence for quota-limit banners. */
export function formatExtraDocumentLimitMessage() {
  const tax = calculateTax(EXTRA_DOCUMENT_PRICE_GBP);
  return `buy one extra document for ${formatExtraDocumentPrice({ includeTaxNote: true })} (${formatGbp(tax.total)} incl. VAT)`;
}

/** Refund policy / legal copy for extra document credits. */
export function formatExtraDocumentPolicyText() {
  return `${formatExtraDocumentPrice({ includeTaxNote: true })} per extra document (${formatGbp(calculateTax(EXTRA_DOCUMENT_PRICE_GBP).total)} incl. VAT)`;
}

export const PRO_MONTHLY_DOCS = 100;
export const PRO_YEARLY_DOCS = 1200;
export const BUSINESS_MONTHLY_DOCS = 600;
export const BUSINESS_YEARLY_DOCS = BUSINESS_MONTHLY_DOCS * 12;

export const YEARLY_MONTHS_PAID = 10;

/** @param {"Pro"|"Business"|"Free"} planName @param {"monthly"|"yearly"} interval */
export function planDocumentLimit(planName, interval = "monthly") {
  if (planName === "Pro") {
    return interval === "yearly" ? PRO_YEARLY_DOCS : PRO_MONTHLY_DOCS;
  }
  if (planName === "Business") {
    return interval === "yearly" ? BUSINESS_YEARLY_DOCS : BUSINESS_MONTHLY_DOCS;
  }
  return 2;
}

/** @param {"Pro"|"Business"|"Free"} planName @param {"monthly"|"yearly"} interval */
export function formatPlanDocumentLimit(planName, interval = "monthly") {
  const count = planDocumentLimit(planName, interval);
  if (planName === "Free") {
    return `${count} documents / billing period (resets on signup date)`;
  }
  if (interval === "yearly") {
    return `Up to ${count.toLocaleString()} documents per user / year`;
  }
  return `Up to ${count.toLocaleString()} documents per user / billing period`;
}

export function proYearlyTotal() {
  return PRO_MONTHLY_GBP * YEARLY_MONTHS_PAID;
}

export function businessYearlyTotal() {
  return BUSINESS_MONTHLY_GBP * YEARLY_MONTHS_PAID;
}

export function proYearlyMonthlyEquivalent() {
  return proYearlyTotal() / 12;
}

export function businessYearlyMonthlyEquivalent() {
  return businessYearlyTotal() / 12;
}

export function formatGbp(amount, { decimals = amount % 1 !== 0 } = {}) {
  const n = Number(amount);
  if (decimals) return `£${n.toFixed(2)}`;
  return `£${Math.round(n)}`;
}

/** @param {number} net Ex-VAT amount */
export function calculateTax(net) {
  const n = Number(net);
  const vat = Math.round(n * UK_VAT_RATE * 100) / 100;
  const total = Math.round((n + vat) * 100) / 100;
  return {
    net: n,
    vat,
    total,
    vatPercent: UK_VAT_PERCENT,
  };
}

/** @param {"monthly"|"yearly"} interval */
export function getPlanPriceDisplay(planName, interval = "monthly") {
  if (planName === "Free") {
    return { price: "£0", note: "forever", savings: null, tax: null };
  }
  if (planName === "Organisation") {
    return {
      price: "Custom",
      note: "tailored multi-seat contract",
      savings: null,
      tax: null,
    };
  }
  if (planName === "Business") {
    if (interval === "yearly") {
      const yearly = businessYearlyTotal();
      const equiv = businessYearlyMonthlyEquivalent();
      return {
        price: formatGbp(yearly),
        note: `per user / year excl. VAT · ${formatGbp(equiv)}/mo`,
        savings: "Save 2 months",
        tax: calculateTax(yearly),
      };
    }
    return {
      price: formatGbp(BUSINESS_MONTHLY_GBP),
      note: "per user / month excl. VAT",
      savings: null,
      tax: calculateTax(BUSINESS_MONTHLY_GBP),
    };
  }
  if (planName === "Pro") {
    if (interval === "yearly") {
      const yearly = proYearlyTotal();
      const equiv = proYearlyMonthlyEquivalent();
      return {
        price: formatGbp(yearly),
        note: `per user / year excl. VAT · ${formatGbp(equiv)}/mo`,
        savings: "Save 2 months",
        tax: calculateTax(yearly),
      };
    }
    return {
      price: formatGbp(PRO_MONTHLY_GBP),
      note: "per user / month excl. VAT",
      savings: null,
      tax: calculateTax(PRO_MONTHLY_GBP),
    };
  }
  return { price: "—", note: "", savings: null, tax: null };
}