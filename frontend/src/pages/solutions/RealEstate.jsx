import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, FileText, ShieldCheck, Clock, Users, CheckCircle2, ArrowRight,
  Key, FileSignature, ScrollText, PoundSterling, Sparkles,
  Landmark, Gauge, ClipboardCheck, FileBadge, Stamp as StampIcon,
  PenLine, Hash, Calendar, Mail, Building2, Briefcase, ChevronDown, Circle, Type as TypeIcon, CheckSquare,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingInkSurface } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";
import { BrandAccent } from "@/components/BrandText";
import { SolutionIndustryBadge } from "@/components/SolutionIndustryBadge";
import { RelatedSolutionsSection, SolutionMarquee } from "@/components/SolutionSharedSections";
import {
  SolutionFaqSection,
  SolutionSecuritySection,
  SolutionTestimonial,
  SolutionWorkflowSection,
} from "@/components/SolutionExtras";
import { getSolutionExtras } from "@/lib/solutionContent";
import { formatFreePlanSignupPitch } from "@/lib/pricing";
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
  HERO_GRID,
  HERO_IMAGE,
  HERO_IMAGE_FRAME,
  H_FONT,
  INK,
  MARKETING_CARD,
  PAPER_TEXT,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  SECTION_EYEBROW,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

const DOCS = [
  { icon: ScrollText, title: "Assured Shorthold Tenancy (AST) agreements", body: "Send AST contracts to tenants with pre-placed signature, initials and date fields. Tamper-evident audit trail on every page." },
  { icon: FileSignature, title: "Property sales memorandum and offer letters", body: "Capture buyer and seller signatures on memorandums of sale in minutes, chase chains less, close faster." },
  { icon: Key, title: "Section 21 and Section 8 notices", body: "Serve statutory notices electronically with timestamped delivery and view receipts that hold up under UK property law." },
  { icon: FileText, title: "Tenancy renewals, deposit forms and inventories", body: "Renewals, deposit schedules, inventory and check-in / check-out forms, all reusable as templates." },
  { icon: Users, title: "Guarantor agreements and right-to-rent declarations", body: "Multi-party signing routes guarantor, tenant and reference forms in the correct order automatically." },
  { icon: PoundSterling, title: "Estate agent terms of business", body: "Onboard landlords and vendors with sole-agency or multi-agency terms and fee schedules signed before the first viewing." },
];

const WHY = [
  { icon: Clock, title: "Close lets in hours, not days", body: "Send a tenancy to a tenant, get it back signed within hours, no printer, no scanner, no posting back to the branch." },
  { icon: ShieldCheck, title: "UK GDPR and ICO aligned", body: "Personal data (tenants, guarantors, vendors) is processed under UK GDPR. Audit log captures every IP address, timestamp and action." },
  { icon: CheckCircle2, title: "Built for UK property law", body: "Aligned with the UK Electronic Communications Act 2000 and the UK eIDAS Regulation, your AST signatures hold up where it matters." },
  { icon: Sparkles, title: "Your branch, your branding", body: "Add your agency logo, colours and signing-page banner so every email and signing screen carries your brand." },
];

const STATS = [
  { value: "< 4 hrs", label: "Average tenancy turnaround" },
  { value: "0 paper", label: "Lost contracts, lost initials" },
  { value: "100%", label: "UK-owned and UK-hosted" },
];

const BENEFITS = [
  {
    icon: Gauge,
    title: "Accelerate transactions",
    body: "Speed up the process from home or on the go, quick signing of tenancies, sales memos and notices without physical presence or relying on the postal system.",
  },
  {
    icon: ShieldCheck,
    title: "Support compliance",
    body: "Reduce errors, protect client data and maintain regulatory compliance under UK GDPR through tamper-evident document management and a full audit trail.",
  },
  {
    icon: ClipboardCheck,
    title: "Reduce administrative tasks",
    body: "Spend less time on paperwork and repetitive admin and more time with vendors, landlords and tenants, improving their overall experience.",
  },
];

// Field palette mirror, matches what the sender sees in /prepare
const FIELD_PALETTE = [
  { icon: PenLine,      label: "Signature" },
  { icon: Hash,         label: "Initial" },
  { icon: StampIcon,    label: "Stamp" },
  { icon: Calendar,     label: "Date Signed" },
  { icon: Users,        label: "Name" },
  { icon: Mail,         label: "Email" },
  { icon: Building2,    label: "Company" },
  { icon: Briefcase,    label: "Title" },
  { icon: TypeIcon,     label: "Text" },
  { icon: CheckSquare,  label: "Checkbox" },
  { icon: ChevronDown,  label: "Dropdown" },
  { icon: Circle,       label: "Radio" },
];

