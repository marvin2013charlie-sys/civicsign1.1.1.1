import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  PenLine, ShieldCheck, FileText, Workflow, Clock, ArrowRight,
  CheckCircle2, Layers, Fingerprint, Mail, Globe, Zap, Star,
  Briefcase, Users, Scale, Home, Building2, Handshake, Check,
} from "lucide-react";

const Feature = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
      <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
    </div>
    <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h3>
    <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{children}</p>
  </div>
);

const METRICS = [
  { icon: FileText, value: "500k+", label: "UK documents prepared" },
  { icon: Globe, value: "100%", label: "UK-owned & UK-hosted" },
  { icon: ShieldCheck, value: "99.9%", label: "Platform uptime" },
  { icon: Zap, value: "< 3 min", label: "Avg. time to sign" },
];

const USE_CASES = [
  { icon: Briefcase, title: "Sales", body: "Close deals faster with quotes, order forms, and NDAs signed in minutes." },
  { icon: Users, title: "HR & People", body: "Offer letters, onboarding, and policy acknowledgements — all tracked." },
  { icon: Scale, title: "Legal", body: "Contracts and agreements with a court-ready, tamper-evident audit trail." },
  { icon: Home, title: "Real estate", body: "Leases, disclosures, and listing agreements signed on any device." },
  { icon: Building2, title: "Finance", body: "Approvals and statements of work with attribution and timestamps." },
  { icon: Handshake, title: "Freelancers", body: "Client contracts and proposals that look as professional as you are." },
];

const PLANS = [
  { name: "Free", price: "£0", note: "forever", cta: "Start free", to: "/register", highlight: false,
    features: ["5 documents / month", "1 sender", "Draw, type & upload signatures", "Audit trail + Certificate of Completion", "PDF & Word support"] },
  { name: "Pro", price: "£15", note: "per user / month", cta: "Start free", to: "/register", highlight: true,
    features: ["Unlimited documents", "Reusable templates", "Reminders & expiration", "Multiple recipients & routing", "Email + shareable links"] },
  { name: "Business", price: "£49", note: "per user / month", cta: "Start free", to: "/register", highlight: false,
    features: ["Everything in Pro", "Recipient authentication", "Bulk send", "API & webhooks", "Priority support"] },
];

const TESTIMONIALS = [
  { quote: "We replaced our clunky old tool in a day. CIVICSIGN is faster and our clients love how clean the signing page is.", name: "Maya Chen", role: "COO, Northwind Studio" },
  { quote: "The audit trail and sealed certificate on every document gave our legal team instant peace of mind.", name: "David Okafor", role: "Head of Legal, Brightwave" },
  { quote: "Setup took minutes. Drag a few fields, hit send, done. Exactly what a small team needs.", name: "Sara Liang", role: "Founder, Tertia" },
];

const FAQS = [
  ["Are signatures from CIVICSIGN legally binding?", "Yes. CIVICSIGN is built around UK law — the Electronic Communications Act 2000, the UK eIDAS Regulation, and the Law Commission's 2019 report on the electronic execution of documents — capturing intent, consent, attribution, and a tamper-evident audit trail on every completed document."],
  ["Is CIVICSIGN UK GDPR compliant?", "Yes. CIVICSIGN is UK-owned and UK-hosted. Personal data is processed under UK GDPR and the Data Protection Act 2018, with strict access controls, encryption in transit, and a clear data-subject rights process you can exercise at any time."],
  ["Do my signers need an account?", "No. Recipients sign through a secure, tokenized link on any device — no account or download required."],
  ["What file types can I upload?", "PDF and Word (.docx) documents. Word files are automatically converted to PDF while preserving your layout."],
  ["How do you keep documents secure?", "We use encryption in transit, hashed passwords, tokenized links, and seal every finalized document with a SHA-256 hash so any change is detectable."],
  ["Can multiple people sign the same document?", "Yes. Add as many recipients as you need and choose sequential or parallel signing order, with color-coded fields per signer."],
  ["What happens when everyone signs?", "CIVICSIGN finalizes a sealed PDF and appends a Certificate of Completion containing the full audit trail, then delivers it to all parties."],
];

