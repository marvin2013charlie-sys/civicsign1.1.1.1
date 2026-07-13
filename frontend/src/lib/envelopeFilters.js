export const ENVELOPE_STATUS_FILTERS = new Set(["all", "awaiting", "completed", "draft", "declined"]);

/** Map dashboard / documents list status query values to a safe filter id. */
export function normalizeEnvelopeStatusFilter(value) {
  return ENVELOPE_STATUS_FILTERS.has(value) ? value : "all";
}

/** Deep-link path for dashboard envelope list filters. */
export function envelopeFilterPath(filter) {
  const normalized = normalizeEnvelopeStatusFilter(filter);
  return normalized === "all" ? "/dashboard" : `/dashboard?status=${normalized}`;
}

/** Map raw envelope status counts (draft, sent, viewed, …) to dashboard filter pills. */
export function envelopeStatusToDashboardFilter(statusKey) {
  if (statusKey === "draft") return "draft";
  if (statusKey === "completed") return "completed";
  if (statusKey === "declined") return "declined";
  if (statusKey === "sent" || statusKey === "viewed") return "awaiting";
  return "all";
}