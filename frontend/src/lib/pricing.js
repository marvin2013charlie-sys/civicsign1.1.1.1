/** Shared pricing, Pro yearly = 10 months paid (2 months free). */
export const PRO_MONTHLY_GBP = 15;
export const YEARLY_MONTHS_PAID = 10;

export function proYearlyTotal() {
  return PRO_MONTHLY_GBP * YEARLY_MONTHS_PAID;
}

export function proYearlyMonthlyEquivalent() {
  return proYearlyTotal() / 12;
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
  if (planName === "Business") {
    return {
      price: "Custom",
      note: interval === "yearly" ? "annual plans available" : "tailored to your team",
      savings: null,
    };
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