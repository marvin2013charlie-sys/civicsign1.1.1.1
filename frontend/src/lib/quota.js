/** Helpers for document quota / rate-limit responses (HTTP 402). */
import { extractApiDetail } from "@/lib/api";
import { EXTRA_DOCUMENT_PRICE_GBP } from "@/lib/pricing";
import { formatQuotaLimitReachedMessage } from "@/lib/quotaDisplay";

/** Self-serve upgrade CTA — Free and Pro only (not Business or Organisation). */
export function canUpgradePlan(usage) {
  if (!usage) return false;
  if ((usage.scope || "user") === "organization") return false;
  const plan = (usage.plan || "free").toLowerCase();
  return plan === "free" || plan === "pro";
}

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
  const options = { buy_single_document_gbp: EXTRA_DOCUMENT_PRICE_GBP };
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
  const scope = usage.scope || "user";
  const isOrgStaff = scope === "organization" && usage.is_org_owner === false;
  return {
    message:
      message ||
      (isOrgStaff
        ? "You've reached your allowance for this billing period. Contact your organisation admin — they can escalate to CivicSign if required."
        : formatQuotaLimitReachedMessage()),
    plan,
    used: usage.used,
    limit: usage.limit,
    at_limit: atLimit,
    rate_limited: atLimit,
    scope,
    is_org_owner: usage.is_org_owner,
    options: usage.purchase_options || purchaseOptionsForPlan(plan, atLimit, scope),
  };
}

/**
 * On HTTP 402 / quota_exceeded: open modal with upgrade + 80p pay-as-you-go options.
 * Returns true when handled (caller should not show a generic error toast).
 */
export function handleQuotaApiError(err, { setDetail, setOpen }) {
  const status = err?.response?.status;
  const detail = extractApiDetail(err);

  if (isQuotaExceeded(detail) || status === 402) {
    const normalized = (detail && typeof detail === "object")
      ? {
          ...detail,
          is_org_owner: detail.is_org_owner,
        }
      : {
          message: typeof detail === "string"
            ? detail
            : formatQuotaLimitReachedMessage({ includeDeleteNote: false }),
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