import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  hasPlanFeature,
  isBusinessPlan,
  isFeatureActive,
  isFreePlan,
  isPaidPlan,
  isProPlan,
  resolvePlanFeatures,
  shouldOfferUpgrade,
} from "@/lib/planFeatures";

export function usePlan() {
  const { user } = useAuth();
  const features = useMemo(() => resolvePlanFeatures(user), [user]);
  return {
    user,
    plan: features.plan,
    features,
    isPaid: isPaidPlan(user),
    isBusiness: isBusinessPlan(user),
    isPro: isProPlan(user),
    isFree: isFreePlan(user),
    has: (key) => hasPlanFeature(user, key),
    active: (key) => isFeatureActive(user, key),
    shouldOfferUpgrade: (key) => shouldOfferUpgrade(user, key),
  };
}