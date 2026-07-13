/** Paid-plan signup → verify → Stripe checkout routing helpers. */

export const PAID_PLAN_IDS = new Set(["pro", "business"]);

export function normalizePaidPlanId(plan) {
  const id = (plan || "").toLowerCase();
  return PAID_PLAN_IDS.has(id) ? id : null;
}

export function normalizeBillingInterval(interval) {
  return interval === "yearly" ? "yearly" : "monthly";
}

/** Post-auth destination: subscription tab with auto-checkout for a paid plan. */
export function buildPostAuthCheckoutPath(planId, billingInterval = "monthly") {
  const plan = normalizePaidPlanId(planId);
  if (!plan) return null;
  const params = new URLSearchParams({
    tab: "subscription",
    upgrade: plan,
    checkout: "1",
    interval: normalizeBillingInterval(billingInterval),
  });
  return `/settings?${params.toString()}`;
}

/** Register URL that preserves plan intent through verify-email → checkout. */
export function buildPlanSignupPath(planId, billingInterval = "monthly") {
  const plan = normalizePaidPlanId(planId);
  if (!plan) return "/register";
  const checkoutPath = buildPostAuthCheckoutPath(plan, billingInterval);
  const params = new URLSearchParams({
    plan,
    interval: normalizeBillingInterval(billingInterval),
    next: checkoutPath,
  });
  return `/register?${params.toString()}`;
}

/** CTA target for pricing cards — register first or straight to checkout if signed in. */
export function buildPlanCtaPath(planName, billingInterval = "monthly", user = null) {
  const planId = (planName || "").toLowerCase();
  if (planId === "free") return "/register";
  const checkoutPath = buildPostAuthCheckoutPath(planId, billingInterval);
  if (!checkoutPath) return "/register";
  if (user) return checkoutPath;
  return buildPlanSignupPath(planId, billingInterval);
}