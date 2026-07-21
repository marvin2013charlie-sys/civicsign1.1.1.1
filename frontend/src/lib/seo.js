import { POSTS } from "@/lib/blogPosts";
import { CIVICSIGN_CONTACT_EMAIL } from "@/lib/contactEmail";
import { formatFreePlanSeoDescription } from "@/lib/pricing";

export const SITE_NAME = "CivicSign";
export const SITE_TAGLINE = "UK e-signature platform";
export const SITE_URL = (process.env.REACT_APP_SITE_URL || "https://www.civicsign.co.uk").replace(/\/$/, "");
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo512.png`;
export const DEFAULT_TWITTER_HANDLE = "@CivicSignUK";

const TITLE_SUFFIX = ` | ${SITE_NAME}`;

/** Routes that should not appear in Google results. */
const NOINDEX_PREFIXES = [
  "/dashboard",
  "/new",
  "/documents",
  "/templates",
  "/contacts",
  "/manage-pdf",
  "/reports",
  "/usage",
  "/organisation",
  "/settings",
  "/prepare/",
  "/send/",
  "/envelope/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/sign/",
  "/form/",
  "/admin",
];

const HOME_FAQS = [
  ["Are signatures from CivicSign legally binding?", "Yes. CivicSign is built around UK law, the Electronic Communications Act 2000, the UK eIDAS Regulation, and the Law Commission's 2019 report on the electronic execution of documents, capturing intent, consent, attribution, and a tamper-evident audit trail on every completed document."],
  ["Is CivicSign UK GDPR compliant?", "Yes. CivicSign is UK-owned and UK-hosted. Personal data is processed under UK GDPR and the Data Protection Act 2018, with strict access controls, encryption in transit, and a clear data-subject rights process you can exercise at any time."],
  ["Do my signers need an account?", "No. Recipients sign through a secure, tokenized link on any device, no account or download required."],
  ["What file types can I upload?", "PDF and Word (.docx) documents. Word files are automatically converted to PDF while preserving your layout."],
  ["How do you keep documents secure?", "We use encryption in transit, hashed passwords, tokenized links, and seal every finalized document with a SHA-256 hash so any change is detectable."],
];

const STATIC_ROUTES = {
  "/": {
    title: `${SITE_NAME} | UK E-Signature Platform — Legally Binding & UK GDPR Compliant`,
    description:
      "CivicSign is the UK's homegrown e-signature platform. Send contracts, NDAs and offer letters for legally binding electronic signatures with a tamper-evident audit trail. UK-built, UK-hosted, UK eIDAS aligned. Start free.",
    path: "/",
  },
  "/about": {
    title: `About CivicSign — Britain's E-Signature Platform${TITLE_SUFFIX}`,
    description:
      "Meet CivicSign: the UK's first homegrown, UK GDPR-approved e-signature platform. Built in Britain for freelancers, SMEs and teams who need fast, trustworthy electronic signatures.",
    path: "/about",
  },
  "/contact": {
    title: `Contact CivicSign — Sales & Support${TITLE_SUFFIX}`,
    description:
      "Get in touch with the CivicSign team for product questions, sales, support and partnerships. UK-based team, replies within one business day.",
    path: "/contact",
  },
  "/blog": {
    title: `Blog — UK E-Signatures, GDPR & Compliance Guides${TITLE_SUFFIX}`,
    description:
      "Practical UK guides on electronic signatures, UK GDPR, eIDAS, HR, property, healthcare and sector compliance from the CivicSign editorial team.",
    path: "/blog",
  },
  "/resources": {
    title: `Resources — UK E-Signature Guides & Tools${TITLE_SUFFIX}`,
    description:
      "Free resources for UK teams adopting electronic signatures: compliance explainers, workflow guides and product documentation from CivicSign.",
    path: "/resources",
  },
  "/careers": {
    title: `Careers at CivicSign — Join Our UK Team${TITLE_SUFFIX}`,
    description:
      "Help build Britain's trusted e-signature platform. View open roles at CivicSign across engineering, product, growth and customer success.",
    path: "/careers",
  },
  "/legal/privacy": {
    title: `Privacy Policy${TITLE_SUFFIX}`,
    description:
      "How CivicSign collects, uses and protects your personal data under UK GDPR and the Data Protection Act 2018. UK-hosted electronic signature platform.",
    path: "/legal/privacy",
  },
  "/legal/terms": {
    title: `Terms & Conditions${TITLE_SUFFIX}`,
    description:
      "Terms governing use of the CivicSign electronic signature platform and related services operated by CivicBot LTD in England and Wales.",
    path: "/legal/terms",
  },
  "/legal/cookies": {
    title: `Cookie Policy${TITLE_SUFFIX}`,
    description:
      "How CivicSign uses cookies and similar technologies on our website and e-signature platform, and how you can manage your preferences.",
    path: "/legal/cookies",
  },
  "/legal/refunds": {
    title: `Refund Policy${TITLE_SUFFIX}`,
    description:
      "CivicSign refund and cooling-off policy for subscriptions and pay-as-you-go purchases. Contact info@civicbot.co.uk for billing enquiries.",
    path: "/legal/refunds",
  },
  "/pricing": {
    title: `Pricing — Simple UK E-Signature Plans${TITLE_SUFFIX}`,
    description:
      "CivicSign pricing: Free plan with documents per billing period, Pro from £15/month, Business from £79/month. Manage PDF on paid plans. No card required to start.",
    path: "/pricing",
  },
  "/product/manage-pdf": {
    title: `Manage PDF — Edit, Compress, Watermark & Sign${TITLE_SUFFIX}`,
    description:
      "CivicSign Manage PDF: edit, merge, split, compress, watermark, protect, unlock, convert and AI-scan PDFs in one UK workspace. Included on all paid plans — save to Documents and send for signature.",
    path: "/product/manage-pdf",
  },
  "/product/id-verification": {
    title: `ID Verification — Document, Liveness & Face Match Before You Sign${TITLE_SUFFIX}`,
    description:
      "CivicSign ID verification (coming soon): passport and driving licence checks, liveness, face match and fail-closed fraud signals before e-signature. UK GDPR-aligned, optional on high-trust envelopes.",
    path: "/product/id-verification",
  },
  "/solutions": {
    title: `Industry Solutions — E-Signatures by Sector${TITLE_SUFFIX}`,
    description:
      "Explore CivicSign solutions for UK estate agents, solicitors, HR teams, healthcare, education, charities, construction, finance and staffing agencies. UK-built, UK-hosted, court-ready audit trails.",
    path: "/solutions",
  },
  "/solutions/real-estate": {
    title: `E-Signatures for UK Estate Agents & Lettings${TITLE_SUFFIX}`,
    description:
      "Send ASTs, memorandums of sale and statutory notices with CivicSign. UK-built e-signatures for estate agents, letting agents, landlords and conveyancers. UK GDPR compliant.",
    path: "/solutions/real-estate",
  },
  "/solutions/construction": {
    title: `E-Signatures for UK Construction & Trades${TITLE_SUFFIX}`,
    description:
      "Sign quotes, JCT contracts, variations and RAMS with CivicSign. Electronic signatures built for UK builders, contractors and construction firms.",
    path: "/solutions/construction",
  },
  "/solutions/legal": {
    title: `E-Signatures for UK Solicitors & Legal Teams${TITLE_SUFFIX}`,
    description:
      "Send engagement letters, NDAs, retainers and witnessed deeds in minutes. UK eIDAS aligned e-signatures for solicitors and in-house legal teams.",
    path: "/solutions/legal",
  },
  "/solutions/financial-services": {
    title: `E-Signatures for UK Accountants & Financial Services${TITLE_SUFFIX}`,
    description:
      "Engagement letters, AML declarations and client agreements signed electronically. UK GDPR compliant e-signatures for accountants and financial advisers.",
    path: "/solutions/financial-services",
  },
  "/solutions/staffing-agency": {
    title: `E-Signatures for UK Staffing Agencies${TITLE_SUFFIX}`,
    description:
      "Candidate contracts, Right to Work checks and client terms signed in minutes. CivicSign for UK recruitment and staffing agencies.",
    path: "/solutions/staffing-agency",
  },
  "/solutions/hr": {
    title: `E-Signatures for UK HR & People Teams${TITLE_SUFFIX}`,
    description:
      "Offer letters, employment contracts, policies and leaver packs with a full audit trail. UK GDPR compliant HR e-signatures from CivicSign.",
    path: "/solutions/hr",
  },
  "/solutions/healthcare": {
    title: `E-Signatures for UK Healthcare & Clinics${TITLE_SUFFIX}`,
    description:
      "Patient consent forms, care plans and staff acknowledgements with UK GDPR strict by default. E-signatures for GP practices, clinics and care providers.",
    path: "/solutions/healthcare",
  },
  "/solutions/education": {
    title: `E-Signatures for UK Schools & Education${TITLE_SUFFIX}`,
    description:
      "Parental consent, staff contracts and safeguarding declarations for schools, MATs and colleges. DfE-aligned UK e-signatures from CivicSign.",
    path: "/solutions/education",
  },
  "/solutions/charities": {
    title: `E-Signatures for UK Charities & CICs${TITLE_SUFFIX}`,
    description:
      "Gift Aid declarations, trustee resolutions and volunteer agreements signed before enthusiasm fades. Charity Commission and HMRC aligned.",
    path: "/solutions/charities",
  },
  "/solutions/sales": {
    title: `E-Signatures for UK Sales Teams${TITLE_SUFFIX}`,
    description:
      "Close deals faster with proposals, MSAs, order forms and NDAs signed the same day. UK eIDAS aligned e-signatures for B2B sales teams.",
    path: "/solutions/sales",
  },
  "/solutions/freelancers": {
    title: `E-Signatures for UK Freelancers & Consultants${TITLE_SUFFIX}`,
    description:
      "Send SOWs, MSAs, IP assignments and payment terms clients sign in minutes. Free tier for sole traders — UK GDPR compliant from CivicSign.",
    path: "/solutions/freelancers",
  },
};

