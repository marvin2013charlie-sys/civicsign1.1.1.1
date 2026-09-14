import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePoundSterling,
  Calculator,
  ClipboardCheck,
  FileStack,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { MarketingMoneyPage } from "@/components/MarketingMoneyPage";
import {
  formatFreePlanDocsAMonth,
  formatFreePlanSignupPitch,
  formatProMonthlyShort,
} from "@/lib/pricing";

const POINTS = [
  {
    icon: Calculator,
    title: "Built for UK practices & bookkeepers",
    body: "Send engagement letters, fee proposals, terms of business, 64-8 authorities and client onboarding packs from one UK-hosted workspace. Templates keep every client file consistent without chasing wet-ink post.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR for client & AML data",
    body: "CivicSign is UK-owned and UK-hosted. Client personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — a practical fit when partners ask where engagement evidence lives.",
  },
  {
    icon: ClipboardCheck,
    title: "Evidence for monitoring reviews",
    body: "Every finished envelope keeps IP, timestamps and a SHA-256 sealed PDF with a Certificate of Completion. That audit trail is what ICAEW, ACCA and AAT monitoring reviews actually look for — not a novelty signature font.",
  },
  {
    icon: UserX,
    title: "Clients never need an account",
    body: "Recipients open a secure link, review the document and sign on any device. No CivicSign login for clients, directors or bookkeeping contacts — less friction when fee approval is waiting on ink.",
  },
  {
    icon: FileStack,
    title: "Manage PDF 2-in-1 on paid plans",
    body: (
      <>
        Merge, split, compress, watermark and protect PDFs, then place fields and send for signature in the same product.{" "}
        <Link to="/product/manage-pdf" className="font-semibold text-[var(--c-primary)] hover:underline">
          Explore Manage PDF
        </Link>
        .
      </>
    ),
  },
  {
    icon: BadgePoundSterling,
    title: "Clear GBP pricing for practices",
    body: (
      <>
        {formatFreePlanSignupPitch()} Pro from about {formatProMonthlyShort()} per user. No opaque enterprise quote just to try engagement-letter and proposal workflows.{" "}
        <Link to="/pricing" className="font-semibold text-[var(--c-primary)] hover:underline">
          See pricing
        </Link>
        .
      </>
    ),
  },
];

const FAQS = [
  [
    "Are electronic signatures legal for UK accountants?",
    "Electronic signatures are widely recognised in England and Wales under the Electronic Communications Act 2000 and UK eIDAS. ICAEW and ACCA guidance generally permits engagement letters and many client agreements to be signed electronically when intent, consent and attribution are clear. Some instruments and regulated filings have extra formalities — take counsel for your matter type. This page is general information, not legal or professional advice.",
  ],
  [
    "Can CivicSign handle engagement letters and fee proposals?",
    "Yes. Upload your PDF or Word pack, place signature and date fields, and send a secure link. Clients sign on any device; you download a sealed PDF with a Certificate of Completion for the client file.",
  ],
  [
    "What about AML / MLR evidence?",
    "CivicSign timestamps views and signatures with IP and a tamper-evident seal, which helps evidence when a client agreed to an AML or source-of-funds declaration. Identity verification workflows (passport/driving licence) are productised separately and may be coming soon — confirm current capabilities before relying on them for your MLR file.",
  ],
  [
    "Where is signing data hosted?",
    "CivicSign is UK-owned and UK-hosted. Personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — useful when clients and partners expect UK residency.",
  ],
  [
    "Do clients need a CivicSign account?",
    "No. Signers use a secure browser link on phone, tablet or desktop. Completed documents download as sealed PDFs with a Certificate of Completion.",
  ],
  [
    "How does pricing work for a small practice?",
    `${formatFreePlanSignupPitch()} Pro is about ${formatProMonthlyShort()} per user with Manage PDF on paid plans. Start on Free, then upgrade when volume or PDF tools matter.`,
  ],
  [
    "Is this the same as the Financial services solutions page?",
    "This guide targets the high-intent search for accountant e-signature UK. For industry layout and document examples, see Solutions → Financial services. Both point to the same product, pricing and register flow.",
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Primary fit",
    left: "UK accountants, bookkeepers, IFAs & advisory firms",
    right: "Generic global eSign tools not shaped for UK practice ops",
  },
  {
    criterion: "Hosting",
    left: "UK-owned, UK-hosted",
    right: "Often US/EU multi-region — confirm residency & transfers",
  },
  {
    criterion: "Typical docs",
    left: "Engagement letters, proposals, TOB, 64-8, AML declarations",
    right: "Generic contracts — practice templates vary by vendor",
  },
  {
    criterion: "Professional bodies",
    left: "Designed for ICAEW / ACCA / AAT engagement evidence habits",
    right: "Marketing claims vary — verify against your body's guidance",
  },
  {
    criterion: "Client friction",
    left: "No signer accounts required",
    right: "Some tools force recipient logins or apps",
  },
  {
    criterion: "Entry pricing",
    left: `Free ${formatFreePlanDocsAMonth()}; Pro ~${formatProMonthlyShort()}`,
    right: "Often seat/envelope quotes — check each vendor",
  },
  {
    criterion: "Evidence pack",
    left: "Sealed PDF + Certificate of Completion + SHA-256",
    right: "Expect an audit trail; export quality varies",
  },
];

