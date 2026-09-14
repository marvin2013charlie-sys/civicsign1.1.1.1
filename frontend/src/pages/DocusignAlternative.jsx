import React from "react";
import { BadgePoundSterling, Globe2, Sparkles } from "lucide-react";
import { MarketingMoneyPage } from "@/components/MarketingMoneyPage";

const POINTS = [
  {
    icon: BadgePoundSterling,
    title: "Clear UK pricing",
    body: "GBP plans with a real free tier. No opaque enterprise quotes required to send your first envelopes or understand what you will pay.",
  },
  {
    icon: Globe2,
    title: "UK-built alternative",
    body: "A DocuSign alternative designed for British teams: UK hosting, UK GDPR posture, and workflows that match how UK SMEs actually sign.",
  },
  {
    icon: Sparkles,
    title: "Faster to start",
    body: "Upload, prepare and send in minutes. Recipients sign in the browser — no apps, no friction, no US-centric setup maze.",
  },
];

const FAQS = [
  ["Is CivicSign a DocuSign alternative?", "Yes. CivicSign is UK e-signature software that covers the core send-and-sign workflow teams use DocuSign for — with UK GDPR hosting, transparent pricing and a free plan to evaluate."],
  ["Will my existing documents work?", "Upload PDF or Word files, place signature and form fields, then send. Completed documents download as sealed PDFs with a Certificate of Completion."],
  ["How does pricing compare?", "CivicSign publishes simple GBP plans (including a free tier). You can start without a card and upgrade when volume or Manage PDF tools matter."],
];

export default function DocusignAlternative() {
  return (
    <MarketingMoneyPage
      testId="docusign-alternative-page"
      eyebrow="DocuSign alternative UK"
      headline={<>A simpler DocuSign alternative for the UK<span style={{ color: "var(--c-accent)" }}>.</span></>}
      subhead="Switch to CivicSign when you want UK e-signature software with lawful signatures, UK GDPR compliance and pricing you can explain to finance — without losing the day-to-day send, sign and audit trail workflow."
      points={POINTS}
      comparison={{
        eyebrow: "Why teams leave heavyweight tools",
        title: "Same outcome. Less overhead.",
        subtitle: "Keep legally binding e-signatures and audit evidence. Drop the complexity you do not need.",
        items: [
          "UK-hosted alternative to US-centric stacks",
          "Published Free, Pro and Business plans",
          "Signer links that need no recipient accounts",
          "Tamper-evident seal on every completion",
        ],
      }}
      faqs={FAQS}
      related={[
        { to: "/uk-e-signature-software", label: "UK e-signature software" },
        { to: "/legalesign-alternative", label: "Legalesign alternative" },
        { to: "/signable-alternative", label: "Signable alternative" },
        { to: "/esign-alternative", label: "eSign alternative" },
        { to: "/mysign-alternative", label: "MySign alternative" },
        { to: "/adobe-sign-alternative", label: "Adobe Sign alternative" },
        { to: "/eidas-compliant-esignature", label: "eIDAS compliant e-signature" },
        { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/pricing", label: "Compare pricing" },
        { to: "/product/manage-pdf", label: "Manage PDF" },
        { to: "/solutions", label: "Solutions" },
      ]}
      ctaHeadline="Try this DocuSign alternative free"
    />
  );
}
