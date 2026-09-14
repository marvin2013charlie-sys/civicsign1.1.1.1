import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileStack,
  Lock,
  Scale,
  ShieldCheck,
  Stamp,
  BadgePoundSterling,
  Globe2,
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
  formatFreePlanDocsAMonth,
  formatFreePlanSignupPitch,
  formatProMonthlyShort,
  formatExtraDocumentPrice,
} from "@/lib/pricing";
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
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

/** Keep in sync with UK_ESIGN_FAQS in seo.js (FAQ JSON-LD). */
export const UK_ESIGN_PAGE_FAQS = [
  [
    "What is UK e-signature software?",
    "UK e-signature software lets you prepare, send and sign documents electronically under UK law. CivicSign captures signer intent, consent and a tamper-evident audit trail so completed agreements are suitable for everyday UK business use.",
  ],
  [
    "Are CivicSign signatures legally binding?",
    "Yes. CivicSign is built for legally binding electronic signatures in England and Wales, aligned with the Electronic Communications Act 2000 and UK eIDAS requirements for simple and advanced electronic signatures where appropriate.",
  ],
  [
    "Is CivicSign UK GDPR compliant?",
    "Yes. CivicSign is UK-owned and UK-hosted. Personal data is processed under UK GDPR and the Data Protection Act 2018, with encryption in transit, access controls and a clear data-subject rights process.",
  ],
  [
    "Do recipients need an account?",
    "No. Signers open a secure link on any device — no downloads and no CivicSign account required.",
  ],
  [
    "How does CivicSign compare to DocuSign, Signable or Legalesign?",
    "CivicSign is UK-owned e-signature software with UK hosting, published GBP pricing (Free plus Pro from about £15/user/month), Manage PDF on paid plans, and no signer accounts. Global suites often price for enterprise; Legalesign is a common UK/EU shortlist peer — CivicSign emphasises pricing honesty, Manage PDF 2-in-1 and zero signer accounts for UK SMEs.",
  ],
  [
    "What is on the free plan?",
    `Free includes ${formatFreePlanDocsAMonth()}, no card required. Extra documents are ${formatExtraDocumentPrice({ includeTaxNote: true })} if you go over. Audit trail and Certificate of Completion are included on every plan.`,
  ],
  [
    "SES, AES or QES — what do I need?",
    "Most UK SME contracts only need a simple electronic signature (SES) with a clear audit trail. Advanced electronic signatures (AES) are available on Pro and default on Business. Qualified electronic signatures (QES) are on request for Business — we do not pretend QES is required for every envelope.",
  ],
];

const PROOF = [
  {
    icon: Scale,
    title: "Legally binding under UK law",
    body: "Designed around the Electronic Communications Act 2000, UK eIDAS and Law Commission guidance on electronic execution — with intent, consent and attribution captured on every envelope.",
  },
  {
    icon: ShieldCheck,
    title: "UK data, UK GDPR",
    body: "UK-owned and UK-hosted. Personal data stays under UK GDPR and the Data Protection Act 2018 — not an afterthought on a US-centric stack.",
  },
  {
    icon: Stamp,
    title: "Audit trail & Certificate of Completion",
    body: "Every completed document is sealed with a Certificate of Completion and a SHA-256 hash so changes after signing are detectable.",
  },
  {
    icon: Lock,
    title: "SES and AES when you need them",
    body: "Simple electronic signatures for everyday contracts; advanced electronic signatures on paid plans when identity binding matters more.",
  },
];

