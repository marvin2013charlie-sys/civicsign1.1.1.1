import {
  formatFreePlanTierValue,
  formatFreePlanVerifiedCopy,
} from "@/lib/pricing";

/**
 * Verified UK facts, official sources and editorial metadata for the public blog.
 * Every factual claim in hub sections links to a primary source.
 */

export const OFFICIAL_SOURCES = {
  eca2000s7: {
    label: "Electronic Communications Act 2000, s.7",
    href: "https://www.legislation.gov.uk/ukpga/2000/7/section/7",
  },
  ukEidas: {
    label: "UK eIDAS Regulation (retained EU law)",
    href: "https://www.legislation.gov.uk/eur/2014/910/contents",
  },
  lawCommission2019: {
    label: "Law Commission — Electronic execution of documents (2019)",
    href: "https://www.lawcom.gov.uk/document/electronic-execution-of-documents/",
  },
  hmlrPg82: {
    label: "HM Land Registry — Practice Guide 82",
    href: "https://www.gov.uk/government/publications/hm-land-registry-practice-guides/practice-guide-82-conveyancer-certified-electronic-signatures",
  },
  hmrcGiftAid: {
    label: "HMRC — Gift Aid declarations",
    href: "https://www.gov.uk/guidance/gift-aid-what-donations-your-charity-can-claim-on",
  },
  icoUkGdpr: {
    label: "ICO — UK GDPR guidance",
    href: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/",
  },
  homeOfficeRtw: {
    label: "Home Office — Right to work checks",
    href: "https://www.gov.uk/check-job-applicant-right-to-work",
  },
  lawSociety: {
    label: "Law Society — Electronic signatures practice note",
    href: "https://www.lawsociety.org.uk/topics/business-management/execution-of-a-document-using-and-electronic-signature",
  },
};

/** Dark-strip pillars — each links to legislation or official guidance. */
export const VERIFIED_PILLARS = [
  {
    value: "s.7",
    label: "ECA 2000 — electronic signatures admissible as evidence in UK court",
    source: OFFICIAL_SOURCES.eca2000s7,
    color: "#2DD4BF",
  },
  {
    value: "3 tiers",
    label: "UK eIDAS — simple, advanced and qualified e-signatures recognised",
    source: OFFICIAL_SOURCES.ukEidas,
    color: "#2DD4BF",
  },
  {
    value: "2019",
    label: "Law Commission confirmed e-signatures valid for most English-law contracts",
    source: OFFICIAL_SOURCES.lawCommission2019,
    color: "#2DD4BF",
  },
  {
    value: "PG 82",
    label: "HM Land Registry accepts conveyancer-certified electronic deeds",
    source: OFFICIAL_SOURCES.hmlrPg82,
    color: "#FF7A5C",
  },
];

export const EDITORIAL_STANDARDS = {
  eyebrow: "Editorial standards",
  title: "How we verify what we publish",
  intro:
    "CivicSign editorial content is written for UK businesses, not as legal advice. We cite primary legislation, regulator guidance and official practice guides — and we update articles when those sources change.",
  points: [
    {
      title: "Primary sources first",
      body: "Statutes on legislation.gov.uk, HMRC and ICO guidance, HM Land Registry practice guides, and Home Office employer guidance — not forum posts or vendor white papers.",
    },
    {
      title: "Plain English, precise claims",
      body: "We explain what the law and regulators say in accessible language. Where practice varies by sector, we say so explicitly.",
    },
    {
      title: "Product facts checked against the app",
      body: `Plan limits, signature tiers and Manage PDF availability are verified against CivicSign pricing and in-product copy — ${formatFreePlanVerifiedCopy()}; Manage PDF is on paid plans only.`,
    },
    {
      title: "Not legal advice",
      body: "Articles inform your process; they do not replace advice from a solicitor, conveyancer, accountant or data-protection officer for your specific situation.",
    },
  ],
  disclaimer:
    "This blog is for general information only. CivicSign Ltd is not a law firm. For document-specific advice, consult a qualified professional.",
};

/** Cornerstone articles with one verified fact each. */
export const START_HERE = [
  {
    slug: "are-e-signatures-legal-in-the-uk",
    fact: "Section 7 of the Electronic Communications Act 2000 makes electronic signatures admissible as evidence of authentication in UK proceedings.",
    source: OFFICIAL_SOURCES.eca2000s7,
  },
  {
    slug: "ses-aes-qes-which-signature-level-uk",
    fact: "UK eIDAS Articles 3 and 26 define three tiers — simple, advanced and qualified — with different evidential weight.",
    source: OFFICIAL_SOURCES.ukEidas,
  },
  {
    slug: "hm-land-registry-electronic-signatures-2026",
    fact: "Practice Guide 82 sets out conveyancer-certified electronic signatures HM Land Registry accepts on dispositionary deeds.",
    source: OFFICIAL_SOURCES.hmlrPg82,
  },
  {
    slug: "audit-trail-certificate-of-completion-guide",
    fact: "Courts and regulators look for intent, identity and integrity — timestamps, signer attribution and tamper-evidence on the final PDF.",
    source: OFFICIAL_SOURCES.lawCommission2019,
  },
];

