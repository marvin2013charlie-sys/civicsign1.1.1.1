import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection, MarketingInkSurface } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { formatQuotaResetFaqAnswer } from "@/lib/pricing";
import { PricingPlansSection } from "@/components/PricingPlansSection";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
import {
  CTA_ACTIONS_CLASS,
  CTA_BANNER,
  CTA_HEADLINE_CLASS,
  CTA_PRIMARY_BTN,
  CTA_PRIMARY_BTN_STYLE,
  CTA_SCRIPT_STYLE,
  CTA_SECONDARY_BTN,
  CTA_SECTION,
  CTA_SUBTEXT_CLASS,
} from "@/lib/marketingUi";

/* Landing v3 — implemented from the Claude Design spec "CivicSign Landing v3".
   Neutrals map to brand tokens so dark mode stays legible; the ink sections
   (#122120 via --c-ink-solid) are a deliberate fixed dark, as designed. */

const INK = "var(--c-ink-solid)";
const PAPER_TEXT = "#F8F7F2";

const MARQUEE_COMPANIES = [
  "Northwind Studio", "Brightwave", "Tertia", "Apex Recruitment",
  "Harbor & Co", "Ledgerly Finance", "Cedar Health", "Owens & Price",
  "BuildRight Ltd", "Volta Consulting",
];

const SMALL_FEATURES = [
  { icon: "🧾", title: "Audit-grade records", body: "Every action timestamped and IP-logged, appended as a Certificate of Completion.", bg: "var(--badge-coral-bg)" },
  { icon: "📁", title: "Templates", body: "Save recurring documents as reusable templates — send an offer letter in seconds.", bg: "var(--badge-teal-bg)" },
  { icon: "📊", title: "Reports & usage", body: "See envelope status, completion times and team activity at a glance.", bg: "var(--badge-warning-bg)" },
];

const STEPS = [
  { n: "1", t: "Upload", d: "Drop in a PDF or Word document. We render it instantly in your browser.", ring: "#2DD4BF" },
  { n: "2", t: "Prepare & send", d: "Add recipients, drag fields where you need them, then send for signature.", ring: "#7AC9BE" },
  { n: "3", t: "Sign & seal", d: "Signers complete on any device. We finalise a sealed PDF with a full audit trail.", ring: "#FF7A5C" },
];

const STATS = [
  { value: "500k+", label: "UK documents prepared", color: "#2DD4BF" },
  { value: "100%", label: "UK-owned & hosted", color: "#2DD4BF" },
  { value: "99.9%", label: "Platform uptime", color: "#2DD4BF" },
  { value: "< 3 min", label: "Avg. time to sign", color: "#FF7A5C" },
];

const USE_CASES = [
  { icon: "💼", title: "Sales", body: "Close deals faster — proposals, MSAs and order forms signed the same day they're sent.", bg: "var(--badge-teal-bg)", to: "/solutions/sales" },
  { icon: "🧑‍🤝‍🧑", title: "HR & People", body: "Offer letters, NDAs and policy acknowledgements at scale.", bg: "var(--badge-coral-bg)", to: "/solutions/hr" },
  { icon: "⚖️", title: "Legal", body: "Engagement letters and settlements with court-ready evidence.", bg: "var(--badge-warning-bg)", to: "/solutions/legal" },
  { icon: "🏠", title: "Real estate", body: "Tenancy agreements and disclosures signed from any device.", bg: "var(--badge-coral-bg)", to: "/solutions/real-estate" },
  { icon: "🏦", title: "Finance", body: "Engagement letters and approvals with full compliance trails.", bg: "var(--badge-teal-bg)", to: "/solutions/financial-services" },
  { icon: "🎨", title: "Freelancers", body: "SOWs, MSAs and IP assignments — clients sign from any device, no printer required.", bg: "var(--badge-warning-bg)", to: "/solutions/freelancers" },
];

