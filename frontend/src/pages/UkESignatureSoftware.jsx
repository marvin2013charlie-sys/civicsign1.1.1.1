import React from "react";
import { Scale, ShieldCheck, Stamp } from "lucide-react";
import { MarketingMoneyPage } from "@/components/MarketingMoneyPage";

const POINTS = [
  {
    icon: Scale,
    title: "Built around UK law",
    body: "Electronic signatures designed for the Electronic Communications Act 2000, UK eIDAS, and Law Commission guidance — with intent, consent and attribution captured on every envelope.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR by default",
    body: "UK-owned and UK-hosted. Personal data stays under UK GDPR and the Data Protection Act 2018, with encryption in transit and a clear audit trail.",
  },
  {
    icon: Stamp,
    title: "Court-ready evidence",
    body: "Every completed document is sealed with a Certificate of Completion and a SHA-256 hash so changes after signing are detectable.",
  },
];

const FAQS = [
  ["What is UK e-signature software?", "UK e-signature software lets you prepare, send and sign documents electronically under UK law. CivicSign captures signer intent, consent and a tamper-evident audit trail so completed agreements are suitable for everyday UK business use."],
  ["Are CivicSign signatures legally binding?", "Yes. CivicSign is built for legally binding electronic signatures in England and Wales, aligned with the Electronic Communications Act 2000 and UK eIDAS requirements for advanced electronic signatures where appropriate."],
  ["Do recipients need an account?", "No. Signers open a secure link on any device — no downloads and no CivicSign account required."],
];

export default function UkESignatureSoftware() {
  return (
    <MarketingMoneyPage
      testId="uk-e-signature-software-page"
      eyebrow="Primary product page"
      headline={<>UK e-signature software<span style={{ color: "var(--c-accent)" }}>.</span></>}
      subhead="Send contracts, NDAs and offer letters with legally binding electronic signatures. CivicSign is UK-built e-signature software for freelancers, SMEs and teams who need UK GDPR compliance without enterprise complexity."
      points={POINTS}
      comparison={{
        eyebrow: "What you get",
        title: "Simple UK signing that still feels serious",
        subtitle: "Upload PDF or Word, place fields, send a link, and download a sealed PDF with a full audit trail.",
        items: [
          "Free plan to send your first documents",
          "Manage PDF tools on paid plans",
          "Sequential and parallel signer routing",
          "UK support and clear GBP pricing",
        ],
      }}
      faqs={FAQS}
      related={[
        { to: "/docusign-alternative", label: "DocuSign alternative" },
        { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
        { to: "/pricing", label: "Pricing" },
      ]}
      ctaHeadline="Try UK e-signature software free"
    />
  );
}