export default function ESignatureForAccountantsUk() {
  return (
    <MarketingMoneyPage
      testId="e-signature-for-accountants-uk-page"
      eyebrow="E-signature for accountants UK"
      headline={
        <>
          E-signature software for UK accountants
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Looking for accountant e-signature UK software your compliance lead will accept? CivicSign is UK-hosted electronic signature software for engagement letters, fee proposals, terms of business and client onboarding packs — with clear GBP pricing, no client accounts, and audit-ready sealed PDFs."
      points={POINTS}
      comparison={{
        eyebrow: "Why practices shortlist CivicSign",
        title: "Engagement letters and proposals, signed without the post run.",
        subtitle:
          "Keep lawful electronic signatures and client-file evidence. Gain UK hosting clarity, published Free/Pro plans and signer links clients actually complete.",
        items: [
          "UK-hosted e-signatures aligned with ECA 2000 and UK eIDAS SES/AES",
          "Engagement letters, fee proposals, terms of business and multi-party packs",
          "Tamper-evident Certificate of Completion on every finish",
          `Real free tier (${formatFreePlanDocsAMonth()}) — no card to start`,
          "Clients never need a CivicSign account",
          "Honest limits on QES / QTSP and regulated filings — take advice where needed",
        ],
      }}
      table={{
        eyebrow: "Practice shortlist",
        title: "What to check before you buy",
        subtitle:
          "Use this checklist when comparing CivicSign to DocuSign, Signable, Legalesign and other UK e-signature tools. Confirm each vendor’s current claims for your document types.",
        leftLabel: "CivicSign",
        rightLabel: "Typical market",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Deeper industry page:{" "}
            <Link to="/solutions/financial-services" className="font-semibold text-[var(--c-primary)] hover:underline">
              Accountants &amp; financial services
            </Link>
            {" · "}
            <Link to="/e-signature-for-solicitors-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for solicitors
            </Link>
            {" · "}
            <Link to="/e-signature-for-estate-agents-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for estate agents
            </Link>
            {" · "}
            <Link to="/e-signature-for-hr-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for HR
            </Link>
            . General information only — not legal or professional advice.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/solutions/financial-services", label: "Accountants & financial services" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents" },
        { to: "/e-signature-for-hr-uk", label: "E-signature for HR" },
        { to: "/uk-e-signature-software", label: "UK e-signature software" },
        { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
        { to: "/eidas-compliant-esignature", label: "eIDAS e-signature" },
        { to: "/pricing", label: "Compare pricing" },
        { to: "/register", label: "Start free" },
        { to: "/legalesign-alternative", label: "Legalesign alternative" },
        { to: "/docusign-alternative", label: "DocuSign alternative" },
        { to: "/signable-alternative", label: "Signable alternative" },
        { to: "/esign-alternative", label: "eSign alternative" },
        { to: "/mysign-alternative", label: "MySign alternative" },
        { to: "/adobe-sign-alternative", label: "Adobe Sign alternative" },
        { to: "/product/manage-pdf", label: "Manage PDF" },
        { to: "/blog/are-e-signatures-legal-in-the-uk", label: "Are e-signatures legal?" },
      ]}
      ctaHeadline="Start free for UK accountants"
      ctaSubhead="UK-hosted e-signatures, published GBP plans, and sealed audit PDFs — clients never need an account."
    />
  );
}