/** Signed-in app, auth, and workflow routes — not for search, but need correct tab titles. */
const APP_ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/new": "New envelope",
  "/documents": "Documents & seals",
  "/templates": "Templates",
  "/contacts": "Contacts",
  "/manage-pdf": "Manage PDF",
  "/reports": "Reports",
  "/usage": "Usage",
  "/organisation": "Organisation",
  "/settings": "Settings",
  "/login": "Sign in",
  "/register": "Create account",
  "/forgot-password": "Forgot password",
  "/reset-password": "Reset password",
  "/verify-email": "Verify email",
  "/privacy": "Privacy Policy",
  "/terms": "Terms & Conditions",
  "/cookies": "Cookie Policy",
  "/refunds": "Refund Policy",
};

const PREFIX_ROUTE_TITLES = [
  ["/prepare/", "Prepare document"],
  ["/send/", "Send for signature"],
  ["/envelope/", "Envelope"],
  ["/sign/", "Sign document"],
  ["/form/", "Complete form"],
];

function appRouteSeo(path, title) {
  return {
    title: `${title}${TITLE_SUFFIX}`,
    description: STATIC_ROUTES["/"].description,
    path,
    noindex: true,
  };
}

function shouldNoindex(pathname) {
  return NOINDEX_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function truncate(text, max = 160) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    legalName: "CivicBot LTD",
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    email: CIVICSIGN_CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "71-75 Shelton Street",
      addressLocality: "London",
      postalCode: "WC2H 9JQ",
      addressCountry: "GB",
    },
    areaServed: "GB",
    sameAs: [],
  };
}

