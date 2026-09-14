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
    title: "UK-hosted for UK buyers",
    body: "CivicSign is UK-owned and UK-hosted e-signature software. If you are shortlisting a MySign alternative because data residency and UK GDPR posture matter, start here — with hosting and ownership you can explain to compliance alongside other UK vendors.",
  },
  {
    icon: BadgePoundSterling,
    title: "Pricing finance can explain",
    body: (
      <>
        Published GBP plans: Free with {formatFreePlanDocsAMonth()}, Pro from about {formatProMonthlyShort()} per user.
        A real free tier to evaluate — not only a short trial. MySign typically markets flat (not per-seat) GBP plans; check their site for current pricing, then compare honesty and fit for your team size.{" "}
        <Link to="/pricing" className="font-semibold text-[var(--c-primary)] hover:underline">
          See CivicSign pricing
        </Link>
        .
      </>
    ),
  },
  {
    icon: FileStack,
    title: "Manage PDF 2-in-1",
    body: (
      <>
        Edit, merge, split, compress, watermark and protect PDFs, then send for signature in the same UK workspace.
        Paid plans include Manage PDF — less tool sprawl than signing in one product and editing in another.{" "}
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
    body: "Recipients open a secure link, review the document and sign on any device. No CivicSign account, no app store trip, no friction that kills completion rates.",
  },
  {
    icon: ShieldCheck,
    title: "UK GDPR & UK eIDAS aligned",
    body: "Built for legally binding electronic signatures in England and Wales — Electronic Communications Act 2000, UK eIDAS SES/AES where appropriate, tamper-evident Certificate of Completion on every seal.",
  },
  {
    icon: Sparkles,
    title: "Faster for UK SMEs",
    body: "Upload, prepare and send in minutes. CivicSign is shaped for freelancers, SMEs and in-house teams who want lawful signatures without enterprise procurement theatre.",
  },
];

const FAQS = [
  [
    "Is CivicSign a MySign alternative?",
    "Yes. CivicSign covers the core UK send-and-sign workflow teams use MySign for — with UK hosting, published GBP pricing, a real free tier, Manage PDF on paid plans, and no signer accounts.",
  ],
  [
    "How does pricing compare to MySign?",
    `${formatFreePlanSignupPitch()} Pro is about ${formatProMonthlyShort()} per user with Manage PDF included. MySign typically publishes flat (not per-seat) GBP plans and may lead with a trial rather than an ongoing free plan — check their site for current pricing before you buy, then shortlist on honesty and fit.`,
  ],
  [
    "Where is CivicSign data hosted?",
    "CivicSign is UK-owned and UK-hosted. Personal data is processed under UK GDPR and the Data Protection Act 2018 — a clear fit for UK buyers comparing MySign and other UK e-signature options.",
  ],
  [
    "Do my signers need an account?",
    "No. Signers use a secure browser link on any device. Completed documents download as sealed PDFs with a Certificate of Completion and SHA-256 hash.",
  ],
  [
    "Will my existing PDFs and Word files work?",
    "Upload PDF or Word, place signature and form fields, then send. On paid plans, Manage PDF lets you fix the file before you send — merge, split, compress, watermark and more.",
  ],
];

const TABLE_ROWS = [
  {
    criterion: "Hosting & ownership",
    left: "UK-owned, UK-hosted",
    right: "UK e-signature vendor with UK data residency claims — confirm current hosting for your contract",
  },
  {
    criterion: "Published entry pricing",
    left: `Free ${formatFreePlanDocsAMonth()}; Pro ~${formatProMonthlyShort()}`,
    right: "Typically flat (not per-seat) GBP plans — check their site for current pricing",
  },
  {
    criterion: "Free tier to evaluate",
    left: "Ongoing free plan (no card to start)",
    right: "Often trial-led rather than a permanent free tier — verify on their site",
  },
  {
    criterion: "PDF tools",
    left: "Manage PDF 2-in-1 on paid plans",
    right: "Signing-first; PDF editing usually separate or limited",
  },
  {
    criterion: "Signer accounts",
    left: "Never required",
    right: "Varies by workflow — check recipient friction",
  },
  {
    criterion: "UK GDPR / eIDAS",
    left: "Designed for UK GDPR & UK eIDAS SES/AES",
    right: "UK compliance claims — verify DPA and residency terms",
  },
  {
    criterion: "Best fit",
    left: "UK freelancers, SMEs & teams wanting clear GBP seat plans + PDF tools",
    right: "Teams who prefer flat team pricing and already use MySign",
  },
];