const COMPARE_ROWS = [
  {
    criterion: "Hosting & ownership",
    civicsign: "UK-owned, UK-hosted",
    others: "DocuSign: often US/global cloud. Signable & Legalesign: UK/EU-oriented — confirm residency on contract",
  },
  {
    criterion: "PDF tools",
    civicsign: "2-in-1 Manage PDF on paid plans",
    others: "Usually a separate PDF editor or add-on (including typical Legalesign setups)",
  },
  {
    criterion: "Pricing",
    civicsign: `Free ${formatFreePlanDocsAMonth()}; Pro ~${formatProMonthlyShort()}`,
    others: "DocuSign often enterprise-quoted; Signable/Legalesign vary — CivicSign publishes GBP entry plans",
  },
  {
    criterion: "Signer accounts",
    civicsign: "Never required",
    others: "Some workflows push recipient accounts or apps — check before you shortlist",
  },
  {
    criterion: "UK GDPR / eIDAS",
    civicsign: "Designed for UK GDPR & UK eIDAS SES/AES",
    others: "All serious vendors claim compliance — verify DPA, hosting and signature level for your use case",
  },
];

const HIGHLIGHTS = [
  {
    icon: Globe2,
    title: "Built for British teams",
    body: "GBP billing, UK support hours and workflows that match how UK freelancers, SMEs and in-house teams actually sign.",
  },
  {
    icon: FileStack,
    title: "2-in-1 Manage PDF",
    body: (
      <>
        Edit, compress, watermark, merge and split, then send for signature without leaving CivicSign.{" "}
        <Link to="/product/manage-pdf" className="font-semibold text-[var(--c-primary)] hover:underline">
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
        <Link to="/pricing" className="font-semibold text-[var(--c-primary)] hover:underline">
          See full pricing
        </Link>
        .
      </>
    ),
  },
];

const USE_CASES = [
  { title: "Legal", to: "/solutions/legal", body: "Engagement letters and settlements with court-ready evidence." },
  { title: "HR", to: "/solutions/hr", body: "Offer letters, NDAs and policy acknowledgements at scale." },
  { title: "Real estate", to: "/solutions/real-estate", body: "Tenancy agreements and disclosures from any device." },
  { title: "Freelancers", to: "/solutions/freelancers", body: "SOWs and MSAs clients can sign the same afternoon." },
];

