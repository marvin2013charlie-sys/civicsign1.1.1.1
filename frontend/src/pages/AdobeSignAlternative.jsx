import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePoundSterling,
  FileStack,
  Globe2,
  ShieldCheck,
  Sparkles,
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
    icon: Globe2,
    title: "UK-hosted alternative to Acrobat Sign",
    body: "CivicSign is UK-owned and UK-hosted e-signature software. If you are shortlisting an Adobe Sign / Acrobat Sign alternative because UK GDPR and data residency matter more than an Acrobat seat bundle, start here.",
  },
  {
    icon: BadgePoundSterling,
    title: "Clear GBP signing plans",
    body: (
      <>
        Published Free and Pro plans focused on sending for signature — Free with {formatFreePlanDocsAMonth()}, Pro from about {formatProMonthlyShort()} per user.
        Adobe publishes Acrobat Standard/Pro for teams (e-sign bundled into PDF seats) and quotes Acrobat Sign Solutions separately; always check adobe.com/uk for current figures.{" "}
        <Link to="/pricing" className="font-semibold text-[var(--c-primary)] hover:underline">
          See CivicSign pricing
        </Link>
        .
      </>
    ),
  },
  {
    icon: FileStack,
    title: "Manage PDF when you need it",
    body: (
      <>
        Paid CivicSign plans include Manage PDF (edit, merge, split, compress, watermark, protect) then send for signature in one UK workspace — without buying a full Acrobat stack just to collect signatures.{" "}
        <Link to="/product/manage-pdf" className="font-semibold text-[var(--c-primary)] hover:underline">
          Explore Manage PDF
        </Link>
        .
      </>
    ),
  },
  {
    icon: UserX,
    title: "No signer accounts",
    body: "Recipients open a secure link and sign in the browser on any device. No CivicSign account, no Acrobat login for signers, no friction that stalls completions.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR & UK eIDAS aligned",
    body: "Built for legally binding electronic signatures in England and Wales — Electronic Communications Act 2000, UK eIDAS SES/AES where appropriate, tamper-evident Certificate of Completion on every seal.",
  },
  {
    icon: Sparkles,
    title: "Built for UK SMEs",
    body: "Upload, prepare and send in minutes. CivicSign suits freelancers, agencies and in-house teams who want lawful e-signatures without enterprise Adobe procurement theatre.",
  },
];

const FAQS = [
  [
    "Is CivicSign an Adobe Sign / Acrobat Sign alternative?",
    "Yes. CivicSign covers the core UK send-and-sign workflow teams use Acrobat Sign for — with UK hosting, published GBP pricing, a real free tier, Manage PDF on paid plans, and no signer accounts.",
  ],
  [
    "How does pricing compare to Adobe Acrobat Sign?",
    `${formatFreePlanSignupPitch()} Pro is about ${formatProMonthlyShort()} per user with Manage PDF included. Adobe typically sells e-sign inside Acrobat Standard/Pro for teams (published UK team prices on adobe.com/uk) and offers Acrobat Sign Solutions via sales for advanced enterprise needs — confirm current Adobe pricing before you buy.`,
  ],
  [
    "Do I need Acrobat to use CivicSign?",
    "No. Upload PDF or Word, place fields and send. Signers never need Acrobat. Paid plans add Manage PDF tools if you want light PDF prep without a separate Acrobat seat for every sender.",
  ],
  [
    "Where is CivicSign data hosted?",
    "CivicSign is UK-owned and UK-hosted. Personal data is processed under UK GDPR and the Data Protection Act 2018 — a clear fit for UK buyers comparing US-centric Document Cloud stacks.",
  ],
  [
    "Will my existing PDFs work?",
    "Yes. Upload PDF or Word, place signature and form fields, then send. Completed documents download as sealed PDFs with a Certificate of Completion and SHA-256 hash.",
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Hosting & ownership",
    left: "UK-owned, UK-hosted",
    right: "Adobe Document Cloud / Acrobat Sign — confirm residency and DPA for your contract",
  },
  {
    criterion: "How e-sign is sold",
    left: "Dedicated UK e-signature product with published Free/Pro GBP plans",
    right: "Often bundled inside Acrobat seats; Acrobat Sign Solutions typically quote-led",
  },
  {
    criterion: "Published entry pricing",
    left: `Free ${formatFreePlanDocsAMonth()}; Pro ~${formatProMonthlyShort()}`,
    right: "Acrobat for teams publishes UK licence prices; Sign Solutions contact sales — verify on adobe.com/uk",
  },
  {
    criterion: "Free tier to evaluate",
    left: "Ongoing free plan (no card to start)",
    right: "Trials / Acrobat evaluations — check current Adobe offers",
  },
  {
    criterion: "PDF tools",
    left: "Manage PDF 2-in-1 on paid plans",
    right: "Deep Acrobat PDF suite when you already buy Acrobat",
  },
  {
    criterion: "Signer accounts",
    left: "Never required",
    right: "Browser signing; Acrobat ecosystem may add friction depending on workflow",
  },
  {
    criterion: "Best fit",
    left: "UK SMEs wanting clear e-sign pricing + optional PDF prep",
    right: "Teams already standardised on Acrobat / Adobe enterprise agreements",
  },
];

