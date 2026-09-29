/**
 * Single source of truth for the /uk-e-signature-software money page.
 *
 * Plain JS (no JSX, relative imports only) so it can be used by:
 *  - the React page (frontend/src/pages/UkESignatureSoftware.jsx)
 *  - seo.js (FAQPage JSON-LD)
 *  - scripts/generate-page-seo.mjs (pre-rendered HTML body served to crawlers)
 *
 * Rich text = array of segments: plain strings or { to, label } internal links.
 *
 * Honesty rules: CivicSign facts must match the product (pricing.js / planFeatures.js).
 * CivicSign issues simple electronic signatures (SES) only — AES/QES are not implemented.
 * Competitor facts come only from each vendor's own public pages on UK_ESIGN_PRICES_CHECKED.
 */
import {
  BUSINESS_MONTHLY_GBP,
  FREE_MONTHLY_DOCS,
  PRO_MONTHLY_DOCS,
  PRO_MONTHLY_GBP,
  SUBSCRIPTION_TRIAL_DAYS_DEFAULT,
  formatExtraDocumentPrice,
} from "./pricing.js";

export const UK_ESIGN_PATH = "/uk-e-signature-software";
/** ISO date used for JSON-LD dateModified and the sitemap. */
export const UK_ESIGN_LAST_UPDATED = "2026-09-29";
export const UK_ESIGN_LAST_UPDATED_LABEL = "29 September 2026";
export const UK_ESIGN_PRICES_CHECKED = "29 September 2026";

const PRO = `£${PRO_MONTHLY_GBP}`;
const BUSINESS = `£${BUSINESS_MONTHLY_GBP}`;
const EXTRA = formatExtraDocumentPrice({ includeTaxNote: true });

export const UK_ESIGN_HERO = {
  eyebrow: "UK e-signature software · 2026 buyer's guide",
  h1: "UK e-signature software",
  intro:
    `Send contracts, NDAs, offer letters and engagement letters for legally binding electronic signatures under UK law. CivicSign is e-signature software from a UK company for freelancers, SMEs and teams: published GBP pricing, a free plan with ${FREE_MONTHLY_DOCS} documents a month, no signer accounts, a sealed audit trail, and Manage PDF on paid plans.`,
  guideNote:
    "Below you will also find an honest comparison of the UK e-signature tools buyers shortlist most — Legalesign, Signable, MySign, eSign, DocuSign and Adobe Acrobat Sign — plus a buyer's checklist and the UK law in plain English.",
};

export const UK_ESIGN_SHORT_ANSWER = {
  title: "Best UK e-signature software in 2026: the short answer",
  intro:
    "There is no single best UK e-signature software for everyone. The right choice depends on the signature level you need, how you want to pay and where your data must live. Based on what each vendor publishes on its own website:",
  items: [
    [
      { strong: "CivicSign" },
      ` — best fit if you want a genuine free plan, simple per-user GBP pricing (Pro ${PRO}/user/month excl. VAT), PDF editing in the same product, and simple electronic signatures (SES) with a sealed audit trail for everyday contracts.`,
    ],
    [
      { strong: "Legalesign" },
      " — worth a look if you need advanced or qualified signatures (AES/QES), online witnessing or a developer API from a Cambridge-based vendor.",
    ],
    [
      { strong: "Signable" },
      " — suits teams that prefer unlimited users with per-envelope plans and advertise AES, ISO 27001 and UK-hosted data.",
    ],
    [
      { strong: "MySign" },
      " — flat per-plan pricing (not per seat) and a stated UK data centre guarantee.",
    ],
    [
      { strong: "eSign" },
      " — AES on every plan, UK data residency and a Public Services Network (PSN) listing, popular with the public sector.",
    ],
    [
      { strong: "DocuSign and Adobe Acrobat Sign" },
      " — global suites. DocuSign lists 1,000+ integrations and keeps AES, QES and data residency on Enhanced plans; Adobe bundles e-signing into Acrobat for teams.",
    ],
  ],
};

export const UK_ESIGN_PROOF = [
  {
    key: "law",
    title: "Legally binding under UK law",
    body:
      "Electronic signatures are admissible under section 7 of the Electronic Communications Act 2000 and cannot be denied legal effect just for being electronic under Article 25 of UK eIDAS. CivicSign captures intent, consent and attribution on every envelope.",
  },
  {
    key: "gdpr",
    title: "UK company, UK GDPR",
    body:
      "CivicSign is run by CivicBot LTD, a company registered in England and Wales. Personal data is processed under UK GDPR and the Data Protection Act 2018, with encryption in transit, access controls and a clear data-subject rights process.",
  },
  {
    key: "audit",
    title: "Audit trail & Certificate of Completion",
    body:
      "Every completed document is sealed with a SHA-256 hash and a Certificate of Completion recording who signed, when and from where, so any change after signing is detectable. Download the signed PDF at any time.",
  },
  {
    key: "honest",
    title: "Honest about signature levels",
    body:
      "CivicSign issues simple electronic signatures (SES), which cover most UK business contracts. We do not offer advanced (AES) or qualified (QES) signatures today. If your process mandates them, the comparison below shows who does.",
  },
];

