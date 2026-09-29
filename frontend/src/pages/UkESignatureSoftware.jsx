import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgePoundSterling,
  CheckCircle2,
  FileStack,
  Globe2,
  Lock,
  Scale,
  ShieldCheck,
  Stamp,
  UserX,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
import {
  formatExtraDocumentPrice,
  formatFreePlanDocsAMonth,
  formatFreePlanSignupPitch,
  formatProMonthlyShort,
  BUSINESS_MONTHLY_GBP,
} from "@/lib/pricing";
import {
  UK_ESIGN_CHECKLIST,
  UK_ESIGN_COMPARISON,
  UK_ESIGN_FAQS,
  UK_ESIGN_HERO,
  UK_ESIGN_INDUSTRIES,
  UK_ESIGN_LAST_UPDATED,
  UK_ESIGN_LAST_UPDATED_LABEL,
  UK_ESIGN_LAW,
  UK_ESIGN_LEVELS,
  UK_ESIGN_PROOF,
  UK_ESIGN_SHORT_ANSWER,
  UK_ESIGN_SWITCH,
} from "@/lib/ukEsignSoftwareContent";
import {
  CTA_ACTIONS_CLASS,
  CTA_HEADLINE_CLASS,
  CTA_PRIMARY_BTN,
  CTA_PRIMARY_BTN_STYLE,
  CTA_SCRIPT_STYLE,
  CTA_SECONDARY_BTN,
  CTA_SECTION,
  CTA_SUBTEXT_CLASS,
  H_FONT,
  MARKETING_CARD,
  PAPER_TEXT,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

/** FAQ copy lives in ukEsignSoftwareContent.js and also feeds FAQPage JSON-LD in seo.js. */
export const UK_ESIGN_PAGE_FAQS = UK_ESIGN_FAQS;

const LINK_CLASS = "font-semibold text-[var(--c-primary)] hover:underline";
const EYEBROW = "text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]";
const H2 = "mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl";

const PROOF_ICONS = { law: Scale, gdpr: ShieldCheck, audit: Stamp, honest: Lock };

/** Render shared rich-text segments: strings, { to, label } links, { strong } emphasis. */
function Rich({ segments }) {
  return segments.map((seg, i) => {
    if (typeof seg === "string") return <React.Fragment key={i}>{seg}</React.Fragment>;
    if (seg.to) {
      return (
        <Link key={i} to={seg.to} className={LINK_CLASS}>
          {seg.label}
        </Link>
      );
    }
    return (
      <strong key={i} className="font-semibold text-[var(--c-ink)]">
        {seg.strong}
      </strong>
    );
  });
}

const HIGHLIGHTS = [
  {
    icon: Globe2,
    title: "Built for British teams",
    body: "GBP billing, a UK-based team and workflows that match how UK freelancers, SMEs and in-house teams actually sign.",
  },
  {
    icon: FileStack,
    title: "2-in-1 Manage PDF",
    body: (
      <>
        Edit, compress, watermark, merge and split, then send for signature without leaving CivicSign.{" "}
        <Link to="/product/manage-pdf" className={LINK_CLASS}>
          Explore Manage PDF
        </Link>
        .
      </>
    ),
  },
  {
    icon: UserX,
    title: "No friction for signers",
    body: "Recipients tap a secure link, review the document and sign on any device. No account, no app store trip.",
  },
  {
    icon: BadgePoundSterling,
    title: "Honest published pricing",
    body: (
      <>
        Start free, upgrade when volume or PDF tools matter.{" "}
        <Link to="/pricing" className={LINK_CLASS}>
          See full pricing
        </Link>
        .
      </>
    ),
  },
];

const RELATED = [
  { to: "/docusign-alternative", label: "DocuSign alternative" },
  { to: "/legalesign-alternative", label: "Legalesign alternative" },
  { to: "/signable-alternative", label: "Signable alternative" },
  { to: "/esign-alternative", label: "eSign alternative" },
  { to: "/mysign-alternative", label: "MySign alternative" },
  { to: "/adobe-sign-alternative", label: "Adobe Sign alternative" },
  { to: "/eidas-compliant-esignature", label: "eIDAS compliant e-signature" },
  { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
  { to: "/e-signature-for-solicitors-uk", label: "E-signature for solicitors" },
  { to: "/e-signature-for-estate-agents-uk", label: "E-signature for estate agents" },
  { to: "/e-signature-for-accountants-uk", label: "E-signature for accountants" },
  { to: "/e-signature-for-hr-uk", label: "E-signature for HR" },
  { to: "/product/manage-pdf", label: "Manage PDF" },
  { to: "/solutions", label: "Industry solutions" },
  { to: "/blog/are-e-signatures-legal-in-the-uk", label: "Are e-signatures legal?" },
  { to: "/blog/ses-aes-qes-which-signature-level-uk", label: "SES vs AES vs QES" },
  { to: "/pricing", label: "Pricing" },
];

export default function UkESignatureSoftware() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]" data-testid="uk-e-signature-software-page">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className={EYEBROW}>{UK_ESIGN_HERO.eyebrow}</p>
            <h1
              className="mt-3 text-4xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl lg:text-[56px]"
              style={H_FONT}
            >
              {UK_ESIGN_HERO.h1}
              <span style={{ color: "var(--c-accent)" }}>.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
              {UK_ESIGN_HERO.intro}
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              {UK_ESIGN_HERO.guideNote}
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className={`${PRIMARY_CTA} w-full justify-center sm:w-auto`}
                style={PRIMARY_CTA_STYLE}
                data-testid="uk-e-signature-software-page-cta-register"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#uk-e-signature-comparison" className={`${SECONDARY_CTA} w-full justify-center sm:w-auto`}>
                Compare UK providers
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((b) => (
                <li key={b} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-[var(--c-muted-fg)]" data-testid="uk-e-signature-software-last-updated">
              Last updated <time dateTime={UK_ESIGN_LAST_UPDATED}>{UK_ESIGN_LAST_UPDATED_LABEL}</time> · Competitor
              details checked on each vendor&apos;s own website
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16" data-testid="uk-e-signature-short-answer">
        <div className={`${MARKETING_CARD} p-6 sm:p-8`}>
          <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" style={H_FONT}>
            {UK_ESIGN_SHORT_ANSWER.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{UK_ESIGN_SHORT_ANSWER.intro}</p>
          <ul className="mt-5 space-y-3">
            {UK_ESIGN_SHORT_ANSWER.items.map((segments, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                <span>
                  <Rich segments={segments} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className={EYEBROW}>Why CivicSign</p>
          <h2 className={H2} style={H_FONT}>
            What serious UK e-signature software must prove
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Buyers care whether the signed file holds up, where the data is handled, and whether finance can explain
            the bill.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {UK_ESIGN_PROOF.map((point) => {
            const Icon = PROOF_ICONS[point.key] || ShieldCheck;
            return (
              <div key={point.key} className={`${MARKETING_CARD} p-6`}>
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                  style={{ background: "var(--badge-teal-bg)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{point.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="uk-e-signature-comparison"
        className="scroll-mt-24 border-y border-[var(--c-border)] bg-[var(--card)]"
        data-testid="uk-e-signature-comparison"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className={EYEBROW}>Compare options</p>
            <h2 className={H2} style={H_FONT}>
              {UK_ESIGN_COMPARISON.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{UK_ESIGN_COMPARISON.subtitle}</p>
          </div>
          <div className="mt-10 overflow-x-auto rounded-[20px] border border-[var(--c-border)] bg-[var(--c-paper)]">
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">{UK_ESIGN_COMPARISON.title}</caption>
              <thead>
                <tr className="border-b border-[var(--c-border)] text-[11px] uppercase tracking-[1px] text-[var(--c-muted-fg)]">
                  {UK_ESIGN_COMPARISON.columns.map((col) => (
                    <th key={col} scope="col" className="px-4 py-3 align-bottom font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UK_ESIGN_COMPARISON.rows.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-[var(--c-border)] align-top last:border-0"
                    style={row.highlight ? { background: "var(--badge-teal-bg)" } : undefined}
                  >
                    <th
                      scope="row"
                      className={`px-4 py-4 font-semibold ${row.highlight ? "text-[var(--c-primary)]" : "text-[var(--c-ink)]"}`}
                    >
                      {row.name}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-4 py-4 leading-relaxed ${row.highlight ? "text-[var(--c-ink)]" : "text-[var(--c-muted-fg)]"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-5 max-w-4xl text-center text-xs leading-relaxed text-[var(--c-muted-fg)]">
            {UK_ESIGN_COMPARISON.footnote}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16" data-testid="uk-e-signature-levels">
        <div className="mx-auto max-w-3xl text-center">
          <p className={EYEBROW}>Signature levels</p>
          <h2 className={H2} style={H_FONT}>
            {UK_ESIGN_LEVELS.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{UK_ESIGN_LEVELS.intro}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {UK_ESIGN_LEVELS.items.map((item) => (
            <div key={item.level} className={`${MARKETING_CARD} p-6`}>
              <h3 className="text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
                {item.level}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-[var(--c-muted-fg)]">
          <Rich segments={UK_ESIGN_LEVELS.outro} />
        </p>
      </section>

      <section className="border-y border-[var(--c-border)] bg-[var(--card)]" data-testid="uk-e-signature-law">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
          <p className={EYEBROW}>UK law</p>
          <h2 className={H2} style={H_FONT}>
            {UK_ESIGN_LAW.title}
          </h2>
          {UK_ESIGN_LAW.paragraphs.map((segments, i) => (
            <p key={i} className="mt-4 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              <Rich segments={segments} />
            </p>
          ))}
          <h3 className="mt-8 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
            {UK_ESIGN_LAW.exceptionsTitle}
          </h3>
          <ul className="mt-3 space-y-2">
            {UK_ESIGN_LAW.exceptions.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--c-accent)" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-[var(--c-muted-fg)]">{UK_ESIGN_LAW.disclaimer}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16" data-testid="uk-e-signature-checklist">
        <div className="mx-auto max-w-3xl text-center">
          <p className={EYEBROW}>Buyer&apos;s checklist</p>
          <h2 className={H2} style={H_FONT}>
            {UK_ESIGN_CHECKLIST.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{UK_ESIGN_CHECKLIST.intro}</p>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {UK_ESIGN_CHECKLIST.items.map((item, i) => (
            <li key={item.q} className={`${MARKETING_CARD} flex gap-4 p-5`}>
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "var(--badge-teal-bg)", color: "var(--c-primary)" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--c-ink)]">{item.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{item.a}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="grid gap-5 md:grid-cols-2">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`${MARKETING_CARD} p-6`}>
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                    style={{ background: "var(--badge-coral-bg)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--c-accent)" }} />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold" style={H_FONT}>
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className={EYEBROW}>Pricing in GBP</p>
            <h2 className={H2} style={H_FONT}>
              Simple GBP plans. No theatre.
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              {formatFreePlanSignupPitch()}. Pro is {formatProMonthlyShort()} per user, with Manage PDF included.
              Extra documents are {formatExtraDocumentPrice({ includeTaxNote: true })}.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/pricing" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>
                Compare plans <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register" className={SECONDARY_CTA}>
                Create free account
              </Link>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              `Free: ${formatFreePlanDocsAMonth()}, audit trail included`,
              `Pro: ${formatProMonthlyShort()} per user, Manage PDF and templates included`,
              `Business: £${BUSINESS_MONTHLY_GBP}/month excl. VAT per user, bulk send, API & webhooks`,
              "No signer accounts on any plan",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] px-4 py-3 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-[var(--c-border)] bg-[var(--card)]" data-testid="uk-e-signature-switch">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className={EYEBROW}>Switching</p>
            <h2 className={H2} style={H_FONT}>
              {UK_ESIGN_SWITCH.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{UK_ESIGN_SWITCH.intro}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {UK_ESIGN_SWITCH.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${MARKETING_CARD} p-6 transition-colors hover:border-[var(--c-primary)]`}
              >
                <h3 className="text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
                  {item.label} →
                </h3>
                <p className="mt-2 text-sm text-[var(--c-muted-fg)]">{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={EYEBROW}>Who it&apos;s for</p>
            <h2 className={H2} style={H_FONT}>
              E-signature software for UK industries
            </h2>
          </div>
          <Link to="/solutions" className="text-sm font-semibold text-[var(--c-primary)] hover:underline">
            All industry solutions →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {UK_ESIGN_INDUSTRIES.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`${MARKETING_CARD} p-6 transition-colors hover:border-[var(--c-primary)]`}
            >
              <h3 className="text-lg font-semibold" style={H_FONT}>
                {item.label}
              </h3>
              <p className="mt-2 text-sm text-[var(--c-muted-fg)]">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <MarketingFaqSection
        id="uk-e-signature-software-page-faq"
        eyebrow="UK signing FAQs"
        title="Questions teams ask about UK e-signature software"
        faqs={UK_ESIGN_PAGE_FAQS}
        testIdPrefix="uk-e-signature-software-page-faq"
        showContactCta
      />

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          {RELATED.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-2 font-medium text-[var(--c-ink)] hover:border-[var(--c-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <p style={CTA_SCRIPT_STYLE}>Ready when you are</p>
          <h2 className={CTA_HEADLINE_CLASS} style={H_FONT}>
            Try UK e-signature software free
          </h2>
          <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
            {formatFreePlanSignupPitch()}. Legally binding signatures, UK GDPR and a sealed audit trail on every
            document.
          </p>
          <div className={CTA_ACTIONS_CLASS}>
            <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={CTA_SECONDARY_BTN} style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}>
              View pricing
            </Link>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <CookieBanner />
      <FloatingAssistant />
    </div>
  );
}