export default function AdobeSignAlternative() {
  return (
    <MarketingMoneyPage
      testId="adobe-sign-alternative-page"
      eyebrow="Adobe Sign alternative UK"
      headline={
        <>
          A clearer Adobe Sign alternative for UK teams
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Comparing Adobe Acrobat Sign to CivicSign? CivicSign is UK e-signature software with UK hosting, honest GBP pricing, Manage PDF on paid plans, a free tier to evaluate, and no signer accounts — without needing an Acrobat seat for every sender."
      points={POINTS}
      comparison={{
        eyebrow: "Why UK buyers shortlist CivicSign",
        title: "Signatures first. Clearer entry path.",
        subtitle:
          "Keep legally binding e-signatures and audit evidence. Gain published Free/Pro GBP plans, UK hosting clarity and PDF tools sized for SMEs — not a full Creative Cloud stack.",
        items: [
          "UK-hosted alternative with UK GDPR posture front and centre",
          `Real free tier (${formatFreePlanDocsAMonth()}) — no card to start`,
          `Pro from about ${formatProMonthlyShort()} with Manage PDF included`,
          "Signer links that never force recipient accounts",
          "Tamper-evident seal and Certificate of Completion on every finish",
          "Built for teams who want e-sign without buying Acrobat for every seat",
        ],
      }}
      table={{
        eyebrow: "CivicSign vs Adobe Acrobat Sign",
        title: "UK buyer checklist",
        subtitle:
          "Fair shortlist criteria — hosting, how e-sign is sold, pricing honesty, PDF needs, signer friction and UK law alignment. Confirm Adobe details on adobe.com/uk before you buy.",
        leftLabel: "CivicSign",
        rightLabel: "Adobe Acrobat Sign (typical)",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Dig into the full category page:{" "}
            <Link to="/uk-e-signature-software" className="font-semibold text-[var(--c-primary)] hover:underline">
              UK e-signature software
            </Link>
            . Also see:{" "}
            <Link to="/docusign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              DocuSign alternative
            </Link>
            {" · "}
            <Link to="/esign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              eSign alternative
            </Link>
            {" · "}
            <Link to="/mysign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              MySign alternative
            </Link>
            {" · "}
            <Link to="/eidas-compliant-esignature" className="font-semibold text-[var(--c-primary)] hover:underline">
              eIDAS compliant e-signature
            </Link>
            . Always check Adobe&apos;s site for current pricing.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/uk-e-signature-software", label: "UK e-signature software" },
        { to: "/pricing", label: "Compare pricing" },
        { to: "/register", label: "Start free" },
        { to: "/docusign-alternative", label: "DocuSign alternative" },
        { to: "/esign-alternative", label: "eSign alternative" },
        { to: "/mysign-alternative", label: "MySign alternative" },
        { to: "/legalesign-alternative", label: "Legalesign alternative" },
        { to: "/signable-alternative", label: "Signable alternative" },
        { to: "/eidas-compliant-esignature", label: "eIDAS compliant e-signature" },
        { to: "/product/manage-pdf", label: "Manage PDF" },
        { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents" },
        { to: "/e-signature-for-accountants-uk", label: "E-signature for accountants" },
      ]}
      ctaHeadline="Try this Adobe Sign alternative free"
      ctaSubhead="UK-hosted e-signatures, published GBP plans, Manage PDF on paid tiers, and recipients who never need an account."
    />
  );
}