export const UK_ESIGN_COMPARISON = {
  title: "UK e-signature software compared",
  subtitle:
    "Entry pricing, free options, signature levels and data location as each vendor publishes them. CivicSign details come from our own pricing page; everything else comes from the vendor's own website.",
  columns: ["Software", "Entry pricing (GBP)", "Free plan or trial", "Signature levels advertised", "Data location (vendor's claim)", "Built-in PDF tools"],
  rows: [
    {
      name: "CivicSign",
      highlight: true,
      cells: [
        `Free; Pro ${PRO}/user/month; Business ${BUSINESS}/user/month (excl. VAT). Extra documents ${EXTRA}.`,
        `Free plan: ${FREE_MONTHLY_DOCS} documents a month, no card. ${SUBSCRIPTION_TRIAL_DAYS_DEFAULT}-day trial on first paid upgrade.`,
        "SES with audit trail and SHA-256 seal. No AES or QES.",
        "UK company; UK GDPR. Ask us for current hosting and sub-processor details.",
        "Yes: Manage PDF on paid plans (edit, merge, split, compress, watermark, protect).",
      ],
    },
    {
      name: "Legalesign",
      cells: [
        "Pay as you go £1.50/document; Solo Basic £10/month; Team £15/user/month (ex VAT).",
        "Free trial.",
        "AES on all plans; QES on Solo Pro and above; witnessing.",
        "Cambridge, UK company. Check data location with the vendor.",
        "Combine & append PDFs on Solo Pro and above.",
      ],
    },
    {
      name: "Signable",
      cells: [
        "Pay as you go £1.60/envelope; Small £31/month + VAT (50 envelopes, unlimited users).",
        "14-day free trial, no card.",
        "AES.",
        "UK-hosted data, powered by AWS.",
        "Not advertised on the pages we checked.",
      ],
    },
    {
      name: "MySign",
      cells: [
        "Starter £9.99/month (1 user, 10 signatures); Pro £63.99/month billed annually (up to 5 senders).",
        "7-day free trial.",
        "SES; AES and ID verification on Enterprise.",
        "UK data centres.",
        "Not advertised on the pages we checked.",
      ],
    },
    {
      name: "eSign",
      cells: [
        "Personal £10/user/month (5 envelopes); the vendor states Personal to Business prices include VAT.",
        "Free trial; no free plan.",
        "AES on all plans; QES available.",
        "UK-based ISO 27001 data centres.",
        "Not advertised on the pages we checked.",
      ],
    },
    {
      name: "DocuSign",
      cells: [
        "Personal £96 billed annually (5 envelopes/month); Business Pro £33/user/month.",
        "No free plan listed on the UK pricing page.",
        "SES on self-serve plans; AES/QES on Enhanced plans; EU QES add-on from £9/recipient.",
        "Data residency: contact sales (Enhanced plans).",
        "Not advertised on the pages we checked.",
      ],
    },
    {
      name: "Adobe Acrobat Sign",
      cells: [
        "Bundled with Acrobat Standard/Pro for teams; enterprise Acrobat Sign quoted by sales. Check adobe.com/uk.",
        "Check adobe.com/uk.",
        "Check adobe.com/uk for your plan.",
        "Check adobe.com/uk.",
        "Yes, via Acrobat.",
      ],
    },
  ],
  footnote:
    `Checked on ${UK_ESIGN_PRICES_CHECKED} on each vendor's public website. Prices, VAT treatment and features change, so always confirm with the vendor before you buy. Trademarks belong to their owners; CivicSign is not affiliated with any vendor listed.`,
};

export const UK_ESIGN_LEVELS = {
  title: "SES, AES or QES: which UK e-signature do you need?",
  intro:
    "UK eIDAS recognises three levels of electronic signature. All three can be legally binding; they differ in how strongly they tie the signature to the signer.",
  items: [
    {
      level: "Simple electronic signature (SES)",
      body:
        "A typed, drawn or click-to-sign signature backed by an audit trail. It covers most everyday UK business documents: contracts, NDAs, offer letters, engagement letters, supplier terms and tenancy paperwork. CivicSign provides SES on every plan.",
    },
    {
      level: "Advanced electronic signature (AES)",
      body:
        "Uniquely linked to and capable of identifying the signer, under their sole control, and linked to the data so later changes are detectable. Some regulated or higher-risk processes ask for it. CivicSign does not offer AES today.",
    },
    {
      level: "Qualified electronic signature (QES)",
      body:
        "An AES created with a qualified signature creation device and backed by a qualified certificate from a qualified trust service provider. It is rarely required for UK commercial contracts. CivicSign does not offer QES.",
    },
  ],
  outro: [
    "Need more detail? Read ",
    { to: "/eidas-compliant-esignature", label: "eIDAS compliant e-signatures in the UK" },
    " and ",
    { to: "/blog/ses-aes-qes-which-signature-level-uk", label: "SES vs AES vs QES explained" },
    ".",
  ],
};

