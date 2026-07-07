/** Plan feature flags, mirrors backend plan_features.py */

const PLAN_RANK = { free: 0, pro: 1, business: 2 };

/** Minimum plan required to use each feature (matches backend _BUSINESS_ONLY + pro flags). */
export const FEATURE_MIN_PLAN = {
  auto_reminders: "free",
  team_templates: "pro",
  comments: "pro",
  seal_verification: "pro", // Pro and Business (minimum paid tier)
  custom_branding: "pro",
  public_links: "pro",
  ses_signatures: "pro",
  aes_signatures: "pro",
  recipient_auth: "business",
  bulk_send: "business",
  api_webhooks: "business",
  priority_support: "business",
};

const DEFAULT_FEATURES = {
  plan: "free",
  monthly_quota: 5,
  max_recipients: 2,
  ses_signatures: false,
  aes_signatures: false,
  qes_available: false,
  team_templates: false,
  comments: false,
  seal_verification: false,
  custom_branding: false,
  public_links: false,
  auto_reminders: true,
  recipient_auth: false,
  bulk_send: false,
  api_webhooks: false,
  priority_support: false,
};

/** Full Business tier — organisation contract accounts receive the same feature set. */
const BUSINESS_FEATURES = {
  plan: "business",
  monthly_quota: 500,
  max_recipients: null,
  ses_signatures: true,
  aes_signatures: true,
  qes_available: false,
  team_templates: true,
  comments: true,
  seal_verification: true,
  custom_branding: true,
  public_links: true,
  auto_reminders: true,
  recipient_auth: true,
  bulk_send: true,
  api_webhooks: true,
  priority_support: true,
};

export function resolvePlanFeatures(user) {
  const base = { ...DEFAULT_FEATURES, ...(user?.plan_features || {}) };
  if (user?.org_id) {
    return {
      ...base,
      ...BUSINESS_FEATURES,
      organisation_plan: true,
      pricing_note:
        "Organisation plan: 500 documents per seat per month. Contract rates agreed in your onboarding meeting.",
    };
  }
  return base;
}

export function planRank(plan) {
  return PLAN_RANK[plan] ?? 0;
}

export function featureMinPlan(feature) {
  return FEATURE_MIN_PLAN[feature] || "business";
}

export function hasPlanFeature(user, key) {
  return !!resolvePlanFeatures(user)[key];
}

/** True when the signed-in user's plan includes this feature — show the control. */
export function isFeatureActive(user, feature) {
  return hasPlanFeature(user, feature);
}

/**
 * In-product upgrade teaser: only Free users see Pro upsells.
 * Pro users never see Business feature banners in the app (use Subscription or Contact instead).
 */
export function shouldOfferUpgrade(user, feature) {
  if (hasPlanFeature(user, feature)) return false;
  const plan = resolvePlanFeatures(user).plan;
  if (plan !== "free") return false;
  return featureMinPlan(feature) === "pro";
}

export function isPaidPlan(user) {
  const plan = resolvePlanFeatures(user).plan;
  return plan === "pro" || plan === "business";
}

export function isBusinessPlan(user) {
  return resolvePlanFeatures(user).plan === "business";
}

export function isProPlan(user) {
  return resolvePlanFeatures(user).plan === "pro";
}

export function isFreePlan(user) {
  return resolvePlanFeatures(user).plan === "free";
}