const RELATED = [
  { to: "/docusign-alternative", label: "DocuSign alternative" },
  { to: "/legalesign-alternative", label: "Legalesign alternative" },
  { to: "/signable-alternative", label: "Signable alternative" },
  { to: "/electronic-signatures-uk", label: "Electronic signatures UK" },
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
            <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">
              Primary product page
            </p>
            <h1
              className="mt-3 text-4xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl lg:text-[56px]"
              style={H_FONT}
            >
              UK e-signature software
              <span style={{ color: "var(--c-accent)" }}>.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
              Send contracts, NDAs and offer letters with legally binding electronic signatures. CivicSign is
              UK-owned, UK-hosted e-signature software for freelancers, SMEs and teams who need UK GDPR compliance
              without enterprise complexity — including 2-in-1 Manage PDF on paid plans.
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
              <Link to="/pricing" className={`${SECONDARY_CTA} w-full justify-center sm:w-auto`}>
                See pricing
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((b) => (
                <li key={b} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Feature proof</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
            What serious UK e-signature software must prove
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Ranking pages shout features. Buyers care whether the signed file holds up, where the data lives, and
            whether finance can explain the bill.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PROOF.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className={`${MARKETING_CARD} p-6`}>
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

      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">
              Compare options
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
              CivicSign vs DocuSign, Signable &amp; Legalesign
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              Homepages that rank for &ldquo;UK e-signature software&rdquo; often sell the category. Here is how
              CivicSign differs on the criteria UK buyers actually shortlist on.
            </p>
          </div>
          <div className="mt-10 overflow-x-auto rounded-[20px] border border-[var(--c-border)] bg-[var(--c-paper)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] text-[11px] uppercase tracking-[1px] text-[var(--c-muted-fg)]">
                  <th className="px-5 py-3 font-semibold">Criterion</th>
                  <th className="px-5 py-3 font-semibold text-[var(--c-primary)]">CivicSign</th>
                  <th className="px-5 py-3 font-semibold">Typical alternatives</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.criterion} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-5 py-4 font-semibold text-[var(--c-ink)]">{row.criterion}</td>
                    <td className="px-5 py-4 text-[var(--c-ink)]">{row.civicsign}</td>
                    <td className="px-5 py-4 text-[var(--c-muted-fg)]">{row.others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-center text-sm text-[var(--c-muted-fg)]">
            Want the DocuSign-focused walkthrough?{" "}
            <Link to="/docusign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              CivicSign as a DocuSign alternative
            </Link>
            . Comparing Legalesign specifically?{" "}
            <Link to="/legalesign-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              CivicSign as a Legalesign alternative
            </Link>
            . Comparing Signable?{" "}
            <Link to="/signable-alternative" className="font-semibold text-[var(--c-primary)] hover:underline">
              CivicSign as a Signable alternative
            </Link>
            . Legal background:{" "}
            <Link to="/electronic-signatures-uk" className="font-semibold text-[var(--c-primary)] hover:underline">
              electronic signatures in the UK
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">
            Legalesign alternative
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
            Switching from Legalesign?
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Legalesign is a familiar UK/EU name on many shortlists. CivicSign competes on the criteria UK SMEs
            actually escalate to finance and compliance: UK hosting clarity, published Free and Pro GBP plans,
            Manage PDF in the same product, and signers who never need an account. If you are evaluating a
            Legalesign alternative for UK GDPR and UK eIDAS workflows, the dedicated comparison page walks through
            hosting, pricing honesty and the 2-in-1 PDF path without the enterprise maze.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/legalesign-alternative" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>
              Legalesign alternative <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={SECONDARY_CTA}>
              See CivicSign pricing
            </Link>
          </div>
        </div>
        </div>
      </section>

      <section className="border-b border-[var(--c-border)] bg-[var(--c-paper)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">
            Signable alternative
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
            Switching from Signable?
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Signable is a familiar UK e-signature name on many SME shortlists. CivicSign competes on the criteria
            UK buyers escalate to finance and compliance: UK hosting clarity, a real free tier plus published Pro
            GBP plans, Manage PDF in the same product, and signers who never need an account. If you are evaluating
            a Signable alternative for UK GDPR and UK eIDAS workflows, the dedicated comparison page walks through
            hosting, pricing honesty and the 2-in-1 PDF path — without inventing competitor list prices; always
            check Signable&apos;s site for current pricing.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/signable-alternative" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>
              Signable alternative <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={SECONDARY_CTA}>
              See CivicSign pricing
            </Link>
          </div>
        </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
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
      </section>

      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">
                Pricing teaser
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
                Simple GBP plans. No theatre.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
                {formatFreePlanSignupPitch()}. Pro is about {formatProMonthlyShort()} per user, with Manage PDF
                included. Extra documents from {formatExtraDocumentPrice({ includeTaxNote: true })}.
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
                `Free — ${formatFreePlanDocsAMonth()}, audit trail included`,
                `Pro — ~${formatProMonthlyShort()} / user, Manage PDF included`,
                "Business — team controls, AES default, API & webhooks",
                "No signer accounts on any plan",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 text-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Who it&apos;s for</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
              Industry workflows ready today
            </h2>
          </div>
          <Link to="/solutions" className="text-sm font-semibold text-[var(--c-primary)] hover:underline">
            All industry solutions →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`${MARKETING_CARD} p-6 transition-colors hover:border-[var(--c-primary)]`}
            >
              <h3 className="text-lg font-semibold" style={H_FONT}>
                {item.title}
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
          <p className={CTA_SUBTEXT_CLASS}>
            {formatFreePlanSignupPitch()}. UK GDPR hosting, legally binding signatures, and a court-ready audit trail.
          </p>
          <div className={CTA_ACTIONS_CLASS}>
            <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={CTA_SECONDARY_BTN}>
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