export const UK_ESIGN_LAW = {
  title: "Are e-signatures legal in the UK? What you can and can't e-sign",
  paragraphs: [
    [
      "Yes. In England and Wales, electronic signatures are admissible in evidence under the Electronic Communications Act 2000, and UK eIDAS says an electronic signature cannot be denied legal effect solely because it is electronic. The Law Commission's 2019 report on electronic execution confirmed that an electronic signature can validly execute a document, including a deed, where the usual formalities are met. Our guide to ",
      { to: "/electronic-signatures-uk", label: "electronic signatures in the UK" },
      " covers the detail.",
    ],
  ],
  exceptionsTitle: "Documents that need extra care",
  exceptions: [
    "Wills: electronic signatures are not currently accepted for wills in England and Wales (Wills Act 1837).",
    "Deeds that need a witness: the witness should be physically present when the signatory signs, even if both sign electronically.",
    "HM Land Registry deeds: HM Land Registry sets its own requirements for electronically signed deeds in Practice Guide 82, including a conveyancer-certified process. Use your conveyancer's compliant platform for these.",
    "Some court, family-law and regulated filings have their own rules. Check the relevant guidance or take legal advice.",
  ],
  disclaimer: "General information only, not legal advice.",
};

export const UK_ESIGN_CHECKLIST = {
  title: "How to choose UK e-signature software: a buyer's checklist",
  intro: "Ten questions to put to every vendor on your shortlist, with CivicSign's answers.",
  items: [
    {
      q: "Which signature level do your documents need?",
      a: "CivicSign: SES with audit trail, which suits most UK commercial documents. If you need AES or QES, choose a vendor that offers them.",
    },
    {
      q: "What evidence do you get when a document is signed?",
      a: "CivicSign: a sealed PDF with a SHA-256 hash and a Certificate of Completion recording signer, time and IP address.",
    },
    {
      q: "Where is data processed, and is there a data processing agreement?",
      a: "CivicSign: a UK company processing personal data under UK GDPR and the Data Protection Act 2018. Ask us for current hosting and sub-processor details.",
    },
    {
      q: "How is pricing measured: per user, per envelope or flat?",
      a: `CivicSign: per user. Free with ${FREE_MONTHLY_DOCS} documents a month, Pro ${PRO}/user/month for up to ${PRO_MONTHLY_DOCS} documents, Business ${BUSINESS}/user/month, all excl. VAT. Yearly billing gives 2 months free.`,
    },
    {
      q: "Can you try it properly before paying?",
      a: `CivicSign: a free-forever plan with no card, plus a ${SUBSCRIPTION_TRIAL_DAYS_DEFAULT}-day trial on your first Pro or Business upgrade.`,
    },
    {
      q: "Do signers need an account or an app?",
      a: "CivicSign: no. Signers open a secure link and sign in the browser on any device.",
    },
    {
      q: "Can you prepare PDFs without another tool?",
      a: "CivicSign: yes. Manage PDF on paid plans lets you edit, merge, split, compress, watermark and protect PDFs, then send them for signature. Word files are converted to PDF automatically.",
    },
    {
      q: "Are reminders, templates and signing order covered?",
      a: "CivicSign: automatic reminders on every plan, team templates on Pro, and sequential or parallel signer routing.",
    },
    {
      q: "Do you need bulk send, an API or webhooks?",
      a: "CivicSign: bulk send, API and webhooks, and recipient authentication are on the Business plan.",
    },
    {
      q: "Can you leave with your documents?",
      a: "CivicSign: signed PDFs and their Certificates of Completion can be downloaded at any time.",
    },
  ],
};

