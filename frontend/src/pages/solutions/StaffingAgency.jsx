import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, FileText, ShieldCheck, Clock, CheckCircle2, ArrowRight,
  Briefcase, FileSignature, ScrollText, UserPlus, Sparkles, Globe,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";

const DOCS = [
  { icon: Briefcase, title: "Permanent & temporary employment contracts", body: "Send IR35-aware contracts to candidates with pre-placed signature, initials and start-date fields. Tamper-evident audit trail on every page." },
  { icon: FileSignature, title: "Terms of business with clients", body: "Get hirers to sign your terms of business, fee schedules and PSL agreements before the first CV is sent across." },
  { icon: ScrollText, title: "Right to Work & GDPR consent forms", body: "Capture Right to Work declarations and UK GDPR consent forms electronically &mdash; timestamped, with full audit log." },
  { icon: UserPlus, title: "Candidate registration & assignment schedules", body: "Onboard contractors with assignment schedules, AWR opt-outs and timesheet authorisation in one signing flow." },
  { icon: FileText, title: "Confidentiality & restrictive covenants", body: "Send NDAs, restrictive covenants and post-termination undertakings &mdash; signed before the placement, every time." },
  { icon: Globe, title: "Umbrella & limited-company schedules", body: "Multi-party routing handles candidate → umbrella → end client in the correct order with one click." },
];

const WHY = [
  { icon: Clock, title: "Place candidates faster", body: "Send a contract to a candidate and have it signed before they leave the desk &mdash; cutting time-to-place from days to hours." },
  { icon: ShieldCheck, title: "UK GDPR & safer-recruitment ready", body: "All candidate and client data is processed under UK GDPR. Audit log captures every IP, timestamp and signing action for due diligence." },
  { icon: CheckCircle2, title: "Built for UK employment law", body: "Aligned with the UK Electronic Communications Act 2000 and the UK eIDAS Regulation &mdash; signatures hold up in tribunals." },
  { icon: Sparkles, title: "Your agency, your branding", body: "Add your agency logo, colours and signing-page banner so every email and signing screen looks like yours, not ours." },
];

const STATS = [
  { value: "< 2 hrs", label: "Average contract turnaround" },
  { value: "10x", label: "Faster placements vs. paper" },
  { value: "100%", label: "UK-owned & UK-hosted" },
];

export default function StaffingAgency() {
  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #F1FBF7 0%, var(--c-paper) 60%)" }} />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <Users className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Solutions · Staffing Agencies
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Place candidates. <span style={{ color: "var(--c-primary)" }}>Sign contracts.</span> Done.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted-foreground)]">
              CIVICSIGN is the UK-built e-signature platform for recruitment agencies, staffing firms and umbrella companies. Get terms of business, employment contracts and Right to Work forms signed &mdash; legally binding, UK GDPR compliant, in minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg" style={{ background: "var(--c-primary)", color: "#fff" }} data-testid="staff-cta-start">
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
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="UK recruiter shaking hands with candidate after signing a contract"
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
          <h2 className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">Why UK recruiters choose CIVICSIGN</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">Designed around the way British staffing agencies actually work &mdash; from perm contracts to umbrella schedules &mdash; not adapted from an American product.</p>
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
            <h2 className="font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl">Every recruitment document, signed in minutes</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">Pre-built workflows for the documents you send most. Save them once as templates &mdash; reuse them every placement, every renewal.</p>
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

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink)] p-10 text-center text-white sm:p-14">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Ready to place faster?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Get your first contract signed today. Free for 5 documents a month &mdash; no card required, UK GDPR compliant from day one.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register"><Button size="lg" style={{ background: "var(--c-primary)", color: "#fff" }} data-testid="staff-cta-bottom">
              Start free for recruiters <ArrowRight className="ml-1.5 h-4 w-4" />
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
