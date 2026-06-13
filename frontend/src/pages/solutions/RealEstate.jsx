import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, FileText, ShieldCheck, Clock, Users, CheckCircle2, ArrowRight,
  Key, FileSignature, ScrollText, PoundSterling, Sparkles,
  Landmark, Gauge, ClipboardCheck, FileBadge, Stamp as StampIcon,
  PenLine, Hash, Calendar, Mail, Building2, Briefcase, ChevronDown, Circle, Type as TypeIcon, CheckSquare,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";

const DOCS = [
  { icon: ScrollText, title: "Assured Shorthold Tenancy (AST) agreements", body: "Send AST contracts to tenants with pre-placed signature, initials and date fields. Tamper-evident audit trail on every page." },
  { icon: FileSignature, title: "Property sales memorandum & offer letters", body: "Capture buyer & seller signatures on memorandums of sale in minutes — chase chains less, close faster." },
  { icon: Key, title: "Section 21 / Section 8 notices", body: "Serve statutory notices electronically with timestamped delivery & view receipts that hold up under UK property law." },
  { icon: FileText, title: "Tenancy renewals, deposit forms & inventories", body: "Renewals, deposit schedule, inventory and check-in / check-out forms — all reusable as templates." },
  { icon: Users, title: "Guarantor agreements & right-to-rent declarations", body: "Multi-party signing routes guarantor, tenant and reference forms in the correct order automatically." },
  { icon: PoundSterling, title: "Estate agent terms of business", body: "Onboard landlords & vendors with sole agency / multi-agency terms and fee schedules signed before the first viewing." },
];

const WHY = [
  { icon: Clock, title: "Close lets in hours, not days", body: "Send a tenancy to a tenant, get it back signed within hours — no printer, no scanner, no posting back to the branch." },
  { icon: ShieldCheck, title: "UK GDPR & ICO compliant", body: "All personal data (tenants, guarantors, vendors) is processed under UK GDPR. Audit log captures every IP, timestamp and action." },
  { icon: CheckCircle2, title: "Built for UK property law", body: "Aligned with the UK Electronic Communications Act 2000 and the UK eIDAS Regulation — your AST signatures hold up where it matters." },
  { icon: Sparkles, title: "Your branch, your branding", body: "Add your agency logo, colours and signing-page banner so every email and signing screen carries your brand." },
];

const STATS = [
  { value: "< 4 hrs", label: "Average tenancy turnaround" },
  { value: "0 paper", label: "Lost contracts, lost initials" },
  { value: "100%", label: "UK-owned & UK-hosted" },
];

const BENEFITS = [
  {
    icon: Gauge,
    title: "Accelerate transactions",
    body: "Speed up the process from home or on the go — quick signing of tenancies, sales memos and notices without physical presence or relying on the postal system.",
  },
  {
    icon: ShieldCheck,
    title: "Support compliance",
    body: "Reduce errors, protect client data and maintain regulatory compliance under UK GDPR through tamper-evident document management and a full audit trail.",
  },
  {
    icon: ClipboardCheck,
    title: "Reduce administrative tasks",
    body: "Spend less time on paperwork and repetitive admin and more time with vendors, landlords and tenants — improving their overall experience.",
  },
];

