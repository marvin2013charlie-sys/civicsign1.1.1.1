import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  PenLine, ShieldCheck, FileText, Workflow, Clock, ArrowRight,
  CheckCircle2, Layers, Fingerprint, Mail,
} from "lucide-react";

const Feature = ({ icon: Icon, title, children, className = "" }) => (
  <div className={`rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 ${className}`}>
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
      <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
    </div>
    <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h3>
    <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{children}</p>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[var(--c-paper)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--c-ink)]">Product</a>
            <a href="#how" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--c-ink)]">How it works</a>
            <a href="#security" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--c-ink)]">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" data-testid="nav-signin-button">Sign in</Button></Link>
            <Link to="/register"><Button data-testid="nav-getstarted-button" style={{ background: "var(--c-ink)", color: "#fff" }}>Start free</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="noise-overlay">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--c-accent)" }} /> ESIGN & eIDAS aligned
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[var(--c-ink)] sm:text-5xl lg:text-6xl">
              Sign documents.<br /><span style={{ color: "var(--c-primary)" }}>Close deals.</span> Done.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted-foreground)]">
              CIVICSIGN is the fresh, fast e-signature platform for modern teams. Upload, drag fields, send — get legally binding signatures with a tamper-evident audit trail.
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
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> No signer account needed</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> PDF & Word support</span>
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

      {/* How it works */}
      <section id="how" className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
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
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
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
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl px-8 py-14 text-center" style={{ background: "linear-gradient(135deg, #1FB8A6 0%, #0EA5A4 60%, #0F1720 130%)" }}>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">Ready to get your first signature?</h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">Create a free CIVICSIGN account and send your first document in minutes.</p>
          <Link to="/register"><Button size="lg" className="mt-6" data-testid="cta-getstarted-button" style={{ background: "#fff", color: "var(--c-ink)" }}>Start free <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} CIVICSIGN. Electronic signatures with a tamper-evident audit trail.</p>
        </div>
      </footer>
    </div>
  );
}