export default function Landing() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />

      {/* Hero */}
      <section className="noise-overlay">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <span aria-hidden="true">&#127468;&#127463;</span> The UK&rsquo;s first homegrown, UK GDPR-approved e-signature platform
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[var(--c-ink)] sm:text-5xl lg:text-6xl">
              Sign documents.<br /><span style={{ color: "var(--c-primary)" }}>Close deals.</span> Done.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted-foreground)]">
              CIVICSIGN is Britain&rsquo;s own e-signature platform &mdash; built in the UK, UK GDPR compliant, and aligned with the UK eIDAS Regulation and the Electronic Communications Act 2000. Upload, drag fields, send &mdash; get legally binding signatures with a tamper-evident audit trail.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button size="lg" data-testid="hero-getstarted-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
                  Start free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how"><Button size="lg" variant="outline">See how it works</Button></a>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> UK GDPR compliant</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> UK-built &amp; UK-owned</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Audit trail included</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-4 shadow-[0_24px_60px_rgba(15,23,32,0.14)]">
              <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                  <span className="text-sm font-semibold text-[var(--c-ink)]">Master Services Agreement</span>
                </div>
                <StatusBadge status="completed" />
              </div>
              <div className="mt-4 space-y-2.5">
                {[88, 70, 94, 60].map((w, i) => (
                  <div key={i} className="h-2.5 rounded-full bg-[var(--c-paper-2)]" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="mt-5 rounded-xl border-2 border-dashed p-4" style={{ borderColor: "var(--c-primary)", background: "var(--status-sent-bg)" }}>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>Signature</span>
                <p className="sig-dancing mt-1 text-3xl" style={{ color: "#14213d" }}>Jordan Rivera</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5" /> SHA-256 sealed</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Completed in 3 min</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="text-center">
              <m.icon className="mx-auto h-6 w-6" style={{ color: "var(--c-primary)" }} />
              <p className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">{m.value}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Everything you need to get signatures</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">A precise preparation studio, a frictionless signer experience, and audit-grade records — without the enterprise bloat.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Feature icon={PenLine} title="Prepare Studio">Drag signature, date, text & checkbox fields onto any PDF or Word doc. Assign each field to a recipient with color coding.</Feature>
          <Feature icon={Workflow} title="Smart routing">Send to multiple signers in sequential or parallel order. Each gets a secure link — no account required.</Feature>
          <Feature icon={ShieldCheck} title="Tamper-evident audit">Every view, consent and signature is timestamped with IP, sealed with a SHA-256 hash and a Certificate of Completion.</Feature>
          <Feature icon={Layers} title="PDF & Word">Upload .pdf or .docx — we convert and normalize automatically, preserving your layout.</Feature>
          <Feature icon={PenLine} title="Draw, type or upload">Signers choose how to sign: draw on canvas, type with handwriting fonts, or upload an image.</Feature>
          <Feature icon={Mail} title="Email delivery">Recipients receive a branded email with a secure signing link, plus the completed PDF when done.</Feature>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Built for every team</h2>
          <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">From the first sales contract to the hundredth offer letter, CIVICSIGN fits the way you work.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="flex gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
                  <u.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-[var(--c-ink)]">{u.title}</h3>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{u.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Three steps to signed</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            { n: "01", t: "Upload", d: "Drop in a PDF or Word document. We render it instantly in your browser." },
            { n: "02", t: "Prepare & send", d: "Add recipients, drag fields where you need them, then send for signature." },
            { n: "03", t: "Sign & seal", d: "Signers complete on any device. We finalize a sealed PDF with a full audit trail." },
          ].map((s) => (
            <div key={s.n}>
              <span className="font-heading text-5xl font-bold" style={{ color: "var(--c-primary)", opacity: 0.25 }}>{s.n}</span>
              <h3 className="mt-2 font-heading text-xl font-semibold text-[var(--c-ink)]">{s.t}</h3>
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Built to hold up in court</h2>
              <ul className="mt-6 space-y-4">
                {[
                  ["Intent & consent", "Signers explicitly consent to do business electronically before signing."],
                  ["Attribution", "Each signature is linked to an email, timestamp and IP address."],
                  ["Tamper-evidence", "The finalized document is sealed with a SHA-256 hash. Any change invalidates it."],
                  ["Certificate of Completion", "A complete, chronological audit trail is appended to every completed document."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--c-primary)" }} />
                    <div><p className="font-semibold text-[var(--c-ink)]">{t}</p><p className="text-sm text-[var(--muted-foreground)]">{d}</p></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink)] p-6 text-white">
              <div className="flex items-center gap-2 text-sm text-[#7fe9dd]"><Fingerprint className="h-4 w-4" /> Certificate of Completion</div>
              <div className="mt-4 space-y-2 font-mono text-xs text-white/80">
                <p>Envelope ID: ENV-7f3a91c0</p>
                <p>Hash: 61f2687f94ae...c53b</p>
                <p>— Created by jordan@acme.com</p>
                <p>— Viewed by client@acme.com (IP 198.51.100.23)</p>
                <p>— Consent accepted · 2026-06-01 08:24 UTC</p>
                <p>— Signed (drawn) · 2026-06-01 08:25 UTC</p>
                <p style={{ color: "#7fe9dd" }}>— Envelope completed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Simple, honest pricing</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">Start free. Upgrade when you grow. No envelope-metering games.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative rounded-2xl border p-6 ${p.highlight ? "border-[var(--c-primary)] bg-[var(--card)] shadow-[0_18px_50px_rgba(31,184,166,0.18)]" : "border-[var(--c-border)] bg-[var(--card)]"}`}>
              {p.highlight && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: "var(--c-primary)" }}>
                  <Star className="h-3 w-3" /> Most popular
                </span>
              )}
              <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">{p.name}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-heading text-4xl font-bold text-[var(--c-ink)]">{p.price}</span>
                <span className="mb-1 text-sm text-[var(--muted-foreground)]">{p.note}</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--c-ink)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} /> {f}
                  </li>
                ))}
              </ul>
              <Link to={p.to} className="mt-6 block">
                <Button className="w-full" variant={p.highlight ? "default" : "outline"}
                  style={p.highlight ? { background: "var(--c-primary)", color: "#fff" } : {}}>
                  {p.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Loved by fast-moving teams</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] p-6">
                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4" fill="#FF7A5C" style={{ color: "#FF7A5C" }} />)}</div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--c-ink)]">“{t.quote}”</p>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[var(--c-ink)]">{t.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map(([q, a], i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-[var(--c-border)]">
              <AccordionTrigger className="text-left font-medium text-[var(--c-ink)]" data-testid={`faq-trigger-${i}`}>{q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-[var(--muted-foreground)]">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl px-8 py-14 text-center" style={{ background: "linear-gradient(135deg, #1FB8A6 0%, #0EA5A4 60%, #0F1720 130%)" }}>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">Ready to get your first signature?</h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">Create a free CIVICSIGN account and send your first document in minutes.</p>
          <Link to="/register"><Button size="lg" className="mt-6" data-testid="cta-getstarted-button" style={{ background: "#fff", color: "var(--c-ink)" }}>Start free <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
        </div>
      </section>

      <SiteFooter />
      <CookieBanner />
      <FloatingAssistant />
    </div>
  );
}