/** Curated topic rows — slugs must exist in blogPosts.js. */
export const TOPIC_COLLECTIONS = [
  {
    category: "UK Law",
    title: "UK law & enforceability",
    description: "Statutes, Law Commission guidance and signature tiers for contracts under English law.",
    slugs: [
      "are-e-signatures-legal-in-the-uk",
      "ses-aes-qes-which-signature-level-uk",
      "nda-confidentiality-agreements-electronic-signatures-uk",
    ],
    solutionTo: "/solutions/legal",
    solutionLabel: "Legal & solicitors",
  },
  {
    category: "Real Estate",
    title: "Property & lettings",
    description: "HM Land Registry practice, ASTs and conveyancer workflows with auditable trails.",
    slugs: [
      "hm-land-registry-electronic-signatures-2026",
      "ast-agreements-electronic-signing-uk-lettings",
    ],
    solutionTo: "/solutions/real-estate",
    solutionLabel: "Real estate solutions",
  },
  {
    category: "HR & People",
    title: "HR & employment",
    description: "Contracts, settlements and Right to Work — aligned with Home Office employer guidance.",
    slugs: [
      "employment-contracts-electronic-signatures-uk",
      "right-to-work-digital-checks-uk-hr",
      "settlement-agreements-electronic-signing-uk-hr",
    ],
    solutionTo: "/solutions/hr",
    solutionLabel: "HR & People Ops",
  },
  {
    category: "Compliance",
    title: "Compliance & data protection",
    description: "UK GDPR, audit trails and sector governance for regulated paperwork.",
    slugs: [
      "uk-gdpr-vs-eu-gdpr-saas-platforms",
      "audit-trail-certificate-of-completion-guide",
      "electronic-signatures-healthcare-consent-uk",
    ],
    solutionTo: "/solutions/healthcare",
    solutionLabel: "Healthcare solutions",
  },
  {
    category: "Charities",
    title: "Charities & fundraising",
    description: "HMRC-compliant Gift Aid declarations and donor records you can produce on request.",
    slugs: ["gift-aid-electronic-declarations-hmrc-guide"],
    solutionTo: "/solutions/charities",
    solutionLabel: "Charity solutions",
  },
];

/** Per-post sources for the article footer (supplements in-body “Further reading”). */
export const POST_SOURCES = {
  "are-e-signatures-legal-in-the-uk": [
    OFFICIAL_SOURCES.eca2000s7,
    OFFICIAL_SOURCES.ukEidas,
    OFFICIAL_SOURCES.lawCommission2019,
    OFFICIAL_SOURCES.lawSociety,
  ],
  "hm-land-registry-electronic-signatures-2026": [
    OFFICIAL_SOURCES.hmlrPg82,
    OFFICIAL_SOURCES.lawCommission2019,
    OFFICIAL_SOURCES.eca2000s7,
  ],
  "gift-aid-electronic-declarations-hmrc-guide": [
    OFFICIAL_SOURCES.hmrcGiftAid,
    OFFICIAL_SOURCES.eca2000s7,
  ],
  "right-to-work-digital-checks-uk-hr": [
    OFFICIAL_SOURCES.homeOfficeRtw,
    OFFICIAL_SOURCES.eca2000s7,
  ],
  "uk-gdpr-vs-eu-gdpr-saas-platforms": [
    OFFICIAL_SOURCES.icoUkGdpr,
    {
      label: "UK GDPR — legislation.gov.uk",
      href: "https://www.legislation.gov.uk/ukpga/2018/12/contents",
    },
  ],
  "employment-contracts-electronic-signatures-uk": [
    OFFICIAL_SOURCES.lawCommission2019,
    OFFICIAL_SOURCES.eca2000s7,
    {
      label: "ACAS — Employment contracts",
      href: "https://www.acas.org.uk/working-for-an-employer/employment-contracts",
    },
  ],
  "ast-agreements-electronic-signing-uk-lettings": [
    OFFICIAL_SOURCES.eca2000s7,
    {
      label: "Gov.uk — Assured shorthold tenancy",
      href: "https://www.gov.uk/private-renting-tenancy-agreements",
    },
  ],
  "ses-aes-qes-which-signature-level-uk": [
    OFFICIAL_SOURCES.ukEidas,
    OFFICIAL_SOURCES.lawCommission2019,
  ],
  "audit-trail-certificate-of-completion-guide": [
    OFFICIAL_SOURCES.lawCommission2019,
    OFFICIAL_SOURCES.eca2000s7,
  ],
  "electronic-signatures-healthcare-consent-uk": [
    OFFICIAL_SOURCES.icoUkGdpr,
    OFFICIAL_SOURCES.eca2000s7,
  ],
};

