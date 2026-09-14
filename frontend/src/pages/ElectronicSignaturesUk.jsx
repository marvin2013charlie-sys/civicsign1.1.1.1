import React from "react";
import { FileCheck2, Gavel, Lock } from "lucide-react";
import { MarketingMoneyPage } from "@/components/MarketingMoneyPage";

const POINTS = [
  {
    icon: Gavel,
    title: "Electronic signatures under UK law",
    body: "CivicSign helps you capture the evidence UK law looks for: clear intent to sign, consent to electronic execution, and reliable attribution to the signer.",
  },
  {
    icon: Lock,
    title: "UK GDPR and Data Protection Act 2018",
    body: "Identity and document data are processed with UK GDPR expectations in mind — UK hosting, encryption in transit, and controlled access to envelopes.",
  },
  {
    icon: FileCheck2,
    title: "Everyday UK documents",
    body: "Contracts, NDAs, offer letters, supplier terms and board packs — prepared once, signed from a link, stored with a Certificate of Completion.",
  },
];

const FAQS = [
  ["Are electronic signatures legal in the UK?", "Yes. Electronic signatures are widely recognised in England and Wales. CivicSign is designed around the Electronic Communications Act 2000, UK eIDAS and Law Commission guidance on electronic execution."],
  ["What makes a UK electronic signature trustworthy?", "Strong process: identify the signer, show the document, capture consent and intent, and keep a tamper-evident audit trail. CivicSign seals completed PDFs so later changes are detectable."],
  ["Who is CivicSign for?", "UK freelancers, SMEs, HR, legal and operations teams that need electronic signatures without enterprise procurement theatre."],
  [
    "What is an eIDAS-compliant e-signature in the UK?",
    "UK eIDAS recognises SES, AES and QES. Most UK business documents are valid with clear intent plus strong audit evidence. CivicSign provides SES/AES-aligned sealing and Certificates of Completion — see our eIDAS page for an honest SES vs AES vs QES breakdown.",
  ],
];

export default function ElectronicSignaturesUk() {
  return (
    <MarketingMoneyPage
      testId="electronic-signatures-uk-page"
      eyebrow="Electronic signatures UK"
      headline={<>Electronic signatures for UK teams<span style={{ color: "var(--c-accent)" }}>.</span></>}
      subhead="Understand and use electronic signatures in the UK with confidence. CivicSign is UK e-signature software that keeps signing simple while staying aligned with UK law and UK GDPR."
      points={POINTS}
      comparison={{
        eyebrow: "Practical compliance",
        title: "Lawful process, not legal theatre",
        subtitle: "We focus on the controls that matter for everyday commercial documents — clarity, consent, attribution and evidence.",
        items: [
          "Tokenized signer links on any device",
          "Full audit trail on every envelope",
          "SHA-256 sealed Certificate of Completion",
          "UK support for UK workflows",
        ],
      }}
      faqs={FAQS}
      related={[
        { to: "/uk-e-signature-software", label: "UK e-signature software" },
        { to: "/docusign-alternative", label: "DocuSign alternative" },
        { to: "/legalesign-alternative", label: "Legalesign alternative" },
        { to: "/signable-alternative", label: "Signable alternative" },
        { to: "/esign-alternative", label: "eSign alternative" },
        { to: "/mysign-alternative", label: "MySign alternative" },
        { to: "/pricing", label: "Pricing" },
        { to: "/blog/are-e-signatures-legal-in-the-uk", label: "Legal guide" },
        { to: "/adobe-sign-alternative", label: "Adobe Sign alternative" },
        { to: "/eidas-compliant-esignature", label: "eIDAS e-signature" },
        { to: "/solutions", label: "Solutions" },
      ]}
      ctaHeadline="Start electronic signatures today"
    />
  );
}
