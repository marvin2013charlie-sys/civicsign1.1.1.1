import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePoundSterling,
  FileStack,
  Globe2,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MarketingMoneyPage } from "@/components/MarketingMoneyPage";
import {
  formatFreePlanDocsAMonth,
  formatFreePlanSignupPitch,
  formatProMonthlyShort,
} from "@/lib/pricing";

const POINTS = [
  {
    icon: Scale,
    title: "UK eIDAS explained in practice",
    body: "UK eIDAS (retained EU 910/2014 as amended) recognises simple, advanced and qualified electronic signatures. Most UK business contracts are valid with a clear intent to sign plus strong evidence — not every document needs a QES.",
  },
  {
    icon: ShieldCheck,
    title: "SES / AES-aligned workflows",
    body: "CivicSign is designed for legally binding electronic signatures under the Electronic Communications Act 2000 and UK eIDAS SES/AES where appropriate, with tamper-evident sealing and a Certificate of Completion on every finish.",
  },
  {
    icon: Globe2,
    title: "UK GDPR hosting posture",
    body: "UK-owned and UK-hosted. Personal data in the signing trail (names, emails, IPs, timestamps) is handled under UK GDPR and the Data Protection Act 2018 — critical when compliance teams shortlist e-signature software.",
  },
  {
    icon: FileStack,
    title: "Evidence you can keep",
    body: "Completed envelopes download as sealed PDFs with audit detail and a SHA-256 hash. That evidence pack is what UK buyers actually need when a signature is questioned.",
  },
  {
    icon: BadgePoundSterling,
    title: "Compliance without enterprise opacity",
    body: (
      <>
        {formatFreePlanSignupPitch()} Pro from about {formatProMonthlyShort()} per user with Manage PDF on paid plans.{" "}
        <Link to="/pricing" className="font-semibold text-[var(--c-primary)] hover:underline">
          See pricing
        </Link>
        .
      </>
    ),
  },
  {
    icon: Sparkles,
    title: "Honest about QES limits",
    body: "Qualified Electronic Signatures (QES) require a qualified certificate from a qualified trust service provider. CivicSign positions SES/AES-aligned signing for everyday UK business documents — take counsel for deeds, HMLR and QES-mandated cases.",
  },
];

const FAQS = [
  [
    "Is CivicSign eIDAS compliant?",
    "CivicSign is designed to support legally binding electronic signatures under UK eIDAS and the Electronic Communications Act 2000 for typical UK business documents, with SES/AES-aligned evidence (identity signals, intent, tamper-evident seal and Certificate of Completion). We do not claim to be a UK QTSP issuing QES certificates.",
  ],
  [
    "What is the difference between SES, AES and QES?",
    "SES (simple) covers everyday typed/drawn signatures with evidence. AES (advanced) adds stronger unique-link, identity and integrity controls. QES (qualified) is an AES created with a qualified certificate and qualified device — the only tier UK eIDAS equates to a handwritten signature by operation of law. Most commercial contracts do not legally require QES.",
  ],
  [
    "Are electronic signatures legal in the UK?",
    "Yes for most business documents. Courts look at intent to authenticate and the quality of evidence. Some document types (certain deeds, wills, specific Land Registry processes) have extra formalities — see our electronic signatures UK guide and take advice when unsure.",
  ],
  [
    "Does GDPR apply to e-signatures?",
    "Yes. Signer identity data and audit trails are personal data. CivicSign is UK-hosted and built for UK GDPR processing — ask any vendor for residency, DPA terms and retention controls.",
  ],
  [
    "How do I try CivicSign?",
    `${formatFreePlanSignupPitch()} Upgrade when volume or Manage PDF tools matter.`,
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Legal framework",
    left: "ECA 2000 + UK eIDAS SES/AES-aligned product design",
    right: "Vendors vary — confirm SES/AES/QES claims and QTSP status",
  },
  {
    criterion: "QES / QTSP",
    left: "Honest: not positioned as a UK QTSP QES issuer",
    right: "Some UK/EU vendors offer partner QES — verify before regulated use",
  },
  {
    criterion: "Evidence pack",
    left: "Sealed PDF + Certificate of Completion + SHA-256",
    right: "Expect audit trail; quality and exportability vary",
  },
  {
    criterion: "UK GDPR / hosting",
    left: "UK-owned, UK-hosted",
    right: "Confirm data residency and international transfers",
  },
  {
    criterion: "Entry pricing",
    left: `Free ${formatFreePlanDocsAMonth()}; Pro ~${formatProMonthlyShort()}`,
    right: "Often trial/seat/envelope models — check each vendor",
  },
];

export default function EidasCompliantEsignature() {
  return (
    <MarketingMoneyPage
      testId="eidas-compliant-esignature-page"
      eyebrow="eIDAS compliant e-signature UK"
      headline={
        <>
          eIDAS-aligned e-signatures for UK teams
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Looking for eIDAS signature UK software you can explain to compliance? CivicSign delivers UK-hosted, UK GDPR-ready electronic signatures with SES/AES-aligned evidence — honest about when QES is (and is not) required."
      points={POINTS}
      comparison={{
        eyebrow: "What buyers actually need",
        title: "Lawful signatures. Clear evidence. UK hosting.",
        subtitle:
          "Shortlist on legal fit, evidence quality and data residency — not marketing adjectives. CivicSign is built for everyday UK contracts with transparent Free/Pro plans.",
        items: [
          "UK eIDAS + ECA 2000 framed copy your counsel can review",
          "Tamper-evident seal and Certificate of Completion on every finish",
          "UK-hosted processing under UK GDPR",
          `Free tier (${formatFreePlanDocsAMonth()}) to evaluate before you commit`,
          "No signer accounts — secure browser links",
          "Plain English on SES vs AES vs QES — no overclaim",
        ],
      }}
      table={{
        eyebrow: "Compliance shortlist",
        title: "What to check on any UK e-signature tool",
        subtitle:
          "Use this checklist when comparing CivicSign to DocuSign, Adobe Sign, Legalesign, Signable, eSign and others. Confirm each vendor’s current claims before regulated use.",
        leftLabel: "CivicSign",
        rightLabel: "Typical market",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Related reading:{" "}
            <Link to="/electronic-signatures-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              Electronic signatures UK
            </Link>
            {" · "}
            <Link to="/uk-e-signature-software" className="font-semibold text-[var(--c-primary)] hover:underline">
              UK e-signature software
            </Link>
            {" · "}
            <Link to="/adobe-sign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              Adobe Sign alternative
            </Link>
            . This page is general information, not legal advice.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/uk-e-signature-software", label: "UK e-signature software" },
        { to: "/pricing", label: "Compare pricing" },
        { to: "/register", label: "Start free" },
        { to: "/adobe-sign-alternative", label: "Adobe Sign alternative" },
        { to: "/docusign-alternative", label: "DocuSign alternative" },
        { to: "/esign-alternative", label: "eSign alternative" },
        { to: "/mysign-alternative", label: "MySign alternative" },
        { to: "/legalesign-alternative", label: "Legalesign alternative" },
        { to: "/product/manage-pdf", label: "Manage PDF" },
      ]}
      ctaHeadline="Start with eIDAS-aligned UK e-signatures"
      ctaSubhead="UK-hosted electronic signatures, published GBP plans, and audit-ready sealed PDFs — free to try."
    />
  );
}
