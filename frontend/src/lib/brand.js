/**
 * CivicSign brand / entity facts shared by React pages, JSON-LD (seo.js) and the
 * pre-rendered HTML (scripts/generate-page-seo.mjs). Plain JS, no JSX.
 *
 * Keep every statement here factual: CivicSign is UK-owned and UK-hosted and
 * uses simple electronic signatures (SES); Business adds KBA. AES/QES are not offered.
 */
export const BRAND_NAME = "CivicSign";
export const BRAND_DOMAIN = "civicsign.co.uk";
export const BRAND_LEGAL_NAME = "CivicBot LTD";
export const BRAND_ALTERNATE_NAMES = ["Civic Sign", "CivicSign UK", BRAND_DOMAIN];

/** Plain brand statement used on the homepage, About page and Organization schema. */
export const BRAND_STATEMENT =
  "CivicSign (civicsign.co.uk) is a UK-owned, UK-hosted e-signature platform from CivicBot LTD, registered in England and Wales. " +
  "Documents are signed with legally binding simple electronic signatures (SES) and sealed with a tamper-evident audit trail; the Business plan adds knowledge-based authentication (KBA) for recipients.";

/** Short footer version of the brand statement. */
export const BRAND_FOOTER_LINE =
  "CivicSign (civicsign.co.uk) is a UK-owned, UK-hosted e-signature platform. Built in Britain, UK GDPR compliant, with legally binding signatures and a tamper-evident audit trail on every document.";

/** Homepage H1: brand first, then the primary keyword. */
export const HOME_H1_BRAND = BRAND_NAME;
export const HOME_H1_TEXT = "UK e-signature software that gets documents signed";
export const HOME_H1 = `${HOME_H1_BRAND} — ${HOME_H1_TEXT}`;

/**
 * Official third-party profiles for Organization.sameAs.
 * Only add URLs that are live (HTTP 200) and verifiably CivicSign's own listing.
 * Checked 2026-10-07: no profile met that bar yet (LinkedIn /company/civicsign is an
 * unrelated US company; /company/civicbot describes CivicBot's council product;
 * the Hotfrog listing is behind a bot wall and could not be re-verified).
 */
export const BRAND_SAME_AS = [];
