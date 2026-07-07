import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { PlayCircle, BookOpen, ArrowRight } from "lucide-react";

const DEMOS = [
  {
    id: "pro-walkthrough",
    title: "CivicSign Pro, full walkthrough",
    description:
      "Sign in, upload a contract, place signature fields, choose UK eIDAS SES or AES, send for signature, and track the audit trail.",
    duration: "5:54",
    src: "/resources/civicsign-pro-demo.mp4",
    plan: "Pro",
  },
];

export default function Resources() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />

      <section className="border-b border-[var(--c-border)] bg-[var(--card)]">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <PlayCircle className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
            Resources
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-[var(--c-ink)] sm:text-5xl">
            Product demos &amp; guides
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--c-muted-fg)]">
            Watch how CivicSign works, from sign-in to send, with step-by-step walkthroughs. No sound required.
          </p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--c-primary)] hover:underline">
            <BookOpen className="h-4 w-4" />
            Read the blog for UK e-signature guides
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-10">
          {DEMOS.map((demo) => (
            <article
              key={demo.id}
              id={demo.id}
              className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--card)]"
              data-testid={`resource-demo-${demo.id}`}
            >
              <div className="aspect-video w-full bg-[var(--c-ink-solid)]">
                <video
                  className="h-full w-full"
                  controls
                  playsInline
                  preload="metadata"
                  poster="/resources/civicsign-pro-demo-poster.jpg"
                  data-testid="resource-demo-video"
                >
                  <source src={demo.src} type="video/mp4" />
                  Your browser does not support embedded video.{" "}
                  <a href={demo.src} className="text-[var(--c-primary)] underline">Download the demo</a>.
                </video>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ background: "var(--c-primary)" }}>
                    {demo.plan} plan
                  </span>
                  <span className="text-xs font-medium text-[var(--c-muted-fg)]">{demo.duration}</span>
                </div>
                <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--c-ink)]">{demo.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{demo.description}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/register">
                    <Button style={{ background: "var(--c-primary)", color: "#fff" }}>Start free</Button>
                  </Link>
                  <a href={demo.src} download>
                    <Button variant="outline">Download MP4</Button>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}