/** Shared marketing / solution-page styles — aligned with Landing v3. */

import { formatFreePlanTrustBullet } from "@/lib/pricing";

export const INK = "var(--c-ink-solid)";
export const PAPER_TEXT = "#F8F7F2";

/** Mark full-bleed dark bands so the fixed SiteHeader can invert logo/nav colours. */
export const SITE_HEADER_DARK_CLASS = "site-header-dark-zone";
/** Only full-width section bands — not inline ink cards. */
export const SITE_HEADER_DARK_ZONE = { "data-site-header-dark": "band" };
export const H_FONT = { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif" };

export const HERO_GRADIENT =
  "radial-gradient(900px 460px at 24% 10%, rgba(45,212,191,.16), transparent), radial-gradient(700px 400px at 88% 80%, rgba(255,122,92,.10), transparent)";

export const MARKETING_CARD =
  "rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-xl";

export const SECTION_EYEBROW =
  "text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]";

export const PRIMARY_CTA =
  "inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5";

export const PRIMARY_CTA_STYLE = {
  background: INK,
  boxShadow: "0 12px 28px rgba(18,33,32,.22)",
};

export const SECONDARY_CTA =
  "inline-flex items-center rounded-2xl border border-[var(--c-border)] bg-[var(--card)] px-6 py-3.5 text-base font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]";

export const TRUST_BULLETS = [formatFreePlanTrustBullet(), "No card required", "UK GDPR compliant"];

/** Hero layout — balanced two-column grid; image fills its column on desktop. */
export const HERO_GRID =
  "mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20";

export const HERO_IMAGE_FRAME =
  "mx-auto w-full max-w-[440px] overflow-hidden rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] shadow-[0_28px_64px_rgba(18,33,32,.14)] sm:max-w-[500px] lg:mx-0 lg:max-w-none lg:w-full";

export const HERO_IMAGE = "aspect-[4/3] w-full object-cover";

/** Dark section accent (legal headers, auth panel overlays). */
export const DARK_SECTION_GLOW =
  "radial-gradient(700px 340px at 80% 0%, rgba(45,212,191,.12), transparent), radial-gradient(520px 280px at 12% 100%, rgba(255,122,92,.08), transparent)";

/** Bottom CTA banner — compact height. */
export const CTA_SECTION = "mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:pb-16";
export const CTA_BANNER =
  "relative overflow-hidden rounded-[24px] px-5 py-10 text-center sm:px-10 sm:py-12";
export const CTA_SCRIPT_STYLE = {
  fontFamily: "'Caveat', cursive",
  color: "#2DD4BF",
  fontSize: "clamp(1.65rem, 3.5vw, 2rem)",
};
export const CTA_HEADLINE_CLASS =
  "mt-1.5 text-3xl font-bold leading-[1.12] tracking-[-0.03em] sm:text-4xl";
export const CTA_SUBTEXT_CLASS = "mx-auto mt-3 max-w-md text-[15px] leading-relaxed";
export const CTA_ACTIONS_CLASS = "mt-6 flex flex-wrap justify-center gap-3";
export const CTA_PRIMARY_BTN =
  "inline-flex items-center gap-2 rounded-full px-7 py-3 text-[15px] font-semibold transition-all hover:-translate-y-0.5";
export const CTA_PRIMARY_BTN_STYLE = {
  background: "#2DD4BF",
  color: "#122120",
  boxShadow: "0 10px 24px rgba(45,212,191,.32)",
};
export const CTA_SECONDARY_BTN =
  "rounded-full border px-6 py-3 text-[15px] font-semibold transition-colors hover:bg-white/5";