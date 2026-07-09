import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

export default function Resources() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />

      <section className="border-b border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
            Resources
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-[var(--c-ink)] sm:text-5xl">
            Guides &amp; resources
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--c-muted-fg)]">
            UK e-signature guides, compliance notes, and product help for CivicSign users.
          </p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--c-primary)] hover:underline">
            <BookOpen className="h-4 w-4" />
            Read the blog for UK e-signature guides
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 text-center sm:p-12">
          <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">More resources coming soon</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--c-muted-fg)]">
            Product walkthroughs and downloadable guides will appear here. For now, explore the blog or start a free account.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/blog">
              <Button variant="outline">Browse the blog</Button>
            </Link>
            <Link to="/register">
              <Button style={{ background: "var(--c-primary)", color: "#fff" }}>Start free</Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}