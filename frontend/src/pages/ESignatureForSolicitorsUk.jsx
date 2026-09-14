import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePoundSterling,
  FileStack,
  Gavel,
  Scale,
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
    icon: Scale,
    title: "Built for UK private practice",
    body: "Send engagement letters, client care packs, NDAs, retainers and multi-party settlements from one UK-hosted workspace. Templates keep matter-level paperwork consistent without chasing wet-ink post.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR & UK eIDAS aligned",
    body: "CivicSign is UK-owned and UK-hosted. Signing evidence is designed around the Electronic Communications Act 2000 and UK eIDAS SES/AES for everyday commercial and practice documents — with a tamper-evident Certificate of Completion on every seal.",
  },
  {
    icon: Gavel,
    title: "Evidence counsel can explain",
    body: "Every finished envelope keeps IP, timestamps and a SHA-256 sealed PDF. That audit trail is what partners and counterparties actually ask for when a signature is questioned — not a novelty signature font.",
  },
  {
    icon: UserX,
    title: "Clients never need an account",
    body: "Recipients open a secure link, review the document and sign on any device. No CivicSign login for clients, counsel or witnesses — less friction when turnaround matters.",
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
    title: "Clear GBP pricing for firms",
    body: (
      <>
        {formatFreePlanSignupPitch()} Pro from about {formatProMonthlyShort()} per user. No opaque enterprise quote just to try engagement-letter workflows.{" "}
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
    "Are electronic signatures legal for UK solicitors?",
    "Electronic signatures are widely recognised in England and Wales under the Electronic Communications Act 2000 and UK eIDAS. Most commercial practice documents can be signed electronically when intent, consent and attribution are clear. Some instruments (certain deeds, wills, specific Land Registry processes) have extra formalities — take counsel for your matter type. This page is general information, not legal advice.",
  ],
  [
    "Can CivicSign handle witnessed or sequential signing?",
    "Yes. Route documents sequentially (for example client then witness, or multi-party settlement) so each party signs in order with a full audit trail. Confirm deed and witnessing requirements with counsel for the specific instrument.",
  ],
  [
    "Where is signing data hosted?",
    "CivicSign is UK-owned and UK-hosted. Personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — a practical fit for firms that prefer UK residency when shortlisting e-signature software.",
  ],
  [
    "Do clients or opposing counsel need a CivicSign account?",
    "No. Signers use a secure browser link on phone, tablet or desktop. Completed documents download as sealed PDFs with a Certificate of Completion.",
  ],
  [
    "How does pricing work for a small practice?",
    `${formatFreePlanSignupPitch()} Pro is about ${formatProMonthlyShort()} per user with Manage PDF on paid plans. Start on Free, then upgrade when volume or PDF tools matter.`,
  ],
  [
    "Is this the same as the Legal solutions page?",
    "This guide targets the high-intent search for solicitor e-signature UK. For industry layout and document examples, see Solutions → Legal. Both point to the same product, pricing and register flow.",
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Primary fit",
    left: "UK solicitors, chambers support & in-house legal",
    right: "Generic global eSign tools not shaped for UK practice ops",
  },
  {
    criterion: "Hosting",
    left: "UK-owned, UK-hosted",
    right: "Often US/EU multi-region — confirm residency & transfers",
  },
  {
    criterion: "Legal framing",
    left: "ECA 2000 + UK eIDAS SES/AES-aligned product design",
    right: "Marketing claims vary — verify SES/AES/QES honestly",
  },
  {
    criterion: "QES / QTSP",
    left: "Honest: not positioned as a UK QTSP QES issuer",
    right: "Some vendors partner for QES — confirm before regulated use",
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

export default function ESignatureForSolicitorsUk() {
  return (
    <MarketingMoneyPage
      testId="e-signature-for-solicitors-uk-page"
      eyebrow="E-signature for solicitors UK"
      headline={
        <>
          E-signature software for UK solicitors
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Looking for solicitor e-signature UK software you can put in front of compliance? CivicSign is UK-hosted electronic signature software for engagement letters, NDAs, retainers and multi-party packs — with clear GBP pricing, no client accounts, and audit-ready sealed PDFs."
      points={POINTS}
      comparison={{
        eyebrow: "Why firms shortlist CivicSign",
        title: "Practice paperwork, signed without the post run.",
        subtitle:
          "Keep lawful electronic signatures and matter evidence. Gain UK hosting clarity, published Free/Pro plans and signer links clients actually complete.",
        items: [
          "UK-hosted e-signatures aligned with ECA 2000 and UK eIDAS SES/AES",
          "Engagement letters, NDAs, retainers and sequential multi-party flows",
          "Tamper-evident Certificate of Completion on every finish",
          `Real free tier (${formatFreePlanDocsAMonth()}) — no card to start`,
          "Clients and counsel never need a CivicSign account",
          "Honest limits on QES / QTSP — take advice for deeds and HMLR edge cases",
        ],
      }}
      table={{
        eyebrow: "Solicitor shortlist",
        title: "What to check before you buy",
        subtitle:
          "Use this checklist when comparing CivicSign to DocuSign, Legalesign, Signable and other UK e-signature tools. Confirm each vendor’s current claims for your matter types.",
        leftLabel: "CivicSign",
        rightLabel: "Typical market",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Deeper industry page:{" "}
            <Link to="/solutions/legal" className="font-semibold text-[var(--c-primary)] hover:underline">
              Legal &amp; solicitors solutions
            </Link>
            {" · "}
            <Link to="/e-signature-for-accountants-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for accountants
            </Link>
            {" · "}
            <Link to="/e-signature-for-hr-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              E-signature for HR
            </Link>
            {" · "}
            <Link to="/electronic-signatures-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              Electronic signatures UK
            </Link>
            {" · "}
            <Link to="/eidas-compliant-esignature" className="font-semibold text-[var(--c-primary)] hover:underline">
              eIDAS compliant e-signature
            </Link>
            . General information only — not legal advice.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/solutions/legal", label: "Legal & solicitors solutions" },
        { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents" },
        { to: "/e-signature-for-accountants-uk", label: "E-signature for accountants" },
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
      ctaHeadline="Start free for UK solicitors"
      ctaSubhead="UK-hosted e-signatures, published GBP plans, and sealed audit PDFs — clients never need an account."
    />
  );
}
