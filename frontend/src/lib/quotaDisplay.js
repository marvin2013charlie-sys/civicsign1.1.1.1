/** Shared in-app quota copy — uses API period fields from /usage. */

export const QUOTA_PERIOD_SUFFIX = "this billing period";
export const QUOTA_DELETE_NOTE = "Deleting documents does not restore your allowance within the current billing period.";
export const QUOTA_SENT_ONLY_NOTE = "Only documents sent for signature count toward your limit — drafts and saved PDFs do not.";

export function isYearlyBilling(usage) {
  const interval = (usage?.billing_interval || "").toLowerCase();
  if (interval === "yearly") return true;
  const label = (usage?.period_label || usage?.month || "").toLowerCase();
  return label.includes("year");
}

export function quotaPeriodNoun(usage) {
  return isYearlyBilling(usage) ? "year" : "billing period";
}

export function formatQuotaCounter(usage) {
  if (!usage || usage.unlimited) return null;
  const used = usage.seat_used ?? usage.used ?? 0;
  const limit = usage.seat_limit ?? usage.limit ?? 0;
  return {
    used,
    limit,
    text: `${Number(used).toLocaleString()} / ${Number(limit).toLocaleString()} ${QUOTA_PERIOD_SUFFIX}`,
  };
}

export function formatQuotaCounterSuffix(usage) {
  return usage?.unlimited ? null : QUOTA_PERIOD_SUFFIX;
}

export function formatQuotaRemainingLine(usage) {
  if (!usage || usage.unlimited) return null;
  if (usage.at_limit || usage.used >= usage.limit) {
    return "Maximum reached · deleting documents does not restore allowance";
  }
  const remaining = usage.remaining ?? Math.max(0, (usage.limit ?? 0) - (usage.used ?? 0));
  const reset = usage.resets_label ? `resets ${usage.resets_label}` : "resets next billing cycle";
  return `${remaining} sent remaining · ${reset}`;
}

export function formatQuotaResetLabel(usage) {
  if (!usage) return "next billing cycle";
  return usage.resets_label || "next billing cycle";
}

export function formatQuotaResetSentence(usage) {
  return `Resets ${formatQuotaResetLabel(usage)}.`;
}

export function formatQuotaPeriodBadge(usage) {
  return usage?.month || usage?.period_label || "Current period";
}

/** Plan allowance label for stat cards — uses live /usage limit, not marketing defaults. */
export function formatPlanAllowanceLabel(usage) {
  if (!usage) return null;
  if (usage.unlimited) return "Unlimited documents";
  const limit = usage.seat_limit ?? usage.limit ?? 0;
  return `${Number(limit).toLocaleString()} documents / ${quotaPeriodNoun(usage)}`;
}

export function formatQuotaLimitReachedTitle() {
  return "Billing period limit reached";
}

export function formatQuotaLimitReachedMessage({ includeDeleteNote = true } = {}) {
  const base = "You've reached your document limit for this billing period.";
  return includeDeleteNote ? `${base} ${QUOTA_DELETE_NOTE}` : base;
}

export function formatQuotaNearLimitMessage() {
  return "You're almost out of documents this billing period. Upgrade to keep sending.";
}

export function formatOrgPoolUsageLine(usage) {
  if (usage?.org_used == null) return null;
  const cap = !usage.org_unlimited && usage.org_limit
    ? ` (cap ${usage.org_limit.toLocaleString()})`
    : "";
  return `Org pool: ${usage.org_used.toLocaleString()} documents ${QUOTA_PERIOD_SUFFIX}${cap}`;
}