export const POST_EDITORIAL = {
  "are-e-signatures-legal-in-the-uk": {
    lastReviewed: "February 2026",
    note: "Reviewed against ECA 2000 s.7, UK eIDAS and the Law Commission 2019 report.",
  },
  "hm-land-registry-electronic-signatures-2026": {
    lastReviewed: "February 2026",
    note: "Checked against the current HM Land Registry Practice Guide 82.",
  },
  "gift-aid-electronic-declarations-hmrc-guide": {
    lastReviewed: "January 2026",
    note: "Aligned with HMRC Gift Aid guidance for electronic declarations.",
  },
  "right-to-work-digital-checks-uk-hr": {
    lastReviewed: "January 2026",
    note: "Cross-checked with Home Office Right to work employer guidance.",
  },
  "uk-gdpr-vs-eu-gdpr-saas-platforms": {
    lastReviewed: "January 2026",
    note: "Reviewed against ICO UK GDPR resources.",
  },
  "ses-aes-qes-which-signature-level-uk": {
    lastReviewed: "March 2026",
    note: "Signature tier descriptions verified against UK eIDAS Articles 3, 12 and 26.",
  },
  "audit-trail-certificate-of-completion-guide": {
    lastReviewed: "March 2026",
    note: "Evidentiary requirements aligned with Law Commission electronic execution guidance.",
  },
};

/** Default editorial metadata for posts without explicit entry. */
export const DEFAULT_EDITORIAL = {
  lastReviewed: "2026",
  note: "Facts cited to primary UK legislation or official regulator guidance where applicable.",
};

/** Pull "Further reading" links from article body lists (staff-authored posts). */
export function extractSourcesFromBody(body) {
  if (!Array.isArray(body)) return [];
  const sources = [];
  const seen = new Set();
  for (const block of body) {
    if (block?.type !== "ul" || !Array.isArray(block.content)) continue;
    for (const item of block.content) {
      if (typeof item !== "object" || !item?.href || !item?.text) continue;
      const key = `${item.text}::${item.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({ label: item.text, href: item.href });
    }
  }
  return sources;
}

export function getPostSources(slug, body) {
  if (POST_SOURCES[slug]) return POST_SOURCES[slug];
  const extracted = extractSourcesFromBody(body);
  if (extracted.length > 0) return extracted;
  return [OFFICIAL_SOURCES.eca2000s7, OFFICIAL_SOURCES.lawCommission2019];
}

export function getPostEditorial(slug, post) {
  if (POST_EDITORIAL[slug]) return POST_EDITORIAL[slug];
  if (post?.date) {
    return {
      lastReviewed: post.date,
      note: "Published by CivicSign Editorial. Major factual claims should cite primary UK legislation or official regulator guidance.",
    };
  }
  return DEFAULT_EDITORIAL;
}

export function getPostsBySlugs(posts, slugs) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  return slugs.map((s) => bySlug.get(s)).filter(Boolean);
}

export function slugifyHeading(text) {
  return `section-${String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

/** Extract h2/h3 headings from article body for table of contents. */
export function extractHeadings(body) {
  if (!Array.isArray(body)) return [];
  return body
    .map((block, index) => {
      if (block.type !== "h2" && block.type !== "h3") return null;
      return {
        id: slugifyHeading(block.content),
        text: block.content,
        level: block.type === "h2" ? 2 : 3,
        index,
      };
    })
    .filter(Boolean);
}

/** CivicSign product facts — verified against pricing and in-app copy. */
export const CIVICSIGN_PRODUCT_FACTS = [
  { label: "Free tier", value: formatFreePlanTierValue(), detail: "No card required" },
  { label: "Platform", value: "2-in-1", detail: "Prepare Studio + e-sign in one product" },
  { label: "Manage PDF", value: "Paid plans", detail: "Pro, Business and Organisation — not on Free" },
  { label: "Hosting", value: "UK-owned", detail: "UK GDPR-aligned infrastructure" },
];