export default function MysignAlternative() {
  return (
    <MarketingMoneyPage
      testId="mysign-alternative-page"
      eyebrow="MySign alternative UK"
      headline={
        <>
          A clearer MySign alternative for UK teams
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </>
      }
      subhead="Comparing MySign to CivicSign? CivicSign is UK e-signature software with UK hosting, honest GBP pricing, Manage PDF 2-in-1 on paid plans, a free tier to evaluate, and no signer accounts — built for UK GDPR and UK eIDAS without the enterprise maze."
      points={POINTS}
      comparison={{
        eyebrow: "Why UK buyers shortlist CivicSign",
        title: "Same lawful signatures. Clearer entry path.",
        subtitle:
          "Keep legally binding e-signatures and audit evidence. Gain published Free/Pro GBP plans, UK hosting clarity and PDF tools in one product.",
        items: [
          "UK-hosted alternative with UK GDPR posture front and centre",
          `Real free tier (${formatFreePlanDocsAMonth()}) — no card to start`,
          `Pro from about ${formatProMonthlyShort()} with Manage PDF included`,
          "Signer links that never force recipient accounts",
          "Tamper-evident seal and Certificate of Completion on every finish",
          "Internal links to pricing, UK product page and other competitor alternatives",
        ],
      }}
      table={{
        eyebrow: "CivicSign vs MySign",
        title: "UK buyer checklist",
        subtitle:
          "Fair shortlist criteria — hosting, pricing honesty, free-tier clarity, PDF workflow, signer friction and UK law alignment. Confirm MySign details on their current site before you buy.",
        leftLabel: "CivicSign",
        rightLabel: "MySign (typical)",
        rows: TABLE_ROWS,
        footnote: (
          <>
            Dig into the full category page:{" "}
            <Link to="/uk-e-signature-software" className="font-semibold text-[var(--c-primary)] hover:underline">
              UK e-signature software
            </Link>
            . Also see:{" "}
            <Link to="/legalesign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              Legalesign alternative
            </Link>
            {" · "}
            <Link to="/signable-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              Signable alternative
            </Link>
            {" · "}
            <Link to="/esign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              eSign alternative
            </Link>
            . Always check MySign&apos;s site for current pricing.
          </>
        ),
      }}
      faqs={FAQS}
      related={[
        { to: "/uk-e-signature-software", label: "UK e-signature software" },
        { to: "/pricing", label: "Compare pricing" },
        { to: "/register", label: "Start free" },
        { to: "/legalesign-alternative", label: "Legalesign alternative" },
        { to: "/signable-alternative", label: "Signable alternative" },
        { to: "/esign-alternative", label: "eSign alternative" },
        { to: "/docusign-alternative", label: "DocuSign alternative" },
        { to: "/product/manage-pdf", label: "Manage PDF" },
        { to: "/adobe-sign-alternative", label: "Adobe Sign alternative" },
        { to: "/eidas-compliant-esignature", label: "eIDAS compliant e-signature" },
        { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
        { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
        { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents" },
        { to: "/solutions", label: "Solutions" },
      ]}
      ctaHeadline="Try this MySign alternative free"
      ctaSubhead="UK-hosted e-signatures, published GBP plans, Manage PDF on paid tiers, and recipients who never need an account."
    />
  );
}
