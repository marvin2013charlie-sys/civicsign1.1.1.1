import {
  extraDocumentLimitFeature,
  formatPlanDocumentLimit,
  formatQuotaResetFaqAnswer,
} from "@/lib/pricing";

export function buildPricingPlans(billingInterval = "monthly") {
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
      tag: "For growing businesses",
      cta: "Start Pro",
      highlight: true,
      accent: "coral",
      features: [
        "All Free features, plus:",
        formatPlanDocumentLimit("Pro", billingInterval),
        "2-in-1: Manage PDF — edit, compress, watermark, protect, merge & split",
        "SES & AES signatures (UK eIDAS)",
        "Shared team templates",
        "Custom branding (logo & colours)",
      ],
    },
    {
      name: "Business",
      tag: "For teams that scale",
      cta: "Get Business",
      highlight: false,
      accent: "teal",
      features: [
        "Everything in Pro, plus:",
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
  ["Do I need a card to start?", "No. The Free plan is free forever with no card and no trial clock — upgrade only when you need more volume or paid features."],
  ["When does my document limit reset?", formatQuotaResetFaqAnswer()],
  ["Is Manage PDF on every plan?", "Manage PDF is included on Pro, Business, and Organisation — not on Free."],
  ["What happens when I hit my limit?", `${extraDocumentLimitFeature()} — buy extras without changing plan.`],
  ["Are prices inclusive of VAT?", "All listed prices exclude UK VAT. VAT is calculated and shown at checkout."],
];