/** Shared pricing — yearly = 10 months paid (2 months free). */
export const PRO_MONTHLY_GBP = 15;
export const BUSINESS_MONTHLY_GBP = 79;
/** Pay-as-you-go when monthly plan allowance is used up (all self-serve plans). */
export const EXTRA_DOCUMENT_PRICE_GBP = 0.8;

export function formatExtraDocumentPrice() {
  return EXTRA_DOCUMENT_PRICE_GBP < 1 ? "80p" : formatGbp(EXTRA_DOCUMENT_PRICE_GBP);
}
export const YEARLY_MONTHS_PAID = 10;

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

/** @param {"monthly"|"yearly"} interval */
export function getPlanPriceDisplay(planName, interval = "monthly") {
  if (planName === "Free") {
    return { price: "£0", note: "forever", savings: null };
  }
  if (planName === "Organisation") {
    return {
      price: "Custom",
      note: "tailored multi-seat contract",
      savings: null,
    };
  }
  if (planName === "Business") {
    if (interval === "yearly") {
      const yearly = businessYearlyTotal();
      const equiv = businessYearlyMonthlyEquivalent();
      return {
        price: formatGbp(yearly),
        note: `per user / year · ${formatGbp(equiv)}/mo`,
        savings: "Save 2 months",
      };
    }
    return { price: formatGbp(BUSINESS_MONTHLY_GBP), note: "per user / month", savings: null };
  }
  if (planName === "Pro") {
    if (interval === "yearly") {
      const yearly = proYearlyTotal();
      const equiv = proYearlyMonthlyEquivalent();
      return {
        price: formatGbp(yearly),
        note: `per user / year · ${formatGbp(equiv)}/mo`,
        savings: "Save 2 months",
      };
    }
    return { price: formatGbp(PRO_MONTHLY_GBP), note: "per user / month", savings: null };
  }
  return { price: "—", note: "", savings: null };
}