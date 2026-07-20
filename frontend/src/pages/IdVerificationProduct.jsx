import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  FileCheck2,
  Fingerprint,
  Globe2,
  IdCard,
  Lock,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection, MarketingInkSurface } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
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

/**
 * Informational product page for CivicSign ID verification (coming soon).
 * Structure informed by common UK IDV product pages (document scan, liveness,
 * face match, KYC use cases) — original CivicSign copy, not third-party text.
 */

const STEPS = [
  {
    icon: IdCard,
    title: "Scan a government ID",
    body: "The signer photographs a passport, UK driving licence or other supported photo ID on their phone — no app install required.",
  },
  {
    icon: ScanFace,
    title: "Liveness selfie",
    body: "A short selfie check confirms a real person is present and reduces photo, screen and basic deepfake spoofing attempts.",
  },
  {
    icon: Fingerprint,
    title: "Face match + authenticity",
    body: "The selfie is matched to the document portrait while document fields and security cues are checked for consistency.",
  },
  {
    icon: FileCheck2,
    title: "Then sign with confidence",
    body: "Only after a successful check does the envelope open for signature — with the result recorded on the audit trail.",
  },
];

const CAPABILITIES = [
  {
    icon: IdCard,
    title: "Document verification",
    body: "Automated checks on identity documents used in UK workflows — passports, photocard driving licences and other photo IDs where supported.",
  },
  {
    icon: Eye,
    title: "Liveness detection",
    body: "Confirm the person is live at the moment of verification, not a still image held up to the camera.",
  },
  {
    icon: ScanFace,
    title: "Biometric face match",
    body: "Compare the live selfie to the portrait on the ID so the document holder and the signer are the same person.",
  },
  {
    icon: ShieldCheck,
    title: "Fraud signals",
    body: "Surface document quality issues, suspected manipulation and failed match scores so high-risk envelopes do not proceed blindly.",
  },
  {
    icon: Lock,
    title: "Privacy-first design",
    body: "Minimise what is stored, encrypt data in transit, and keep identity evidence under the same UK-hosted controls as your signed documents.",
  },
  {
    icon: BadgeCheck,
    title: "Tied to the envelope",
    body: "Verification is not a separate silo — it attaches to the CivicSign envelope so auditors can see who was checked before they signed.",
  },
];

const USE_CASES = [
  {
    icon: Building2,
    title: "Legal & professional services",
    body: "Add an identity step before high-value retainers, NDAs or settlement agreements when you need stronger attribution than an email link alone.",
  },
  {
    icon: Users,
    title: "HR & onboarding",
    body: "Pair e-signature packs with an ID check when onboarding remote hires — keep paperwork and identity evidence in one UK workflow.",
  },
  {
    icon: Globe2,
    title: "Finance & regulated teams",
    body: "Support KYC-style confidence for customer onboarding and authority forms where you must know who is on the other end of the link.",
  },
  {
    icon: Smartphone,
    title: "Remote-first signers",
    body: "Works in the browser on mobile and desktop so recipients can prove identity and sign without downloading a separate consumer app.",
  },
];

const FAQS = [
  [
    "Is ID verification available today?",
    "Not yet. ID verification is on the CivicSign roadmap as a Coming soon capability. You can register interest via Contact — we will prioritise teams with clear use cases.",
  ],
  [
    "How is this different from a simple email signing link?",
    "Email links prove someone with access to that inbox clicked through. ID verification aims to prove a real person with a matching government document completed a check before they signed.",
  ],
  [
    "Will it work with CivicSign envelopes?",
    "Yes — that is the goal. Verification will sit as an optional step on send or on the signing link, with outcomes written into the same audit trail as the completed document.",
  ],
  [
    "What about UK GDPR?",
    "Identity data is sensitive. The product is being designed for UK-hosted processing, clear retention limits, purpose limitation and the same privacy posture CivicSign already applies to signed documents.",
  ],
  [
    "Is this the same as a Digital ID wallet?",
    "No. The first release focuses on document + liveness checks for signers. Wallet / reusable Digital ID may come later; this page describes identity verification for high-trust signing flows.",
  ],
];

const TRUST_POINTS = [
  "Optional step on envelopes",
  "UK-hosted product direction",
  "Audit trail ready",
  "Mobile-friendly signer flow",
];