function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: STATIC_ROUTES["/"].description,
    publisher: { "@type": "Organization", name: SITE_NAME },
    inLanguage: "en-GB",
  };
}

function buildSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      description: formatFreePlanSeoDescription(),
    },
    description: STATIC_ROUTES["/"].description,
    url: SITE_URL,
    featureList: [
      "Legally binding UK electronic signatures",
      "Tamper-evident audit trail",
      "PDF and Word document support",
      "Sequential and parallel signer routing",
      "UK GDPR compliant hosting",
    ],
  };
}

function buildFaqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

function buildHomeJsonLd() {
  return [
    buildOrganizationJsonLd(),
    buildWebSiteJsonLd(),
    buildSoftwareApplicationJsonLd(),
    buildFaqJsonLd(HOME_FAQS),
  ];
}

export function buildBlogPostSeo(post) {
  if (!post) return null;
  const path = `/blog/${post.slug}`;
  return {
    title: `${post.title}${TITLE_SUFFIX}`,
    description: truncate(post.excerpt),
    path,
    image: post.image,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      image: post.image,
      datePublished: post.date,
      author: { "@type": "Organization", name: post.author || SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE } },
      mainEntityOfPage: absoluteUrl(path),
      inLanguage: "en-GB",
    },
  };
}

export function buildJobSeo(job) {
  if (!job) return null;
  const path = `/careers/${job.slug}`;
  const description = truncate(
    job.summary || job.description?.split(/\n/)[0] || `Join CivicSign as ${job.title}. UK-based e-signature platform hiring in ${job.location || "the United Kingdom"}.`,
  );
  return {
    title: `${job.title} — Careers${TITLE_SUFFIX}`,
    description,
    path,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: job.description,
      hiringOrganization: {
        "@type": "Organization",
        name: SITE_NAME,
        sameAs: SITE_URL,
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressCountry: "GB",
        },
      },
      url: absoluteUrl(path),
    },
  };
}