// Field palette mirror — matches what the sender sees in /prepare
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
  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #FFF7F0 0%, var(--c-paper) 60%)" }} />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <Home className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Solutions · Real Estate
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Sign tenancies & sales <span style={{ color: "var(--c-primary)" }}>without the paperwork.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted-foreground)]">
              CIVICSIGN is the UK-built e-signature platform for estate agents, letting agents, landlords and conveyancers. Send ASTs, memorandums of sale and statutory notices &mdash; legally binding, UK GDPR compliant, in minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg" style={{ background: "var(--c-primary)", color: "#fff" }} data-testid="re-cta-start">
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button></Link>
              <Link to="/#pricing"><Button size="lg" variant="outline">See pricing</Button></Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Free 5 docs / month</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> No card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> UK GDPR compliant</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative">
            <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--card)] shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1681505531034-8d67054e07f6"
                alt="UK estate agent shaking hands over signed property paperwork"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS strip */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">Why UK property pros choose CIVICSIGN</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">Designed around the way British estate agents, letting agents and landlords actually work &mdash; not adapted from an American product.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                <w.icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              </span>
              <h3 className="mt-3 font-heading font-semibold text-[var(--c-ink)]">{w.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOCUMENTS */}
      <section className="bg-[var(--c-paper-2)] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">Every property document, signed in minutes</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">Pre-built workflows for the documents you send most. Save them once as templates &mdash; reuse them every let, every sale.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.map((d) => (
              <div key={d.title} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--c-accent)22" }}>
                  <d.icon className="h-4 w-4" style={{ color: "var(--c-accent)" }} />
                </span>
                <h3 className="mt-3 font-heading font-semibold text-[var(--c-ink)]">{d.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HM Land Registry compliance callout */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <Landmark className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> HM Land Registry · 2020 update
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-[var(--c-ink)] sm:text-4xl">
              By simplifying the transaction process, you can save much more than paper.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-[var(--muted-foreground)]">
            HM Land Registry now accepts electronic signatures and electronic witnessing on dispositionary deeds. CIVICSIGN gives UK estate agents, conveyancers and landlords the flexibility and signing experience their clients expect — without sacrificing the legal weight of a wet signature.
          </p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} data-testid={`realestate-benefit-${b.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                <b.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
              </span>
              <h3 className="mt-4 font-heading text-lg font-semibold text-[var(--c-ink)]">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* eSignature for Real Estate — field palette preview */}
      <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)] py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          {/* Visual preview */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="relative"
            data-testid="realestate-form-preview"
          >
            <div className="rounded-3xl p-6 sm:p-8" style={{ background: "var(--c-ink)" }}>
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex gap-0 text-[var(--c-ink)]">
                  {/* Field palette rail */}
                  <div className="hidden w-40 shrink-0 border-r border-[var(--c-border)] bg-[var(--c-paper-2)] px-2 py-3 sm:block">
                    {FIELD_PALETTE.map((f) => (
                      <div key={f.label} className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--c-primary)" }} />
                        <f.icon className="h-3 w-3 text-[var(--muted-foreground)]" />
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
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Date</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Morten Estate Co.</div>
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Brokerage</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Text</div>
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Phone Number</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">brenda@morten.com</div>
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Email Address</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Blake Hayes</div>
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Received by Agent</p>
                      </div>
                      <div>
                        <div className="h-7 rounded-md border-2 border-[var(--c-primary)] bg-[var(--status-sent-bg)] px-2 py-1 text-[10px] text-[var(--c-ink)]">Mary Williams</div>
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Buyer&rsquo;s Agent</p>
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
            </div>
          </motion.div>

          {/* Copy */}
          <div>
            <h2 className="font-heading text-3xl font-bold leading-tight text-[var(--c-ink)] sm:text-4xl">
              CIVICSIGN eSignature <br className="hidden sm:block" />for Real Estate
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)]">
              Agents can simplify the way they prepare, send and manage agreements with an all-in-one solution.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)]">
              Access pre-built UK templates (ASTs, sales memos, Section 21/8 notices). Place 15+ field types — signature, initial, stamp, date signed, name, email, company, title, dropdown, radio and more — in seconds. Send for signature and monitor status in real time.
            </p>
            <Link to="/register" className="mt-7 inline-block">
              <Button size="lg" variant="outline" data-testid="realestate-read-more" className="border-[var(--c-primary)] text-[var(--c-primary)] hover:bg-[var(--status-sent-bg)]">
                Read more about eSignature <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink)] p-10 text-center text-white sm:p-14">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Ready to ditch the printer?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Get your first tenancy or sale signed today. Free for 5 documents a month &mdash; no card required, UK GDPR compliant from day one.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register"><Button size="lg" style={{ background: "var(--c-primary)", color: "#fff" }} data-testid="re-cta-bottom">
              Start free for estate agents <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button></Link>
            <Link to="/contact"><Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">Talk to us</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
