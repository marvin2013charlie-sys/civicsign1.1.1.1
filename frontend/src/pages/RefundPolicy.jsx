import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/LegalLayout";
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legalConstants";
import { formatExtraDocumentPolicyText } from "@/lib/pricing";

const EXTRA_DOC_POLICY = formatExtraDocumentPolicyText();

const sections = [
  {
    heading: "Who we are",
    paragraphs: [
      `This Refund Policy applies to purchases made through CivicSign, operated by ${LEGAL_COMPANY.name} (registered in ${LEGAL_COMPANY.jurisdiction}, registered office: ${LEGAL_COMPANY.address}).`,
      <>It should be read together with our <Link to="/legal/terms" className="font-medium text-[var(--c-primary)] hover:underline">Terms &amp; Conditions</Link> and <Link to="/legal/privacy" className="font-medium text-[var(--c-primary)] hover:underline">Privacy Policy</Link>. Where this policy offers you more favourable rights than the law requires, we will honour this policy.</>,
    ],
  },
  {
    heading: "Scope",
    paragraphs: ["This policy covers:"],
    list: [
      "Paid subscription plans (Pro and Business) purchased through our website.",
      `One-off pay-as-you-go document credits (currently ${EXTRA_DOC_POLICY}).`,
      "Enterprise and organisation contracts arranged directly with our team (separate contract terms may apply).",
    ],
  },
  {
    heading: "Free plan",
    paragraphs: [
      "The Free plan does not involve payment, so no refund applies. Your document allowance resets automatically on each monthly anniversary of your account registration date (see “Billing cycles” below).",
    ],
  },
  {
    heading: "14-day cooling-off period (consumers)",
    paragraphs: [
      "If you are a consumer — an individual acting for purposes outside your trade, business, craft, or profession — you normally have a 14-day right to cancel distance contracts under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013.",
      "Because CivicSign provides digital services that begin immediately after purchase, you will be asked to expressly consent to us starting the service before the 14-day period ends. If you give that consent and begin using paid features, you acknowledge that you may lose your statutory right to cancel once the service has been fully performed.",
      "If you have not started using paid features and cancel within 14 days of purchase, we will refund the full amount paid.",
    ],
  },
  {
    heading: "Subscription refunds",
    paragraphs: [
      "Unless required by law or expressly stated below, subscription fees are non-refundable once a billing period has started and paid features have been accessed.",
      "We may issue a full or partial refund at our discretion in cases such as:",
    ],
    list: [
      "Duplicate or erroneous charges caused by a technical fault on our side.",
      "A verified billing error (for example, charged twice for the same plan).",
      "Extended platform outage that materially prevented you from using the service you paid for.",
      "Cancellation within the 14-day cooling-off period where paid features were not used.",
    ],
  },
  {
    heading: "Pay-as-you-go document credits",
    paragraphs: [
      `Extra document credits (${EXTRA_DOC_POLICY}) are consumed when you create an envelope beyond your plan allowance. Once a credit has been used, it is non-refundable.`,
      "Unused extra document credits remain on your account and do not expire while your account is active. If you believe a credit was charged in error without a document being created, contact us within 14 days with your account email and the approximate time of the charge.",
    ],
  },
  {
    heading: "Billing cycles & document limits",
    paragraphs: [
      "Monthly document limits reset on the anniversary of your account registration date, not on the first day of the calendar month. For example, if you registered on 8 March, your allowance refreshes on the 8th of each month.",
      "Deleting envelopes does not restore your monthly allowance. Upgrading or downgrading plans takes effect according to the terms shown at checkout; refunds for unused portions of a subscription are not automatic unless stated in this policy or required by law.",
    ],
  },
  {
    heading: "How refunds are processed",
    paragraphs: [
      "Approved refunds are returned to the original payment method via Stripe, our payment processor. Depending on your bank or card issuer, it may take 5–10 business days for the refund to appear on your statement.",
      "We will email the address on your CivicSign account when a refund has been initiated. For subscription refunds processed by our team, you may also receive a notification from Stripe.",
    ],
  },
  {
    heading: "How to request a refund",
    paragraphs: [
      "Email info@civicbot.co.uk from the address registered on your account and include:",
    ],
    list: [
      "Your full name and CivicSign account email.",
      "The date and amount of the charge.",
      "Your reason for the request.",
      "Any relevant Stripe receipt or payment reference, if available.",
    ],
  },
  {
    heading: "Response times",
    paragraphs: [
      "We aim to acknowledge refund requests within 2 business days and to provide a decision within 10 business days. Complex cases — such as enterprise contracts or disputed usage — may take longer; we will keep you informed.",
    ],
  },
  {
    heading: "Chargebacks",
    paragraphs: [
      "If you dispute a charge with your bank or card issuer without contacting us first, we may suspend your account while the dispute is investigated. Please email info@civicbot.co.uk first so we can resolve issues quickly.",
    ],
    callout: {
      type: "warning",
      text: "Unjustified chargebacks may result in account suspension until the matter is resolved.",
    },
  },
  {
    heading: "Business & enterprise customers",
    paragraphs: [
      "Organisations on custom contracts, shared document pools, or enterprise unlimited arrangements are subject to the commercial terms in their order form or statement of work. Refund and cancellation terms for those agreements are set out in the signed contract unless otherwise agreed in writing.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "We may update this Refund Policy from time to time. The “Last updated” date at the top of this page will change when we do. Material changes that affect your rights will be communicated where appropriate.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "Billing, refunds, and general enquiries: info@civicbot.co.uk",
      <>You can also use our <Link to="/contact" className="font-medium text-[var(--c-primary)] hover:underline">Contact page</Link> or write to {LEGAL_COMPANY.name}, {LEGAL_COMPANY.address}.</>,
    ],
  },
];

const highlights = [
  "14-day consumer cooling-off where applicable",
  "Fair handling of billing errors",
  "Unused credits stay on your account",
  "Refunds via original payment method",
];

export default function RefundPolicy() {
  return (
    <div data-testid="refund-policy-page">
      <LegalLayout
        title="Refund Policy"
        updated={LEGAL_LAST_UPDATED.refunds}
        intro="Clear, fair rules for subscription and pay-as-you-go refunds on CivicSign. Your document allowance resets on your account anniversary each month."
        highlights={highlights}
        sections={sections}
      />
    </div>
  );
}