export const UK_ESIGN_SWITCH = {
  title: "Switching from another e-signature provider?",
  intro:
    "Completed documents from your old provider remain valid PDFs you keep. Upload the same Word or PDF templates to CivicSign, place your fields and send. Each comparison below goes deeper:",
  items: [
    { to: "/docusign-alternative", label: "DocuSign alternative UK", body: "Leaving per-envelope US pricing for a free plan and simple GBP plans." },
    { to: "/legalesign-alternative", label: "Legalesign alternative", body: "When you need everyday SES signing and PDF tools rather than QES or an API-first platform." },
    { to: "/signable-alternative", label: "Signable alternative", body: "Per-user pricing and a free tier compared with per-envelope plans." },
    { to: "/mysign-alternative", label: "MySign alternative", body: "A free plan and per-user Pro compared with flat plan pricing." },
    { to: "/esign-alternative", label: "eSign alternative", body: "A free plan and Manage PDF compared with AES-first plans." },
    { to: "/adobe-sign-alternative", label: "Adobe Sign alternative", body: "Send and sign without paying for a full Acrobat licence per seat." },
  ],
};

export const UK_ESIGN_INDUSTRIES = [
  { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors", body: "Engagement letters, NDAs and retainers with a sealed audit trail." },
  { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents", body: "Tenancy agreements, terms of business and sales memos from any device." },
  { to: "/e-signature-for-accountants-uk", label: "E-signature for accountants", body: "Engagement letters and proposals clients sign the same day." },
  { to: "/e-signature-for-hr-uk", label: "E-signature for HR", body: "Offer letters, contracts and policy acknowledgements without chasing post." },
];

/** Keep answers plain text: they are emitted verbatim as FAQPage JSON-LD. */
export const UK_ESIGN_FAQS = [
  [
    "What is UK e-signature software?",
    "UK e-signature software lets you prepare, send and sign documents electronically in a way that holds up under UK law. Good tools capture the signer's intent and consent, keep a tamper-evident audit trail and give you a signed PDF you can rely on. CivicSign does this for freelancers, SMEs and teams in the UK.",
  ],
  [
    "Are electronic signatures legally binding in the UK?",
    "Yes. Electronic signatures are admissible under section 7 of the Electronic Communications Act 2000, and UK eIDAS says a signature cannot be denied legal effect just because it is electronic. The Law Commission confirmed in 2019 that electronic signatures can validly execute documents, including deeds, when the usual formalities are met.",
  ],
  [
    "What is the best UK e-signature software?",
    `It depends on what you sign. CivicSign suits teams that want a free plan, per-user GBP pricing (Pro £${PRO_MONTHLY_GBP}/user/month excl. VAT), built-in PDF tools and simple electronic signatures for everyday contracts. If you need advanced or qualified signatures, online witnessing or HM Land Registry conveyancer-certified signing, compare specialist providers such as Legalesign or eSign using the table on this page.`,
  ],
  [
    "Does CivicSign offer advanced (AES) or qualified (QES) electronic signatures?",
    "No. CivicSign provides simple electronic signatures (SES) with consent capture, an audit trail and a SHA-256 sealed Certificate of Completion. That covers most UK business contracts. If a regulator, lender or counterparty requires AES or QES, choose a provider that offers them.",
  ],
  [
    "Is CivicSign UK GDPR compliant?",
    "CivicSign is operated by CivicBot LTD, a company registered in England and Wales. Personal data is processed under UK GDPR and the Data Protection Act 2018, with encryption in transit, access controls and a clear data-subject rights process. Contact us for current hosting and sub-processor details.",
  ],
  [
    "How much does CivicSign cost?",
    `Free includes ${FREE_MONTHLY_DOCS} documents a month with no card required. Pro is £${PRO_MONTHLY_GBP} per user per month and Business is £${BUSINESS_MONTHLY_GBP} per user per month, both excluding VAT, with 2 months free on yearly billing. Extra documents are ${EXTRA}. Your first Pro or Business upgrade includes a ${SUBSCRIPTION_TRIAL_DAYS_DEFAULT}-day free trial.`,
  ],
  [
    "Do recipients need an account?",
    "No. Signers open a secure link on any device, with no downloads and no CivicSign account required.",
  ],
  [
    "Can I e-sign deeds, wills or HM Land Registry documents?",
    "Electronic signatures are not currently accepted for wills in England and Wales. Deeds can be signed electronically, but a witness should be physically present. HM Land Registry sets its own rules for electronically signed deeds in Practice Guide 82, including a conveyancer-certified process that CivicSign does not provide. Take legal advice for these documents.",
  ],
  [
    "How does CivicSign compare to DocuSign, Signable or Legalesign?",
    "CivicSign offers a free plan, published per-user GBP pricing, Manage PDF on paid plans and no signer accounts. Signable sells per-envelope plans with unlimited users and AES. Legalesign offers AES on every plan plus QES and witnessing on higher tiers. DocuSign keeps AES and QES on enhanced plans or add-ons. See the comparison table on this page for prices checked on each vendor's site.",
  ],
  [
    "Can I switch from another e-signature provider?",
    "Yes. Upload the Word or PDF templates you already use, place your fields and send. Documents you completed with your old provider remain valid PDFs you keep, so there is nothing to migrate.",
  ],
];