export default function IdVerificationProduct() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="id-verification-product-page">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
                  <Fingerprint className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                  Product
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px]"
                  style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" }}
                >
                  Coming soon
                </span>
              </div>
              <div
                className="mt-5"
                style={{ fontFamily: "'Caveat', cursive", fontSize: "30px", fontWeight: 600, color: "var(--c-primary-hover)" }}
              >
                Know who is signing
              </div>
              <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl lg:text-[52px]" style={H_FONT}>
                ID verification<span style={{ color: "var(--c-accent)" }}>.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
                Confirm signer identity with a government document and a live selfie before they put pen to PDF.
                Built for UK teams who need stronger confidence than an email link alone — then continue into CivicSign&apos;s sealed e-signature flow.
              </p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/contact"
                  className={`${PRIMARY_CTA} w-full justify-center sm:w-auto`}
                  style={PRIMARY_CTA_STYLE}
                  data-testid="idv-product-cta-contact"
                >
                  Register interest <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/product/manage-pdf"
                  className={`${SECONDARY_CTA} w-full justify-center sm:w-auto`}
                  data-testid="idv-product-cta-manage-pdf"
                >
                  Explore Manage PDF
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--c-muted-fg)]">
                {TRUST_POINTS.map((b) => (
                  <li key={b} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Product mock */}
            <MarketingInkSurface
              className="relative overflow-hidden rounded-[24px] p-6 sm:p-8"
              style={{ color: PAPER_TEXT }}
              data-testid="idv-product-hero-visual"
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(420px 220px at 80% 0%, rgba(45,212,191,.18), transparent)" }}
              />
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "#5FCBA6" }}>
                  Signer check
                </p>
                <p className="mt-2 font-heading text-xl font-semibold text-white sm:text-2xl" style={H_FONT}>
                  Prove who you are, then sign
                </p>
                <div className="mt-6 grid gap-3">
                  {[
                    { step: "1", label: "Capture passport or driving licence" },
                    { step: "2", label: "Complete liveness selfie" },
                    { step: "3", label: "Face match & document checks" },
                    { step: "4", label: "Open secure signing link" },
                  ].map((row) => (
                    <div
                      key={row.step}
                      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                      style={{ borderColor: "rgba(248,247,242,.12)", background: "rgba(248,247,242,.05)" }}
                    >
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: "rgba(45,212,191,.2)", color: "#2DD4BF" }}
                      >
                        {row.step}
                      </span>
                      <span className="text-sm font-medium text-white/90">{row.label}</span>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: "rgba(45,212,191,.35)", background: "rgba(45,212,191,.12)", color: "#2DD4BF" }}
                >
                  Result: Verified · ready to sign
                </div>
              </div>
            </MarketingInkSurface>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-how-it-works">
        <div className="max-w-2xl">
          <p
            style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Simple for signers
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            How ID verification works<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Inspired by leading remote ID check flows used across regulated and high-trust industries:
            document capture, liveness, face match, then your business action — in our case, a CivicSign signature.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`${MARKETING_CARD} relative p-6`} data-testid={`idv-step-${i + 1}`}>
              <span
                className="absolute right-4 top-4 text-[11px] font-bold tabular-nums text-[var(--c-muted-fg)]"
              >
                0{i + 1}
              </span>
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                style={{ background: "var(--badge-teal-bg)" }}
              >
                <s.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-[var(--c-ink)]" style={H_FONT}>{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <MarketingDarkSection className="border-y border-[var(--c-border)]" data-testid="idv-capabilities">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "#2DD4BF" }}>
              Capabilities
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl" style={H_FONT}>
              What teams expect from modern IDV<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">
              Public product pages from identity specialists typically cover document checks, biometrics and
              anti-spoofing. CivicSign is designing the same building blocks for the moment before signature —
              not a standalone consumer ID app.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border p-6"
                style={{ borderColor: "rgba(248,247,242,.12)", background: "rgba(248,247,242,.04)" }}
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(45,212,191,.15)" }}
                >
                  <c.icon className="h-5 w-5" style={{ color: "#2DD4BF" }} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white" style={H_FONT}>{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </MarketingDarkSection>

      {/* Use cases */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-use-cases">
        <div className="max-w-2xl">
          <p
            style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Built for UK workflows
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Where ID verification helps<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <div key={u.title} className={`${MARKETING_CARD} flex gap-4 p-6 sm:p-7`}>
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]"
                style={{ background: "var(--badge-teal-bg)" }}
              >
                <u.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{u.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy + trust */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="idv-privacy">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}
            >
              <Lock className="h-3.5 w-3.5" />
              Privacy &amp; trust
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              Identity data deserves UK-grade care<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              Leading ID verification platforms emphasise data minimisation, encryption and clear retention.
              CivicSign is designing ID verification to align with UK GDPR expectations and the same
              UK-hosted posture we already publish for e-signatures — so identity checks do not become a
              shadow system outside your audit trail.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[var(--c-muted-fg)]">
              {[
                "Purpose-limited checks for signing, not open-ended profiling",
                "Clear retention windows for document images and biometrics",
                "Results written back to the envelope history",
                "Optional — enable only when the document risk requires it",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${MARKETING_CARD} p-7 sm:p-8`}>
            <h3 className="text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
              Alongside e-signatures &amp; Manage PDF
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign is building a single UK platform: prepare the PDF, verify identity when you need it,
              collect the signature, seal the package.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { to: { pathname: "/", hash: "#features" }, label: "E-signatures" },
                { to: "/product/manage-pdf", label: "Manage PDF" },
                { to: "/product/id-verification", label: "ID verification (this page)" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 text-sm font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 text-[var(--c-primary)]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MarketingFaqSection
        id="id-verification-faq"
        eyebrow="Questions"
        caveat="Honest answers"
        title="ID verification FAQs"
        subtitle="While the product is still on the roadmap."
        faqs={FAQS}
        testIdPrefix="idv-faq"
      />

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }}
          />
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Be first in line</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Want ID verification on your envelopes<span style={{ color: "#FF7A5C" }}>?</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Tell us your use case — remote hiring, high-value contracts, or regulated onboarding — and we&apos;ll
              keep you updated as CivicSign ID verification launches.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link
                to="/contact"
                className={CTA_PRIMARY_BTN}
                style={CTA_PRIMARY_BTN_STYLE}
                data-testid="idv-product-bottom-cta"
              >
                Contact us →
              </Link>
              <Link
                to="/register"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >
                Start free e-signatures
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/55">
              {TRUST_BULLETS.map((b) => (
                <li key={b} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#2DD4BF" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
