import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Zap, Sparkles, Lock, ArrowRight, Globe, FileCheck, Heart,
  Target, Users, Rocket,
} from "lucide-react";
import { greenHoverLg, greenHoverTitle, greenHoverIcon } from "@/lib/greenHover";
import { BrandAccent } from "@/components/BrandText";


const VALUES = [
  { icon: ShieldCheck, title: "Trust by default", body: "Every document ships with a tamper-evident audit trail and a sealed Certificate of Completion, not as an add-on, but as the default." },
  { icon: Zap, title: "Ruthless speed", body: "From upload to signed in minutes. We obsess over removing every click between you and a closed agreement." },
  { icon: Sparkles, title: "Delightful simplicity", body: "Powerful doesn’t have to mean complicated. CivicSign is approachable for everyone, from solo founders to ops teams." },
  { icon: Lock, title: "Privacy first", body: "Your documents are yours. We protect them with encryption, hashing, and strict access controls, and we never sell your data." },
];

const STATS = [
  { icon: FileCheck, value: "500k+", label: "UK documents prepared" },
  { icon: Globe, value: "100%", label: "UK-owned & UK-hosted" },
  { icon: ShieldCheck, value: "99.9%", label: "Platform uptime" },
  { icon: Zap, value: "< 3 min", label: "Avg. time to sign" },
];

export default function About() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />

      {/* Hero */}
      <section className="noise-overlay border-b border-[var(--c-border)]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-[var(--c-ink)] sm:text-5xl">
            Britain&rsquo;s own way to <BrandAccent>sign</BrandAccent>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
            CivicSign started with a simple frustration: getting a signature shouldn&rsquo;t feel like enterprise software from a decade ago. We set out to build a fresh, fast, genuinely trustworthy way to sign from the UK, for the UK and beyond. Today CivicSign is the UK&rsquo;s first homegrown, UK GDPR-approved e-signature platform.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
              <Target className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">Our mission</h2>
            <p className="mt-3 text-[var(--c-muted-fg)] leading-relaxed">
              To give every team, from freelancers to fast-growing companies, a signing experience that is quick to use, legally sound, and a pleasure to look at. We believe trust should be built in, audit trails should be standard, and pricing should be honest.
            </p>
            <p className="mt-3 text-[var(--c-muted-fg)] leading-relaxed">
              We&rsquo;re proudly UK-owned and UK-hosted, fully aligned with UK GDPR, the UK eIDAS Regulation and the Electronic Communications Act 2000, so the documents you complete on CivicSign are designed to hold up in British courts when it matters.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink-solid)] p-8 text-white">
            <Rocket className="h-8 w-8" style={{ color: "#7fe9dd" }} />
            <h3 className="mt-4 font-heading text-2xl font-bold">Built for the next generation of teams</h3>
            <p className="mt-3 text-white/80">
              No envelope metering games. No bloated dashboards. Just upload, drag, send, and a sealed, court-ready record on the other side.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/register"><Button style={{ background: "#fff", color: "var(--c-ink)" }}>Start free</Button></Link>
              <Link to="/contact"><Button variant="ghost" className="text-white hover:bg-white/10">Talk to us</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto h-6 w-6" style={{ color: "var(--c-primary)" }} />
              <p className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">{s.value}</p>
              <p className="text-sm text-[var(--c-muted-fg)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">What we stand for</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className={`bg-[var(--card)] p-6 ${greenHoverLg}`}>
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${greenHoverIcon}`} style={{ background: "var(--status-sent-bg)" }}>
                <v.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
              </div>
              <h3 className={`mt-3 font-heading text-lg font-semibold text-[var(--c-ink)] ${greenHoverTitle}`}>{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-muted-fg)]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl px-8 py-14 text-center" style={{ background: "linear-gradient(135deg, #14B8A6 0%, #0D9488 60%, #122120 130%)" }}>
          <Users className="mx-auto h-8 w-8 text-white" />
          <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">Join thousands signing smarter</h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">Create a free account and send your first document in minutes.</p>
          <Link to="/register"><Button size="lg" className="mt-6" style={{ background: "#fff", color: "var(--c-ink)" }}>Get started <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
        </div>
      </section>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