const SECURITY_POINTS = [
  { t: "Intent & consent", d: "Signers explicitly consent to do business electronically before signing." },
  { t: "Attribution", d: "Each signature is linked to an email, timestamp and IP address." },
  { t: "Tamper-evidence", d: "The finalised document is sealed with a SHA-256 hash. Any change invalidates it." },
  { t: "Certificate of Completion", d: "A complete, chronological audit trail is appended to every completed document." },
];

const TESTIMONIALS = [
  { quote: "We replaced our clunky old tool in a day. CivicSign is faster and our clients love how clean the signing page is.", name: "Maya Chen", role: "COO, Northwind Studio", initials: "MC", color: "#14B8A6" },
  { quote: "The audit trail and sealed certificate on every document gave our legal team instant peace of mind.", name: "David Okafor", role: "Head of Legal, Brightwave", initials: "DO", color: "#FF7A5C" },
  { quote: "Setup took minutes. Drag a few fields, hit send, done. Exactly what a small team needs.", name: "Sara Liang", role: "Founder, Tertia", initials: "SL", color: "#122120" },
];

const FAQS = [
  ["Are signatures from CivicSign legally binding?", "Yes. CivicSign is built around UK law, the Electronic Communications Act 2000, the UK eIDAS Regulation, and the Law Commission's 2019 report on the electronic execution of documents, capturing intent, consent, attribution, and a tamper-evident audit trail on every completed document."],
  ["Is CivicSign UK GDPR compliant?", "Yes. CivicSign is UK-owned and UK-hosted. Personal data is processed under UK GDPR and the Data Protection Act 2018, with strict access controls, encryption in transit, and a clear data-subject rights process you can exercise at any time."],
  ["Do my signers need an account?", "No. Recipients sign through a secure, tokenized link on any device, no account or download required."],
  ["What file types can I upload?", "PDF and Word (.docx) documents. Word files are automatically converted to PDF while preserving your layout."],
  ["How do you keep documents secure?", "We use encryption in transit, hashed passwords, tokenized links, and seal every finalized document with a SHA-256 hash so any change is detectable."],
  ["Can multiple people sign the same document?", "Yes. Add as many recipients as you need and choose sequential or parallel signing order, with color-coded fields per signer."],
  ["What happens when everyone signs?", "CivicSign finalizes a sealed PDF and appends a Certificate of Completion containing the full audit trail, then delivers it to all parties."],
  ["When does my document limit reset?", formatQuotaResetFaqAnswer()],
  ["What is your refund policy?", "Subscriptions and pay-as-you-go purchases are covered by our Refund Policy. Consumers may have a 14-day cooling-off right where applicable; see /legal/refunds for full details including how to contact info@civicbot.co.uk."],
];

