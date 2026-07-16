import {
  extraDocumentLimitFeature,
  formatPlanDocumentLimit,
  formatQuotaResetFaqAnswer,
  formatSubscriptionTrialTag,
  SUBSCRIPTION_TRIAL_DAYS_DEFAULT,
} from "@/lib/pricing";

function paidPlanTrialFeature(trialDays = SUBSCRIPTION_TRIAL_DAYS_DEFAULT) {
  const tag = formatSubscriptionTrialTag(trialDays);
  return tag ? `${tag} — card required, billed as normal after trial` : null;
}

export function buildPricingPlans(billingInterval = "monthly", trialDays = SUBSCRIPTION_TRIAL_DAYS_DEFAULT) {
  const trialFeature = paidPlanTrialFeature(trialDays);
  const trialTag = formatSubscriptionTrialTag(trialDays) || "For growing teams";
  return [
    {
      name: "Free",
      tag: "For trying things out",
      cta: "Start free",
      to: "/register",
      highlight: false,
      accent: "teal",
      features: [
        formatPlanDocumentLimit("Free", billingInterval),
        extraDocumentLimitFeature(),
        "1 sender",
        "Draw, type & upload signatures",
        "Audit trail + Certificate of Completion",
        "PDF & Word support",
      ],
    },
    {
      name: "Pro",
      tag: trialTag,
      cta: "Try Pro free",
      highlight: true,
      accent: "coral",
      features: [
        "All Free features, plus:",
        ...(trialFeature ? [trialFeature] : []),
        formatPlanDocumentLimit("Pro", billingInterval),
        "2-in-1: Manage PDF — edit, compress, watermark, protect, merge & split",
        "SES & AES signatures (UK eIDAS)",
        "Shared team templates",
        "Custom branding (logo & colours)",
      ],
    },
    {
      name: "Business",
      tag: trialTag,
      cta: "Try Business free",
      highlight: false,
      accent: "teal",
      features: [
        "Everything in Pro, plus:",
        ...(trialFeature ? [trialFeature] : []),
        formatPlanDocumentLimit("Business", billingInterval),
        "AES default + KBA recipient authentication",
        "Bulk send",
        "API & webhooks",
        "Priority support",
      ],
    },
  ];
}

export const PRICING_COMPARISON_ROWS = [
  { label: "Manage PDF (2-in-1)", free: false, pro: true, business: true },
  { label: "UK eIDAS signatures", free: "Basic", pro: "SES & AES", business: "AES + KBA" },
  { label: "Shared templates", free: false, pro: true, business: true },
  { label: "Custom branding", free: false, pro: true, business: true },
  { label: "Bulk send", free: false, pro: false, business: true },
  { label: "API & webhooks", free: false, pro: false, business: true },
];

export const PRICING_FAQS = [
  ["Do I need a card to start?", "No. The Free plan is free forever with no card. When you upgrade to Pro or Business for the first time, you get a 30-day free trial — card required at checkout. You are not charged until the trial ends; after 30 days, billing continues at your chosen plan price unless you cancel."],
  ["How does the 30-day free trial work?", "On your first upgrade to Pro or Business, Stripe collects your card but charges £0 today. You get full plan access for 30 days. When the trial ends, your subscription renews at the normal monthly or yearly price (plus VAT). Cancel anytime from Settings before day 31 to avoid being charged."],
  ["When does my document limit reset?", formatQuotaResetFaqAnswer()],
  ["Is Manage PDF on every plan?", "Manage PDF is included on Pro, Business, and Organisation — not on Free."],
  ["What happens when I hit my limit?", `${extraDocumentLimitFeature()} — buy extras without changing plan.`],
  ["Are prices inclusive of VAT?", "All listed prices exclude UK VAT. VAT is calculated and shown at checkout."],
];