/** Helpers for monthly document quota / rate-limit responses (HTTP 402). */
import { extractApiDetail } from "@/lib/api";

export function isQuotaExceeded(detail) {
  const d = extractApiDetail(detail) ?? detail;
  return Boolean(
    d && typeof d === "object" && (
      d.code === "quota_exceeded" ||
      d.rate_limited === true ||
      d.at_limit === true
    ),
  );
}

/** Server-driven or client-built purchase options for every plan at limit. */
export function purchaseOptionsForPlan(plan, atLimit = true, scope = "user") {
  if (!atLimit || scope === "organization") return {};
  const options = { buy_single_document_gbp: 1 };
  if (plan === "free") {
    options.upgrade_pro = true;
    options.upgrade_pro_amount_gbp = 15;
  } else if (plan === "pro") {
    options.upgrade_business = true;
  } else {
    options.contact_support = true;
  }
  return options;
}

export function buildQuotaDetailFromUsage(usage, message) {
  if (!usage) return null;
  const atLimit = usage.at_limit || (!usage.unlimited && usage.used >= usage.limit);
  const plan = usage.plan || "free";
  return {
    message:
      message ||
      "You've reached your monthly document limit. Deleting envelopes does not restore your allowance.",
    plan,
    used: usage.used,
    limit: usage.limit,
    at_limit: atLimit,
    rate_limited: atLimit,
    scope: usage.scope || "user",
    options: usage.purchase_options || purchaseOptionsForPlan(plan, atLimit, usage.scope),
  };
}

/**
 * On HTTP 402 / quota_exceeded: open modal with upgrade + £1 options.
 * Returns true when handled (caller should not show a generic error toast).
 */
export function handleQuotaApiError(err, { setDetail, setOpen }) {
  const status = err?.response?.status;
  const detail = extractApiDetail(err);

  if (isQuotaExceeded(detail) || status === 402) {
    const normalized = (detail && typeof detail === "object")
      ? detail
      : {
          message: typeof detail === "string"
            ? detail
            : "You've reached your monthly document limit.",
          code: "quota_exceeded",
          at_limit: true,
          rate_limited: true,
        };
    setDetail(normalized);
    setOpen(true);
    return true;
  }
  return false;
}