import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileSearch,
  Fingerprint,
  Globe2,
  IdCard,
  Lock,
  Mail,
  Scale,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  XCircle,
  Briefcase,
  HeartPulse,
  Home,
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
 * Structure informed by common UK IDV product patterns (document scan, liveness,
 * face match, KYC-style use cases) — original CivicSign copy.
 */

const STEPS = [
  {
    icon: IdCard,
    title: "Scan a government ID",
    body: "The signer photographs a passport, UK photocard driving licence or other supported photo ID on their phone — no separate app install required.",
  },
  {
    icon: ScanFace,
    title: "Liveness selfie",
    body: "A short selfie check confirms a real person is present and reduces photo, screen replay and basic deepfake spoofing attempts.",
  },
  {
    icon: Fingerprint,
    title: "Face match + authenticity",
    body: "The selfie is matched to the document portrait while document fields and authenticity signals are checked for consistency.",
  },
  {
    icon: FileCheck2,
    title: "Then sign with confidence",
    body: "Only after a successful check does the envelope open for signature — with the result recorded on the CivicSign audit trail.",
  },
];

const CAPABILITIES = [
  {
    icon: IdCard,
    title: "Document verification",
    body: "Automated checks on identity documents used in UK workflows — passports, photocard driving licences and other photo IDs where supported by the verification stack.",
  },
  {
    icon: Eye,
    title: "Liveness detection",
    body: "Confirm the person is live at the moment of verification, not a still image, print-out or video held up to the camera.",
  },
  {
    icon: ScanFace,
    title: "Biometric face match",
    body: "Compare the live selfie to the portrait on the ID so the document holder and the person at the device are the same individual.",
  },
  {
    icon: ShieldCheck,
    title: "Fraud & forgery signals",
    body: "Surface document quality issues, suspected manipulation, template-style fakes and failed match scores so high-risk envelopes do not proceed blindly.",
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

const FRAUD_LAYERS = [
  {
    title: "Document authenticity",
    body: "Check whether the capture looks like a real issuing-authority document — not a casual photo, blank template or obviously generated card.",
  },
  {
    title: "Data consistency",
    body: "Where available, cross-check machine-readable zones, barcodes and printed fields so edited or mismatched data is harder to slip through.",
  },
  {
    title: "Liveness / anti-spoof",
    body: "Reduce attacks that use a printed face, another phone screen, or a static photo of someone else.",
  },
  {
    title: "Face match",
    body: "Block cases where a genuine-looking document is used by a different person at signing time.",
  },
  {
    title: "Fail closed",
    body: "If required checks do not pass, the signer cannot complete the signature. No silent skip.",
  },
  {
    title: "Audit evidence",
    body: "Pass/fail outcomes and a verification reference are recorded with the envelope — not just a claim in an email.",
  },
];

const DOC_TYPES = [
  { title: "UK photocard driving licence", body: "Common for employment, tenancy and consumer onboarding packs." },
  { title: "Passport", body: "Strong photo ID for higher-value or cross-border style checks (subject to coverage)." },
  { title: "Other national photo IDs", body: "Where the verification stack supports them — coverage expands with the provider network." },
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
    body: "Designed for browser flows on mobile and desktop so recipients can prove identity and sign without a separate consumer ID app.",
  },
  {
    icon: Home,
    title: "Property & lettings",
    body: "Strengthen confidence on tenancy packs, guarantor forms and sale-related documents when parties sign off-site.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare & care providers",
    body: "Where appropriate, add an identity step before sensitive consent or policy acknowledgements signed remotely.",
  },
  {
    icon: Scale,
    title: "Disputes & high-stakes packs",
    body: "When the risk of a later “it wasn’t me” claim is material, identity evidence sits alongside the sealed PDF.",
  },
  {
    icon: Briefcase,
    title: "B2B sales & MSAs",
    body: "Confirm the person accepting commercial terms is the intended counterparty before the deal is sealed.",
  },
];

const COMPARE_ROWS = [
  {
    label: "Email signing link only",
    icon: Mail,
    points: [
      "Proves control of an inbox (or access to the link)",
      "Fast and frictionless",
      "Does not prove government identity",
    ],
  },
  {
    label: "SMS / knowledge checks",
    icon: Smartphone,
    points: [
      "Extra factor on the phone or shared secret (e.g. postcode)",
      "Useful step-up for Business plans today",
      "Still not a passport or licence check",
    ],
  },
  {
    label: "ID verification (roadmap)",
    icon: Fingerprint,
    points: [
      "Government document + liveness + face match",
      "Stronger attribution for high-trust envelopes",
      "Outcome written into the signing audit trail",
    ],
  },
];

const WHY_POINTS = [
  {
    title: "Email is not identity",
    body: "Anyone with access to a mailbox — or a forwarded link — can look like the intended signer. ID verification raises the bar before the pen hits the PDF.",
  },
  {
    title: "Remote work is the norm",
    body: "Hires, clients and counterparties often never visit your office. You still need a defensible record of who completed the pack.",
  },
  {
    title: "One UK platform",
    body: "Prepare the document, verify identity when risk requires it, collect the signature, seal the package — without bolting on a disconnected ID app.",
  },
];

const FLOW_STEPS = [
  { n: "01", title: "Sender enables IDV", body: "Optional per recipient on high-risk envelopes — not forced on every free-plan send." },
  { n: "02", title: "Signer opens the link", body: "Same CivicSign signing experience; identity step appears before consent when required." },
  { n: "03", title: "Document + selfie checks", body: "Authenticity, liveness and face match run through the verification stack." },
  { n: "04", title: "Pass → sign → seal", body: "Only successful checks unlock signing; results stay with the envelope evidence." },
];

/** Timeline: ID verification vs document seal vs “Sealed & verify” in the app. */
const WHEN_HOW = [
  {
    when: "Before anyone signs",
    title: "ID verification (optional)",
    body: "If you require it, the signer must pass document + liveness + face match before consent. This answers: “Is this the right person?”",
    icon: Fingerprint,
    badge: "Identity",
  },
  {
    when: "When the last party signs",
    title: "Document is sealed",
    body: "CivicSign finalises the PDF, appends a Certificate of Completion, and records SHA-256 content and package hashes. This answers: “Was the file changed after completion?”",
    icon: ShieldCheck,
    badge: "Integrity",
  },
  {
    when: "Any time after completion",
    title: "Sealed & verify",
    body: "In Documents → Sealed & verify you re-check a downloaded PDF against the stored seal — or bulk-verify your library. This answers: “Is this still the original sealed file?”",
    icon: FileSearch,
    badge: "Proof",
  },
];

const SEALED_HOW = [
  {
    title: "Open Documents → Sealed & verify",
    body: "Filter completed envelopes that have a document hash. Each row can show last seal check status (verified / mismatch / not checked).",
  },
  {
    title: "Verify one file",
    body: "Use Verify on a row or upload a completed PDF. CivicSign compares package hash, signed content hash and seal metadata where available.",
  },
  {
    title: "Bulk verify",
    body: "Re-check many sealed documents in one pass so you can spot post-completion edits or wrong file versions.",
  },
  {
    title: "Accept or reject as proof",
    body: "If package or metadata no longer matches, treat the file as altered after sealing — even if it still “looks” signed.",
  },
];

const IDV_VS_SEAL = [
  {
    topic: "Question it answers",
    idv: "Who is the signer?",
    seal: "Is this still the original completed PDF?",
  },
  {
    topic: "When it runs",
    idv: "Before consent / signature (if required)",
    seal: "At completion; re-checked any time later",
  },
  {
    topic: "What you capture",
    idv: "Document + liveness + face match result",
    seal: "Doc hash, package hash, seal metadata, certificate",
  },
  {
    topic: "Where you manage it",
    idv: "Prepare / recipient auth (roadmap)",
    seal: "Documents → Sealed & verify · envelope detail",
  },
  {
    topic: "Fails if…",
    idv: "Forged ID, spoof selfie, face mismatch",
    seal: "File edited, re-exported, or wrong PDF uploaded",
  },
];

const FAQS = [
  [
    "Is ID verification available today?",
    "Not yet in production. ID verification is on the CivicSign roadmap as a Coming soon capability. Register interest via Contact and we will prioritise teams with clear use cases.",
  ],
  [
    "How is this different from a simple email signing link?",
    "Email links prove someone with access to that inbox clicked through. ID verification aims to prove a real person with a matching government document completed a check before they signed.",
  ],
  [
    "Will it work with CivicSign envelopes?",
    "Yes — that is the design goal. Verification sits as an optional step on the signing journey, with outcomes written into the same audit trail as the completed document and seal.",
  ],
  [
    "What about UK GDPR and biometrics?",
    "Identity and biometric data are sensitive. The product is being designed for purpose limitation, clear retention, encryption in transit, and UK-hosted processing aligned with the same privacy posture CivicSign already applies to signed documents. A DPIA will sit behind production launch.",
  ],
  [
    "Can it stop every fake ID?",
    "No honest product can claim 100%. Modern verification uses layered checks (document authenticity, consistency, liveness, face match) and fail-closed policy so failed or uncertain checks cannot complete the signature. Extremely sophisticated forgeries remain an industry-wide residual risk.",
  ],
  [
    "Is this the same as a Digital ID wallet?",
    "No. The first release focuses on document + liveness checks for signers. Reusable Digital ID wallets may come later; this page is about identity verification for high-trust signing flows.",
  ],
  [
    "How does this relate to SES / AES / QES?",
    "CivicSign already supports signature levels under UK eIDAS language (SES/AES; QES via future QTSP). ID verification strengthens attribution evidence for high-assurance sends. It is not automatically a Qualified Electronic Signature without a QTSP.",
  ],
  [
    "What documents will be supported?",
    "Launch targeting focuses on UK-relevant photo IDs such as photocard driving licences and passports, expanding with the verification network. Exact lists will be published at general availability.",
  ],
  [
    "Will signers need to install an app?",
    "The intended experience is browser-based on mobile or desktop — capture ID and selfie, then continue into the existing CivicSign signing flow.",
  ],
  [
    "Who can turn it on?",
    "Planned as an optional control for teams on higher tiers (Business-style plans), so you only add friction where the document risk justifies it.",
  ],
  [
    "What is the difference between ID verification and Sealed & verify?",
    "ID verification happens before signing and checks the person (document + liveness + face match). Sealed & verify happens after completion and checks the file integrity (SHA-256 seals, package hash, metadata). Use both for high-trust packs: identity up front, seal proof later.",
  ],
  [
    "When should I open Documents → Sealed & verify?",
    "Any time after an envelope is completed — especially before you rely on a downloaded PDF as proof, after it has been shared outside CivicSign, or if you suspect the file was re-saved or edited.",
  ],
  [
    "Does a verified seal prove who the signer was?",
    "No. A matching seal proves the completed package was not altered after CivicSign sealed it. Proving identity is the role of ID verification (and other attribution evidence such as email, SMS/KBA, and the audit trail).",
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
                    { step: "4", label: "Open secure signing flow" },
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

      {/* Why it matters */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-why">
        <div className="max-w-2xl">
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}>
            The problem
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Why email alone is not enough<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Most e-signature links are convenient by design. That convenience is perfect for low-risk paperwork —
            and thin when the stakes rise. ID verification is the optional step-up for those moments.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WHY_POINTS.map((w) => (
            <div key={w.title} className={`${MARKETING_CARD} p-6 sm:p-7`}>
              <h3 className="text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="idv-how-it-works">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}>
              Simple for signers
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              How ID verification works<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              The same pattern used across modern remote identity products: capture a document, prove liveness,
              match the face, then complete your business action — here, a CivicSign signature.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`${MARKETING_CARD} relative p-6`} data-testid={`idv-step-${i + 1}`}>
                <span className="absolute right-4 top-4 text-[11px] font-bold tabular-nums text-[var(--c-muted-fg)]">
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
        </div>
      </section>

      {/* Product flow */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-product-flow">
        <div className="max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--c-primary)]">In CivicSign</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Where it sits in your send flow<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((s) => (
            <div key={s.n} className={`${MARKETING_CARD} p-6`}>
              <span className="font-heading text-2xl font-bold tabular-nums" style={{ color: "var(--c-primary)" }}>{s.n}</span>
              <h3 className="mt-3 text-base font-semibold text-[var(--c-ink)]" style={H_FONT}>{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* When & how: IDV + sealed + verify */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="idv-sealed-verify">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}>
              How &amp; when
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              ID verification, sealed PDFs &amp; verify<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              These are three related but different tools. Use this section to know <strong>when</strong> each runs
              and <strong>how</strong> they work together after everyone has signed.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {WHEN_HOW.map((item) => (
              <div key={item.title} className={`${MARKETING_CARD} flex h-full flex-col p-6 sm:p-7`}>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]"
                    style={{ background: "var(--badge-teal-bg)" }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: "var(--badge-coral-bg)", color: "var(--badge-coral-fg)" }}
                  >
                    {item.badge}
                  </span>
                </div>
                <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-[var(--c-primary)]">
                  {item.when}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Timeline strip */}
          <div
            className="mt-10 overflow-hidden rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8"
            data-testid="idv-timeline"
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--c-primary)]">Timeline</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--c-ink)]" style={H_FONT}>
              One envelope, end to end
            </h3>
            <ol className="mt-6 space-y-0">
              {[
                { t: "Prepare & send", d: "You choose recipients, fields, and (when available) require ID verification for high-risk parties." },
                { t: "ID verification", d: "Signer passes document + liveness + face match — or signing stays locked if required checks fail." },
                { t: "Consent & sign", d: "Same CivicSign signing experience after identity clears." },
                { t: "Seal on completion", d: "Final PDF + Certificate of Completion + SHA-256 content/package seals written to the envelope." },
                { t: "Sealed & verify later", d: "Re-upload or re-check the completed file any time under Documents → Sealed & verify." },
              ].map((row, i, arr) => (
                <li key={row.t} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "var(--c-ink-solid)" }}
                    >
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="my-1 w-px flex-1 min-h-[20px] bg-[var(--c-border)]" aria-hidden />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="font-semibold text-[var(--c-ink)]">{row.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{row.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Comparison table */}
          <div className="mt-10 overflow-x-auto rounded-[20px] border border-[var(--c-border)] bg-[var(--card)]" data-testid="idv-vs-seal-table">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] bg-[var(--c-paper)]">
                  <th className="px-5 py-3.5 font-semibold text-[var(--c-muted-fg)]">Topic</th>
                  <th className="px-5 py-3.5 font-semibold text-[var(--c-ink)]">ID verification</th>
                  <th className="px-5 py-3.5 font-semibold text-[var(--c-ink)]">Seal &amp; verify</th>
                </tr>
              </thead>
              <tbody>
                {IDV_VS_SEAL.map((row) => (
                  <tr key={row.topic} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-5 py-3.5 font-medium text-[var(--c-ink)]">{row.topic}</td>
                    <td className="px-5 py-3.5 text-[var(--c-muted-fg)]">{row.idv}</td>
                    <td className="px-5 py-3.5 text-[var(--c-muted-fg)]">{row.seal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to use Sealed & verify */}
          <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--c-primary)]">
                Sealed &amp; verify
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[var(--c-ink)]" style={H_FONT}>
                How to use it after signing<span style={{ color: "var(--c-accent)" }}>.</span>
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
                Once an envelope is completed, CivicSign already stores tamper-evident seals.
                The <strong>Sealed &amp; verify</strong> tab is where you prove a file still matches that seal —
                whether you downloaded it last week or received it by email.
              </p>
              <Link
                to="/documents?tab=sealed"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-primary)] hover:underline"
                data-testid="idv-goto-sealed"
              >
                Open Sealed &amp; verify <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ol className="space-y-4">
              {SEALED_HOW.map((step, i) => (
                <li key={step.title} className={`${MARKETING_CARD} flex gap-4 p-5`}>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "var(--c-ink-solid)" }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--c-ink)]">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Certificate note */}
          <div
            className="mt-10 grid gap-4 rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-6 sm:grid-cols-2 sm:p-8"
            data-testid="idv-certificate-note"
          >
            <div>
              <ShieldCheck className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
              <h3 className="mt-3 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
                On the Certificate of Completion
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                Every completed CivicSign PDF includes a certificate with audit events, timestamps and the document seal.
                When ID verification is required and passes, the design goal is to record a short identity-check summary
                in that same evidence package — without dumping raw biometrics into the PDF.
              </p>
            </div>
            <div>
              <FileSearch className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
              <h3 className="mt-3 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
                When to re-verify a seal
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--c-muted-fg)]">
                {[
                  "Before relying on a file as legal proof",
                  "After sharing or archiving outside CivicSign",
                  "If someone claims the PDF was edited after signing",
                  "During audits or disputes over document integrity",
                ].map((line) => (
                  <li key={line} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
              What modern IDV includes<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">
              Identity specialists typically combine document checks, biometrics and anti-spoofing.
              CivicSign is designing those building blocks for the moment <em>before</em> signature — not a
              standalone consumer ID app.
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

      {/* Fraud layers */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-fraud">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}>
              Fraud resistance
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              How we think about fake IDs<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              Generated cards, screen replays and mismatched faces are known attack classes.
              Defence is layered — and the signing API must fail closed when checks do not pass.
            </p>
          </div>
          <div
            className="flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm"
            style={{ borderColor: "var(--badge-warning-bg)", background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" }}
          >
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              No vendor can honestly claim 100% detection. CivicSign will not market “fraud-proof” —
              we market <strong>fail-closed, multi-check verification</strong> with audit evidence.
            </span>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FRAUD_LAYERS.map((f) => (
            <div key={f.title} className={`${MARKETING_CARD} p-6`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                <h3 className="text-base font-semibold text-[var(--c-ink)]" style={H_FONT}>{f.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--c-primary)" }} />
            <div>
              <p className="font-semibold text-[var(--c-ink)]">Pass</p>
              <p className="mt-1 text-[var(--c-muted-fg)]">Required checks clear → signer continues to consent and signature.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-4 text-sm">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-[var(--c-ink)]">Fail / uncertain</p>
              <p className="mt-1 text-[var(--c-muted-fg)]">Forgery signals, spoof or face mismatch → signing stays locked; limited retries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="idv-documents">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--c-primary)]">Documents</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              What signers will typically present<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {DOC_TYPES.map((d) => (
              <div key={d.title} className={`${MARKETING_CARD} p-6`}>
                <IdCard className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
                <h3 className="mt-4 text-base font-semibold text-[var(--c-ink)]" style={H_FONT}>{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-compare">
        <div className="max-w-2xl">
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}>
            Choose the right bar
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Email, step-up auth, or full IDV<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {COMPARE_ROWS.map((row) => (
            <div key={row.label} className={`${MARKETING_CARD} p-6 sm:p-7`}>
              <row.icon className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
              <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{row.label}</h3>
              <ul className="mt-4 space-y-2.5">
                {row.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-[var(--c-muted-fg)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--c-primary)" }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="idv-use-cases">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", fontWeight: 600, color: "var(--c-primary-hover)" }}>
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
        </div>
      </section>

      {/* Privacy + platform */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" data-testid="idv-privacy">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
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
                "Fail closed on the server — the browser cannot skip a required check",
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
                { to: "/documents?tab=sealed", label: "Sealed & verify (in app)" },
                { to: "/solutions", label: "Industry solutions" },
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

      {/* Honest roadmap note */}
      <section className="border-t border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="idv-roadmap-note">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className={`${MARKETING_CARD} p-7 sm:p-8`}>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--c-primary)]">Roadmap honesty</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--c-ink)] sm:text-3xl" style={H_FONT}>
              Coming soon — not vapourware theatre<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              We publish this page so you can plan workflows and register interest. Production ID verification will
              use specialist document authenticity and liveness technology, fail-closed signing rules, and UK-first
              privacy design. Until general availability, use CivicSign for e-signatures and Manage PDF today —
              and tell us if IDV is critical for your rollout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/contact" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>
                Register interest <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register" className={SECONDARY_CTA}>
                Start free e-signatures
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFaqSection
        id="id-verification-faq"
        eyebrow="Questions"
        caveat="Honest answers"
        title="ID verification &amp; seal FAQs"
        subtitle="Identity before signing · seal &amp; verify after completion."
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
              Tell us your use case — remote hiring, high-value contracts, property packs, or regulated onboarding —
              and we&apos;ll keep you updated as CivicSign ID verification launches.
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