const H_FONT = { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif" };

export default function Landing() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <style>{`
        @keyframes lv3-fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes lv3-floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes lv3-drawSig{from{stroke-dashoffset:420}to{stroke-dashoffset:0}}
        @keyframes lv3-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion: reduce){
          .lv3-anim{animation:none !important}
        }
      `}</style>
      <SiteHeader />

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <MarketingGradient />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:gap-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:py-24">
          <div className="lv3-anim" style={{ animation: "lv3-fadeUp .7s ease both" }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--badge-teal-fg)] shadow-sm">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 0 3px rgba(22,163,74,.18)" }} />
              Trusted by UK teams
            </div>
            <h1 className="mt-6 text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl sm:leading-[1.05] lg:text-[64px]" style={H_FONT}>
              The friendly way to get documents{" "}
              <span className="relative sm:whitespace-nowrap" style={{ color: "var(--c-primary-hover)" }}>
                signed
                <svg viewBox="0 0 200 16" className="absolute -bottom-2.5 left-0 w-full" fill="none" aria-hidden="true">
                  <path d="M4 12 C 60 3, 140 3, 196 9" stroke="#FF7A5C" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-[var(--c-muted-fg)]">
              One 2-in-1 platform: e-signatures and Manage PDF together. Upload, prepare, send — signers click a link with no accounts or apps. Legally binding under UK law.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/register"
                data-testid="hero-getstarted-button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 sm:w-auto"
                style={{ background: INK, boxShadow: "0 12px 28px rgba(18,33,32,.22)" }}
              >
                Send your first document — free <span style={{ color: "#2DD4BF" }}>→</span>
              </Link>
              <a
                href="#how"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--c-border)] bg-[var(--card)] px-6 py-4 text-base font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)] sm:w-auto"
              >
                How it works
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {["UK GDPR compliant", "No card required", "Audit trail included"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </div>

          {/* hero mock */}
          <div className="lv3-anim relative overflow-hidden" style={{ animation: "lv3-fadeUp .7s .15s ease both" }}>
            <div
              className="absolute rounded-3xl opacity-[.14] inset-y-7 inset-x-4 sm:inset-[28px_-24px_-24px_28px]"
              style={{ background: "linear-gradient(135deg,#14B8A6,#0D9488)", transform: "rotate(2deg)" }}
            />
            <div className="relative rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-5 sm:p-7" style={{ boxShadow: "0 30px 70px rgba(18,33,32,.16)" }}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-base" style={{ background: "var(--badge-coral-bg)" }}>📄</span>
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--c-ink)]" style={H_FONT}>Master_Services_Agreement.pdf</div>
                    <div className="text-[11.5px] text-[var(--c-muted-fg)]">12 pages · sent 2h ago</div>
                  </div>
                </div>
                <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}>2 of 3 signed</span>
              </div>
              <div className="mb-5 flex flex-col gap-2">
                {[92, 86, 64].map((w) => (
                  <div key={w} className="h-[9px] rounded-md bg-[var(--c-paper-2)]" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="rounded-2xl border-2 border-dashed p-5 text-center" style={{ borderColor: "var(--c-primary)", background: "linear-gradient(rgba(20,184,166,.05), rgba(20,184,166,.09))" }}>
                <svg viewBox="0 0 220 44" className="mx-auto block h-[38px] w-[190px]" fill="none" aria-hidden="true">
                  <path
                    className="lv3-anim"
                    d="M8 34 C 40 6, 60 40, 88 24 S 140 4, 158 26 S 200 38, 214 18"
                    stroke="var(--c-ink)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="420"
                    style={{ animation: "lv3-drawSig 2.2s .6s ease both" }}
                  />
                </svg>
                <div className="mt-2 text-[12.5px] font-medium text-[var(--c-muted-fg)]">Tap to sign as <b className="text-[var(--c-ink)]">Sara Liang</b></div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex">
                  {[["MC", "#14B8A6"], ["DO", "#FF7A5C"], ["SL", "#122120"]].map(([ini, bg], i) => (
                    <span
                      key={ini}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--card)] text-xs font-semibold text-white"
                      style={{ background: bg, marginLeft: i ? -9 : 0 }}
                    >{ini}</span>
                  ))}
                </div>
                <span className="rounded-xl px-6 py-2.5 text-[13.5px] font-semibold text-white" style={{ background: "var(--c-primary)", boxShadow: "0 6px 16px rgba(20,184,166,.35)" }}>
                  Finish &amp; seal ✓
                </span>
              </div>
            </div>
            <div
              className="lv3-anim absolute -top-5 right-0 hidden items-center gap-2.5 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] px-4 py-3 sm:flex"
              style={{ boxShadow: "0 10px 26px rgba(18,33,32,.14)", animation: "lv3-floaty 5s ease-in-out infinite" }}
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ background: "var(--badge-success-bg)" }}>🔒</span>
              <div>
                <div className="text-[12.5px] font-semibold text-[var(--c-ink)]">SHA-256 sealed</div>
                <div className="text-[11px] text-[var(--c-muted-fg)]">Tamper-evident</div>
              </div>
            </div>
            <div
              className="lv3-anim absolute -bottom-4 -left-3 hidden items-center gap-2.5 rounded-2xl px-4 py-3 text-white sm:flex"
              style={{ background: INK, boxShadow: "0 12px 30px rgba(18,33,32,.28)", animation: "lv3-floaty 6s .8s ease-in-out infinite" }}
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ background: "rgba(45,212,191,.18)" }}>⚡️</span>
              <div>
                <div className="text-[12.5px] font-semibold">Signed in 3 min</div>
                <div className="text-[11px] text-white/60">avg. completion</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="overflow-hidden border-y border-[var(--c-border)] bg-[var(--card)] py-5">
        <div
          className="lv3-anim flex w-max gap-[72px] whitespace-nowrap text-[15px] font-semibold text-[var(--c-muted-fg)]/70"
          style={{ ...H_FONT, animation: "lv3-marquee 30s linear infinite" }}
          aria-hidden="true"
        >
          {[...MARQUEE_COMPANIES, ...MARQUEE_COMPANIES].map((c, i) => (
            <span key={`${c}-${i}`}>{c}</span>
          ))}
        </div>
      </section>

      {/* ================= BENTO FEATURES (2-in-1 product) ================= */}
      <section id="features" className="scroll-mt-header mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Product</div>
              <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px]" style={{ background: "var(--badge-coral-bg)", color: "var(--badge-coral-fg)" }}>
                2-in-1
              </span>
            </div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>
              E-signatures and Manage PDF<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              One platform — not two tools. Fix and prepare your PDF, then send for signature in the same workflow.
            </p>
          </div>
          <p className="max-w-sm pb-1 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
            Manage PDF is included with every paid plan — not on Free. Edit, compress, watermark, protect, merge and split — then open in Prepare Studio without leaving CivicSign.
          </p>
        </div>

        <div className="mt-12 grid gap-[18px] md:grid-cols-2">
          {/* E-signatures: Prepare Studio */}
          <div className="group grid items-center gap-6 rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-8 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-xl md:grid-cols-2">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-[13px] text-xl" style={{ background: "var(--badge-teal-bg)" }}>🖋</div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--badge-teal-fg)]">E-signatures</p>
              <h3 className="mt-1 text-[21px] font-semibold text-[var(--c-ink)]" style={H_FONT}>Prepare Studio</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--c-muted-fg)]">
                Drag signature, date, text and checkbox fields onto any PDF or Word doc with pixel precision.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-4">
              <div className="mb-2 h-[7px] w-[70%] rounded bg-[var(--c-border)]" />
              <div className="mb-4 h-[7px] w-[88%] rounded bg-[var(--c-border)]" />
              <div className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-4 py-2 text-xs font-semibold"
                style={{ ...H_FONT, borderColor: "var(--c-primary)", background: "rgba(20,184,166,.07)", color: "var(--badge-teal-fg)" }}>
                ✒️ Signature
              </div>
              <div className="mt-2.5 block">
                <span className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-3.5 py-1.5 text-[11.5px] font-semibold"
                  style={{ ...H_FONT, borderColor: "#FF7A5C", background: "rgba(255,122,92,.07)", color: "var(--badge-coral-fg)" }}>
                  📅 Date signed
                </span>
              </div>
            </div>
          </div>

          {/* Manage PDF */}
          <MarketingInkSurface
            id="manage-pdf"
            className="group scroll-mt-header grid items-center gap-6 rounded-[20px] border border-[var(--c-border)] p-8 transition-all hover:-translate-y-0.5 hover:shadow-2xl md:grid-cols-2"
            style={{ color: PAPER_TEXT }}
            data-testid="landing-manage-pdf-feature"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-[13px] text-xl" style={{ background: "rgba(255,122,92,.16)" }}>📑</div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "#FF7A5C" }}>All paid plans</p>
              <h3 className="mt-1 text-[21px] font-semibold" style={H_FONT}>Manage PDF</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "rgba(248,247,242,.66)" }}>
                Ten tools in one workspace — edit, compress, watermark, protect, unlock, merge, split, convert, and AI-scan — then send for signature.
              </p>
              <Link
                to="/product/manage-pdf"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ color: "#2DD4BF" }}
                data-testid="landing-manage-pdf-explore"
              >
                Explore all PDF tools <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(248,247,242,.14)", background: "rgba(248,247,242,.04)" }}>
              <div className="flex flex-wrap gap-2">
                {["Edit", "Merge", "Split", "Compress", "Watermark", "Protect", "Unlock", "PDF→Word", "Word→PDF", "AI scan"].map((tool) => (
                  <span
                    key={tool}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: "rgba(45,212,191,.14)", color: "#2DD4BF" }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[12px] font-medium" style={{ color: "rgba(248,247,242,.55)" }}>
                <span className="rounded-md px-2 py-1" style={{ background: "rgba(248,247,242,.08)" }}>Save to Documents</span>
                <span>→</span>
                <span className="rounded-md px-2 py-1" style={{ background: "rgba(45,212,191,.14)", color: "#2DD4BF" }}>Prepare &amp; send</span>
              </div>
            </div>
          </MarketingInkSurface>
        </div>

        {/* 2-in-1 workflow strip */}
        <div
          className="mt-[18px] flex flex-wrap items-center justify-center gap-3 rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] px-6 py-5 text-center text-sm font-medium text-[var(--c-muted-fg)]"
          data-testid="landing-2in1-workflow"
        >
          <span className="font-semibold text-[var(--c-ink)]">One workflow</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>Manage PDF</span>
          <span style={{ color: "var(--c-primary)" }}>→</span>
          <span>Documents</span>
          <span style={{ color: "var(--c-primary)" }}>→</span>
          <span>Prepare Studio</span>
          <span style={{ color: "var(--c-primary)" }}>→</span>
          <span className="font-semibold text-[var(--badge-teal-fg)]">Signed &amp; sealed</span>
        </div>

        <div className="mt-[18px] grid gap-[18px] md:grid-cols-3">
          {/* routing (dark cell) */}
          <div className="rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-7 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-[13px] text-xl" style={{ background: "var(--badge-teal-bg)" }}>🔀</div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>Smart routing</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              Sequential or parallel signing. Automatic reminders keep envelopes moving.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}>1</span>
              <span className="h-0.5 flex-1 bg-[var(--c-border)]" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold bg-[var(--c-paper-2)] text-[var(--c-muted-fg)]">2</span>
              <span className="h-0.5 flex-1 bg-[var(--c-border)]" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold bg-[var(--c-paper-2)] text-[var(--c-muted-fg)]">3</span>
            </div>
          </div>

          {SMALL_FEATURES.map((f) => (
            <div key={f.title} className="rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-7 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-[13px] text-xl" style={{ background: f.bg }}>{f.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS (dark) ================= */}
      <MarketingDarkSection id="how" className="scroll-mt-header relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px 340px at 80% 0%, rgba(45,212,191,.12), transparent)" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>How it works</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em]" style={H_FONT}>
              Three steps to signed<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
          </div>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
            <div className="absolute left-[16.6%] right-[16.6%] top-[26px] hidden h-0.5 md:block" style={{ background: "linear-gradient(90deg,#2DD4BF,#FF7A5C)" }} />
            {STEPS.map((s) => (
              <div key={s.n} className="relative px-7 text-center">
                <div
                  className="relative z-10 mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-lg font-bold"
                  style={{ ...H_FONT, background: "#122120", borderColor: s.ring, color: s.ring }}
                >{s.n}</div>
                <h3 className="mt-5 text-[22px] font-semibold" style={H_FONT}>{s.t}</h3>
                <p className="mx-auto mt-2.5 max-w-[280px] text-[14.5px] leading-relaxed" style={{ color: "rgba(248,247,242,.62)" }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-x-16 gap-y-8 border-t pt-10" style={{ borderColor: "rgba(248,247,242,.1)" }}>
            {STATS.map((m) => (
              <div key={m.label} className="text-center">
                <div className="text-[34px] font-bold" style={{ ...H_FONT, color: m.color }}>{m.value}</div>
                <div className="mt-0.5 text-[12.5px]" style={{ color: "rgba(248,247,242,.55)" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </MarketingDarkSection>

      {/* ================= USE CASES ================= */}
      <section id="use-cases" className="scroll-mt-header mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Use cases</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>Built for every team</h2>
          </div>
          <div className="max-w-sm pb-1">
            <p className="text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              From the first sales contract to the hundredth offer letter, CivicSign fits the way you work.
            </p>
            <Link to="/solutions" className="mt-2 inline-block text-sm font-semibold text-[var(--c-primary)] hover:underline">
              View all industry solutions →
            </Link>
          </div>
        </div>
        <div className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u) => {
            const inner = (
              <>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[19px]" style={{ background: u.bg }}>{u.icon}</div>
                <div>
                  <h3 className="text-[16.5px] font-semibold text-[var(--c-ink)]" style={H_FONT}>{u.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--c-muted-fg)]">{u.body}</p>
                </div>
              </>
            );
            const cls = "flex gap-4 rounded-[18px] border border-[var(--c-border)] bg-[var(--card)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-lg";
            return u.to ? (
              <Link key={u.title} to={u.to} className={cls}>{inner}</Link>
            ) : (
              <div key={u.title} className={cls}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* ================= SECURITY ================= */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Security</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>Built to hold up in court</h2>
            <div className="mt-8 flex flex-col gap-5">
              {SECURITY_POINTS.map((sec) => (
                <div key={sec.t} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}>✓</span>
                  <div>
                    <div className="text-base font-semibold text-[var(--c-ink)]">{sec.t}</div>
                    <div className="mt-0.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{sec.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute rounded-[22px] opacity-[.12]" style={{ inset: "20px -18px -18px 20px", background: "#FF7A5C" }} />
            <MarketingInkSurface className="relative rounded-[20px] p-8 text-white" style={{ boxShadow: "0 24px 56px rgba(18,33,32,.24)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#2DD4BF" }}>🛡 Certificate of Completion</div>
                <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-[.5px]" style={{ background: "rgba(45,212,191,.14)", color: "#2DD4BF" }}>VERIFIED</span>
              </div>
              <div className="mt-5 flex flex-col gap-2.5 font-mono text-[12.5px]" style={{ color: "rgba(255,255,255,.78)" }}>
                <span>Envelope ID: ENV-7f3a91c0</span>
                <span>Hash: 61f2687f94ae...c53b</span>
                <span className="h-px" style={{ background: "rgba(255,255,255,.1)" }} />
                <span>· Created by jordan@acme.com</span>
                <span>· Viewed by client@acme.com (IP 198.51.100.23)</span>
                <span>· Consent accepted · 2026-06-01 08:24 UTC</span>
                <span>· Signed (drawn) · 2026-06-01 08:25 UTC</span>
                <span style={{ color: "#2DD4BF" }}>· Envelope completed ✓</span>
              </div>
            </MarketingInkSurface>
          </div>
        </div>
      </section>

      <PricingPlansSection embedded showComparison={false} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24" />

      {/* ================= TESTIMONIALS ================= */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Testimonials</div>
            <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)]" style={H_FONT}>Loved by fast-moving teams</h2>
          </div>
          <div className="mt-14 grid gap-[22px] md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col rounded-[20px] border border-[var(--c-border)] bg-[var(--c-paper)] p-8 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-3 text-[42px] font-semibold leading-[.6]" style={{ fontFamily: "'Caveat', cursive", color: "#2DD4BF" }}>“</div>
                <p className="flex-1 text-[15px] leading-relaxed text-[var(--c-ink)]">{t.quote}</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13.5px] font-semibold text-white" style={{ background: t.color }}>{t.initials}</span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--c-ink)]">{t.name}</div>
                      <div className="text-xs text-[var(--c-muted-fg)]">{t.role}</div>
                    </div>
                  </div>
                  <div className="text-xs tracking-[2px]" style={{ color: "#FF7A5C" }}>★★★★★</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFaqSection
        eyebrow="FAQ"
        caveat="Got questions?"
        title="Frequently asked questions"
        subtitle="Legality, security, billing and how signing works — answered in plain English."
        faqs={FAQS}
        testIdPrefix="landing"
        showContactCta
        defaultOpen={0}
      />

      {/* ================= CTA ================= */}
      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Ready when you are</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Get your first signature<br />before lunch<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Create a free CivicSign account and send your first document in minutes. No card required.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>Start free →</Link>
              <Link
                to="/contact"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >Talk to us</Link>
            </div>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <CookieBanner />
      <FloatingAssistant />
    </div>
  );
}