export default function RealEstate() {
  const extras = getSolutionExtras("/solutions/real-estate");
  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <MarketingGradient />
        <div className={HERO_GRID}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <SolutionIndustryBadge label="Real Estate" Icon={Home} />
            <h1 className="mt-2 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Sign tenancies and sales <BrandAccent>without the paperwork.</BrandAccent>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
              CivicSign is the UK-built e-signature platform for estate agents, letting agents, landlords and conveyancers. Send ASTs, memorandums of sale and statutory notices, legally binding, UK GDPR compliant, in minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE} data-testid="re-cta-start">
                Start free <ArrowRight className="h-4 w-4" style={{ color: "var(--c-logo-dot)" }} />
              </Link>
              <Link to="/pricing" className={SECONDARY_CTA}>See pricing</Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative">
            <div className={HERO_IMAGE_FRAME}>
              <img
                src="https://images.unsplash.com/photo-1681505531034-8d67054e07f6"
                alt="UK estate agent shaking hands over signed property paperwork"
                className={HERO_IMAGE}
              />
            </div>
          </motion.div>
        </div>
      </section>

      <SolutionMarquee />

      {/* STATS strip */}
      <section className="border-b border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className={SECTION_EYEBROW}>Why CivicSign</div>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
            Why UK property pros choose CivicSign<span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">Designed around the way British estate agents, letting agents and landlords actually work, not adapted from an American product.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className={`p-6 ${MARKETING_CARD}`}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: "var(--badge-teal-bg)" }}>
                <w.icon className="h-5 w-5" style={{ color: "var(--badge-teal-fg)" }} />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{w.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOCUMENTS */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <div className={SECTION_EYEBROW}>Documents</div>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              Every property document, signed in minutes<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--c-muted-fg)]">Pre-built workflows for the documents you send most. Save them once as templates, reuse them every let, every sale.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.map((d) => (
              <div key={d.title} className={`p-6 ${MARKETING_CARD}`}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: "var(--badge-coral-bg)" }}>
                  <d.icon className="h-5 w-5" style={{ color: "var(--badge-coral-fg)" }} />
                </span>
                <h3 className="mt-4 font-heading text-base font-semibold text-[var(--c-ink)]">{d.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HM Land Registry compliance callout */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--badge-teal-fg)] shadow-sm">
              <Landmark className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> HM Land Registry · 2020 update
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-[var(--c-ink)] sm:text-4xl">
              By simplifying the transaction process, you can save much more than paper.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-[var(--c-muted-fg)]">
            HM Land Registry now accepts electronic signatures and electronic witnessing on disposition deeds. CivicSign gives UK estate agents, conveyancers and landlords the flexibility and signing experience their clients expect, without sacrificing the legal weight of a wet signature.
          </p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} data-testid={`realestate-benefit-${b.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: "var(--badge-teal-bg)" }}>
                <b.icon className="h-5 w-5" style={{ color: "var(--badge-teal-fg)" }} />
              </span>
              <h3 className="mt-4 font-heading text-lg font-semibold text-[var(--c-ink)]">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* eSignature for Real Estate, field palette preview */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)] py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          {/* Visual preview */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="relative"
            data-testid="realestate-form-preview"
          >
            <MarketingInkSurface className="rounded-3xl p-6 sm:p-8">
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex gap-0 text-[var(--c-ink)]">
                  {/* Field palette rail */}
                  <div className="hidden w-40 shrink-0 border-r border-[var(--c-border)] bg-[var(--c-paper-2)] px-2 py-3 sm:block">
                    {FIELD_PALETTE.map((f) => (
                      <div key={f.label} className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--c-primary)" }} />
                        <f.icon className="h-3 w-3 text-[var(--c-muted-fg)]" />
                        <span className="truncate">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Document preview */}
                  <div className="flex-1 p-5 sm:p-6">
                    <h4 className="font-heading text-base font-bold sm:text-lg">Residential Purchase Agreement</h4>
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-[var(--c-paper-2)]" />
                      <div className="h-1.5 w-4/5 rounded bg-[var(--c-paper-2)]" />
                      <div className="h-1.5 w-5/6 rounded bg-[var(--c-paper-2)]" />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Text</div>
                        <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">Date</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Morten Estate Co.</div>
                        <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">Brokerage</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Text</div>
                        <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">Phone Number</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">brenda@morten.com</div>
                        <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">Email Address</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Blake Hayes</div>
                        <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">Received by Agent</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Mary Williams</div>
                        <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">Buyer&rsquo;s Agent</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[var(--c-primary)] bg-[var(--status-sent-bg)]">
                        <CheckCircle2 className="h-3 w-3" style={{ color: "var(--c-primary)" }} />
                      </span>
                      <div className="h-1.5 flex-1 rounded bg-[var(--c-paper-2)]" />
                    </div>
                  </div>
                </div>
              </div>
            </MarketingInkSurface>
          </motion.div>

          {/* Copy */}
          <div>
            <h2 className="font-heading text-3xl font-bold leading-tight text-[var(--c-ink)] sm:text-4xl">
              CivicSign eSignature <br className="hidden sm:block" />for Real Estate
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--c-muted-fg)]">
              Agents can simplify the way they prepare, send and manage agreements with an all-in-one solution.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--c-muted-fg)]">
              Access pre-built UK templates (ASTs, sales memos, Section 21/8 notices). Place 15+ field types, signature, initial, stamp, date signed, name, email, company, title, dropdown, radio and more, in seconds. Send for signature and monitor status in real time.
            </p>
            <Link to="/register" className="mt-7 inline-block">
              <Button size="lg" variant="outline" data-testid="realestate-read-more" className="border-[var(--c-primary)] text-[var(--c-primary)] hover:bg-[var(--status-sent-bg)]">
                Read more about eSignature <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {extras && (
        <SolutionWorkflowSection
          headline={extras.workflowHeadline}
          subhead={extras.workflowSubhead}
          workflows={extras.workflows}
        />
      )}
      <SolutionSecuritySection />
      {extras?.testimonial && <SolutionTestimonial testimonial={extras.testimonial} />}
      {extras?.faqs && <SolutionFaqSection faqs={extras.faqs} testIdPrefix="realestate" />}
      <RelatedSolutionsSection solutionPath="/solutions/real-estate" />

      {/* CTA */}
      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Ready when you are</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Ready to ditch the printer<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Get your first tenancy or sale signed today. {formatFreePlanSignupPitch()}, UK GDPR compliant from day one.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/register" data-testid="re-cta-bottom" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE}>
                Start free for estate agents →
              </Link>
              <Link
                to="/contact"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >
                Talk to us
              </Link>
            </div>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
