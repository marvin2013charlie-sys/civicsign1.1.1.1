import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePoundSterling,
  Briefcase,
  ClipboardList,
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
    icon: Briefcase,
    title: "Built for UK HR & recruitment",
    body: "Send offer letters, employment contracts, handbook acknowledgements, policy updates and leaver packs from one UK-hosted workspace. Templates keep every new-starter pack consistent without chasing wet-ink post across hybrid offices.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR for candidate & employee data",
    body: "CivicSign is UK-owned and UK-hosted. Candidate and employee personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — a practical fit when people ops and DPO ask where offer-letter evidence lives.",
  },
  {
    icon: ClipboardList,
    title: "Evidence for HR files & tribunals",
    body: "Every finished envelope keeps IP, timestamps and a SHA-256 sealed PDF with a Certificate of Completion. That audit trail is what Employment Tribunal disclosure and internal audits actually look for — not a novelty signature font.",
  },
  {
    icon: UserX,
    title: "Candidates never need an account",
    body: "Recipients open a secure link, review the document and sign on any device. No CivicSign login for candidates, new starters or leavers — less drop-off when an offer is waiting on ink.",
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
    title: "Clear GBP pricing for people teams",
    body: (
      <>
        {formatFreePlanSignupPitch()} Pro from about {formatProMonthlyShort()} per user. No opaque enterprise quote just to try offer-letter and policy workflows.{" "}
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
    "Are electronic signatures legal for UK HR documents?",
    "Electronic signatures are widely recognised in England and Wales under the Electronic Communications Act 2000 and UK eIDAS. Most HR paperwork — offer letters, employment contracts, handbook acknowledgements, policy updates and variation letters — can be signed electronically when intent, consent and attribution are clear. Some instruments (certain deeds, settlement agreements with solicitor advice formalities) have extra requirements — take counsel for your matter type. This page is general information, not legal or employment advice.",
  ],
  [
    "Can CivicSign handle offer letters and employment contracts?",
    "Yes. Upload your PDF or Word pack, place signature and date fields, and send a secure link. Candidates and employees sign on any device; you download a sealed PDF with a Certificate of Completion for the HR file.",
  ],
  [
    "What about policies, handbooks and Right to Work declarations?",
    "CivicSign timestamps views and signatures with IP and a tamper-evident seal, which helps evidence when an employee acknowledged a policy or RTW declaration. Identity verification workflows (passport/driving licence) are productised separately and may be coming soon — confirm current capabilities before relying on them as your sole statutory Right to Work check.",
  ],
  [
    "Where is signing data hosted?",
    "CivicSign is UK-owned and UK-hosted. Personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — useful when candidates and employees expect UK residency.",
  ],
  [
    "Do candidates or employees need a CivicSign account?",
    "No. Signers use a secure browser link on phone, tablet or desktop. Completed documents download as sealed PDFs with a Certificate of Completion.",
  ],
  [
    "How does pricing work for a small HR team?",
    `${formatFreePlanSignupPitch()} Pro is about ${formatProMonthlyShort()} per user with Manage PDF on paid plans. Start on Free, then upgrade when volume or PDF tools matter.`,
  ],
  [
    "Is this the same as the HR solutions page?",
    "This guide targets the high-intent search for HR e-signature UK. For industry layout and document examples, see Solutions → HR. Both point to the same product, pricing and register flow.",
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Primary fit",
    left: "UK HR, people ops & in-house recruitment",
    right: "Generic global eSign tools not shaped for UK HR ops",
  },
  {
    criterion: "Hosting",
    left: "UK-owned, UK-hosted",
    right: "Often US/EU multi-region — confirm residency & transfers",
  },
  {
    criterion: "Typical docs",
    left: "Offer letters, contracts, policies, handbooks, leaver packs",
    right: "Generic contracts — HR templates vary by vendor",
  },
  {
    criterion: "Employment evidence",
    left: "Designed for HR file & tribunal-style audit habits",
    right: "Marketing claims vary — verify against your counsel’s guidance",
  },
  {
    criterion: "Signer friction",
    left: "No candidate / employee accounts required",
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

export default function ESignatureForHrUk() {
  return (
    <MarketingMoneyPage
      testId="e-signature-for-hr-uk-page"
      eyebrow="E-signature for HR UK"
      headline={
        <>
          E-signature software for UK HR &amp; recruitment
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Looking for HR e-signature UK software your people team will actually use? CivicSign is UK-hosted electronic signature software for offer letters, employment contracts, policies and leaver packs — with clear GBP pricing, no candidate accounts, and audit-ready sealed PDFs."
      points={POINTS}
      comparison={{
        eyebrow: "Why HR teams shortlist CivicSign",
        title: "Offer letters and policies, signed without the post run.",
        subtitle:
          "Keep lawful electronic signatures and people-file evidence. Gain UK hosting clarity, published Free/Pro plans and signer links candidates actually complete.",
        items: [
          "UK-hosted e-signatures aligned with ECA 2000 and UK eIDAS SES/AES",
          "Offer letters, employment contracts, handbook acknowledgements and multi-party leaver flows",
          "Tamper-evident Certificate of Completion on every finish",
          `Real free tier (${formatFreePlanDocsAMonth()}) — no card to start`,
          "Candidates and employees never need a CivicSign account",
          "Honest limits on QES / QTSP and formal settlement advice — take counsel where needed",
        ],
      }}
      table={{
        eyebrow: "HR shortlist",
        title: "What to check before you buy",
        subtitle:
          "Use this checklist when comparing CivicSign to DocuSign, Signable, Legalesign and other UK e-signature tools. Confirm each vendor’s current claims for your document types.",
        leftLabel: "CivicSign",
        rightLabel: "Typical market",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Deeper industry page:{" "}
            <Link to="/solutions/hr" className="font-semibold text-[var(--c-primary)] hover:underline">
              HR &amp; people solutions
            </Link>
            {" · "}
            <Link to="/e-signature-for-solicitors-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for solicitors
            </Link>
            {" · "}
            <Link to="/e-signature-for-accountants-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for accountants
            </Link>
            {" · "}
            <Link to="/e-signature-for-estate-agents-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for estate agents
            </Link>
            . General information only — not legal or employment advice.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/solutions/hr", label: "HR & people solutions" },
        { to: "/solutions/staffing-agency", label: "Staffing agency solutions" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/e-signature-for-accountants-uk", label: "E-signature for accountants" },
        { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents" },
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
        { to: "/blog/employment-contracts-electronic-signatures-uk", label: "Employment contracts e-signing" },
        { to: "/blog/right-to-work-digital-checks-uk-hr", label: "Right to Work digital checks" },
        { to: "/blog/are-e-signatures-legal-in-the-uk", label: "Are e-signatures legal?" },
      ]}
      ctaHeadline="Start free for UK HR teams"
      ctaSubhead="UK-hosted e-signatures, published GBP plans, and sealed audit PDFs — candidates never need an account."
    />
  );
}
