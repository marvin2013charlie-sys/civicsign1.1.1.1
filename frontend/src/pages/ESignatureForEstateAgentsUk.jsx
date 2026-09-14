import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePoundSterling,
  FileStack,
  Home,
  KeyRound,
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
    icon: Home,
    title: "Built for UK lettings & sales",
    body: "Send ASTs, memorandums of sale, landlord terms of business, renewals, inventories and guarantor packs from one UK-hosted workspace. Templates keep branch paperwork consistent without chasing wet-ink post.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR for tenant & vendor data",
    body: "CivicSign is UK-owned and UK-hosted. Tenant, guarantor and vendor personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — a practical fit when compliance asks where documents live.",
  },
  {
    icon: KeyRound,
    title: "Multi-party property flows",
    body: "Route tenant → guarantor → landlord (or buyer → seller → agent) in order with a full audit trail. Every finish gets a tamper-evident Certificate of Completion and SHA-256 sealed PDF.",
  },
  {
    icon: UserX,
    title: "Tenants never need an account",
    body: "Recipients open a secure link, review the document and sign on any device. No CivicSign login for tenants, landlords, vendors or guarantors — less drop-off when a let is waiting on ink.",
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
    title: "Clear GBP pricing for agencies",
    body: (
      <>
        {formatFreePlanSignupPitch()} Pro from about {formatProMonthlyShort()} per user. No opaque enterprise quote just to try AST and sales-memo workflows.{" "}
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
    "Are electronic signatures legal for UK estate agents?",
    "Electronic signatures are widely recognised in England and Wales under the Electronic Communications Act 2000 and UK eIDAS. Most agency paperwork — ASTs, terms of business, memorandums of sale, inventories and guarantor agreements — can be signed electronically when intent, consent and attribution are clear. Some statutory notices and Land Registry processes have extra formalities — take counsel for your matter type. This page is general information, not legal advice.",
  ],
  [
    "Can CivicSign handle ASTs with guarantors?",
    "Yes. Use sequential routing so the tenant, guarantor and landlord (or agent) sign in the order your process needs, with a complete audit trail on every envelope.",
  ],
  [
    "What about Section 21 / Section 8 notices?",
    "CivicSign can deliver timestamped electronic documents with view and sign evidence. Validity of serving a particular statutory notice electronically depends on the notice type, tenancy and current housing law — confirm service method with counsel before relying on e-delivery alone.",
  ],
  [
    "Where is signing data hosted?",
    "CivicSign is UK-owned and UK-hosted. Personal data in the signing trail is processed under UK GDPR and the Data Protection Act 2018 — useful when tenants and vendors expect UK residency.",
  ],
  [
    "Do tenants or landlords need a CivicSign account?",
    "No. Signers use a secure browser link on phone, tablet or desktop. Completed documents download as sealed PDFs with a Certificate of Completion.",
  ],
  [
    "How does pricing work for a small branch?",
    `${formatFreePlanSignupPitch()} Pro is about ${formatProMonthlyShort()} per user with Manage PDF on paid plans. Start on Free, then upgrade when volume or PDF tools matter.`,
  ],
  [
    "Is this the same as the Real estate solutions page?",
    "This guide targets the high-intent search for estate agent e-signature UK. For industry layout and document examples, see Solutions → Real estate. Both point to the same product, pricing and register flow.",
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Primary fit",
    left: "UK lettings & sales agents, property managers",
    right: "Generic global eSign tools not shaped for UK agency ops",
  },
  {
    criterion: "Hosting",
    left: "UK-owned, UK-hosted",
    right: "Often US/EU multi-region — confirm residency & transfers",
  },
  {
    criterion: "Typical docs",
    left: "ASTs, sales memos, TOB, renewals, inventories, guarantors",
    right: "Generic contracts — property templates vary by vendor",
  },
  {
    criterion: "Statutory notices",
    left: "Honest: confirm lawful service method with counsel",
    right: "Marketing claims vary — verify before relying on e-serve alone",
  },
  {
    criterion: "Signer friction",
    left: "No tenant / landlord accounts required",
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

export default function ESignatureForEstateAgentsUk() {
  return (
    <MarketingMoneyPage
      testId="e-signature-for-estate-agents-uk-page"
      eyebrow="E-signature for estate agents UK"
      headline={
        <>
          E-signature software for UK estate agents
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Looking for estate agent e-signature UK software your compliance lead will accept? CivicSign is UK-hosted electronic signature software for ASTs, sales memorandums, landlord terms and multi-party guarantor packs — with clear GBP pricing, no tenant accounts, and audit-ready sealed PDFs."
      points={POINTS}
      comparison={{
        eyebrow: "Why agencies shortlist CivicSign",
        title: "Lettings and sales paperwork, signed without the post run.",
        subtitle:
          "Keep lawful electronic signatures and branch evidence. Gain UK hosting clarity, published Free/Pro plans and signer links tenants actually complete.",
        items: [
          "UK-hosted e-signatures aligned with ECA 2000 and UK eIDAS SES/AES",
          "ASTs, memorandums of sale, terms of business and sequential multi-party flows",
          "Tamper-evident Certificate of Completion on every finish",
          `Real free tier (${formatFreePlanDocsAMonth()}) — no card to start`,
          "Tenants, landlords and vendors never need a CivicSign account",
          "Honest limits on statutory notice service and HMLR edge cases — take advice",
        ],
      }}
      table={{
        eyebrow: "Agency shortlist",
        title: "What to check before you buy",
        subtitle:
          "Use this checklist when comparing CivicSign to DocuSign, Signable, Legalesign and other UK e-signature tools. Confirm each vendor’s current claims for your document types.",
        leftLabel: "CivicSign",
        rightLabel: "Typical market",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Deeper industry page:{" "}
            <Link to="/solutions/real-estate" className="font-semibold text-[var(--c-primary)] hover:underline">
              Estate agents &amp; lettings solutions
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
            <Link to="/electronic-signatures-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              Electronic signatures UK
            </Link>
            . General information only — not legal advice.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/solutions/real-estate", label: "Estate agents & lettings solutions" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/e-signature-for-accountants-uk", label: "E-signature for accountants" },
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
        { to: "/blog/ast-agreements-electronic-signing-uk-lettings", label: "AST e-signing guide" },
        { to: "/blog/are-e-signatures-legal-in-the-uk", label: "Are e-signatures legal?" },
      ]}
      ctaHeadline="Start free for UK estate agents"
      ctaSubhead="UK-hosted e-signatures, published GBP plans, and sealed audit PDFs — tenants never need an account."
    />
  );
}