export function getSeoForPath(pathname) {
  const path = pathname.split("?")[0].split("#")[0] || "/";
  const noindex = shouldNoindex(path);

  if (STATIC_ROUTES[path]) {
    const route = STATIC_ROUTES[path];
    return {
      ...route,
      noindex,
      jsonLd: path === "/" ? buildHomeJsonLd() : undefined,
    };
  }

  if (path.startsWith("/blog/") && path !== "/blog/") {
    return {
      title: `UK E-Signature Guides${TITLE_SUFFIX}`,
      description: STATIC_ROUTES["/blog"].description,
      path,
      noindex,
      type: "article",
    };
  }

  if (path.startsWith("/careers/") && path !== "/careers/") {
    return {
      title: `Careers${TITLE_SUFFIX}`,
      description: STATIC_ROUTES["/careers"].description,
      path,
      noindex: false,
    };
  }

  if (APP_ROUTE_TITLES[path]) {
    return appRouteSeo(path, APP_ROUTE_TITLES[path]);
  }

  for (const [prefix, title] of PREFIX_ROUTE_TITLES) {
    if (path.startsWith(prefix)) {
      return appRouteSeo(path, title);
    }
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    return appRouteSeo(path, "Admin console");
  }

  return {
    title: `Page Not Found${TITLE_SUFFIX}`,
    description: "The page you are looking for could not be found on CivicSign.",
    path,
    noindex: true,
  };
}

function upsertMeta(attr, key, content) {
  if (content == null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id, data) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!data) return;

  const payloads = Array.isArray(data) ? data : [data];
  payloads.forEach((payload, index) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = payloads.length > 1 ? `${id}-${index}` : id;
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  });
}

function clearJsonLd(id) {
  document
    .querySelectorAll(`script[id="${id}"], script[id^="${id}-"]`)
    .forEach((node) => node.remove());
}

export function applyPageSeo(meta) {
  if (!meta) return;

  const title = meta.title || `${SITE_NAME} | ${SITE_TAGLINE}`;
  const description = truncate(meta.description || STATIC_ROUTES["/"].description);
  const canonical = absoluteUrl(meta.path || "/");
  const image = meta.image || DEFAULT_OG_IMAGE;
  const robots = meta.noindex ? "noindex, nofollow" : "index, follow";
  const ogType = meta.type || "website";

  document.title = title;
  document.documentElement.lang = "en-GB";

  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", ogType);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:locale", "en_GB");
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
  upsertLink("canonical", canonical);

  clearJsonLd("cs-jsonld");
  upsertJsonLd("cs-jsonld", meta.jsonLd);
}

/** Public URLs for sitemap generation (build-time / static file). */
export function getPublicSitemapPaths() {
  const staticPaths = Object.keys(STATIC_ROUTES);
  const blogPaths = POSTS.map((post) => `/blog/${post.slug}`);
  return [...staticPaths, ...blogPaths];
}