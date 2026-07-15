export const PLAN_TIER = { free: 0, pro: 1, business: 2 };

export function planTier(planId) {
  return PLAN_TIER[(planId || "").toLowerCase()] ?? 0;
}

export function isHigherPlan(fromPlan, toPlan) {
  return planTier(toPlan) > planTier(fromPlan);
}

export function getUpgradePlanOptions(allPlans, currentPlan) {
  const current = (currentPlan || "free").toLowerCase();
  return (allPlans || []).filter(
    (p) => p.id !== "free" && planTier(p.id) > planTier(current),
  );
}