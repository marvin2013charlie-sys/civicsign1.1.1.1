import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Briefcase, MapPin, Globe2, ArrowRight, Heart, Users, Sparkles, Search, X as XIcon } from "lucide-react";
import { Logo } from "@/components/Logo";

const TYPE_LABEL = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", internship: "Internship" };
const WP_LABEL = { remote: "Remote", hybrid: "Hybrid", "on-site": "On-site" };

const VALUES = [
  { icon: Heart,    title: "Make signing humane",         text: "We sweat the small details so signers and senders feel calm, not confused." },
  { icon: Users,    title: "Build for the UK first",      text: "Compliance, language, payment rails and trust marks — all designed for Britain." },
  { icon: Sparkles, title: "Ship fast, write things down", text: "We move quickly but document decisions so the team can scale without losing context." },
];

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/careers/jobs`);
        setJobs(data);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const hay = `${j.title} ${j.department} ${j.location} ${j.summary || ""} ${j.workplace || ""} ${j.job_type || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, query]);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="careers-page">
      {/* Lightweight nav (matches About / Contact pages) */}
      <header className="sticky top-0 z-30 border-b border-[var(--c-border)] bg-[var(--c-paper)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/about"  className="text-[var(--c-ink)] hover:text-[var(--c-primary)]">About</Link>
            <Link to="/blog"   className="text-[var(--c-ink)] hover:text-[var(--c-primary)]">Blog</Link>
            <Link to="/contact" className="text-[var(--c-ink)] hover:text-[var(--c-primary)]">Contact</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[var(--c-border)]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <Briefcase className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Careers at CIVICSIGN
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold text-[var(--c-ink)] sm:text-5xl">
            Help us build the UK&rsquo;s trusted signing platform.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--muted-foreground)]">
            We&rsquo;re a small, ambitious team turning a paperwork chore into a smooth, lawful, dignified experience. If you care about craft, compliance and the customers who depend on us, we&rsquo;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="border-b border-[var(--c-border)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">How we work</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                    <Icon className="h-5 w-5 text-[var(--c-primary)]" />
                  </span>
                  <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">{v.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{v.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6" data-testid="careers-openings">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Open positions</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {loading ? "Loading…" : visible.length === 0 ? "No matching roles right now." : `${visible.length} ${visible.length === 1 ? "role" : "roles"}${query ? " match your search" : " open"}`}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-5 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles by title, team, location…"
              className="pl-9 pr-9 bg-[var(--card)]"
              data-testid="careers-search-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                data-testid="careers-search-clear"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--c-ink)]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--card)] p-12 text-center" data-testid="careers-empty-state">
                <Briefcase className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  {query ? (
                    <>No openings match &ldquo;<b>{query}</b>&rdquo;. Try a different keyword or clear the search.</>
                  ) : (
                    <>We&rsquo;re not actively hiring right now, but we&rsquo;re always happy to hear from exceptional people. Email <a href="mailto:careers@civicsign.app" className="font-semibold text-[var(--c-primary)] hover:underline">careers@civicsign.app</a>.</>
                  )}
                </p>
              </div>
            ) : (
              visible.map((j) => (
                <Link
                  key={j.slug}
                  to={`/careers/${j.slug}`}
                  data-testid={`career-job-${j.slug}`}
                  className="group block rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--c-primary)]/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>
                        {j.department}
                      </p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-[var(--c-ink)] group-hover:text-[var(--c-primary)]">
                        {j.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)] line-clamp-2">
                        {j.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <Badge icon={MapPin}>{j.location}</Badge>
                        <Badge icon={Globe2}>{WP_LABEL[j.workplace] || j.workplace}</Badge>
                        <Badge icon={Briefcase}>{TYPE_LABEL[j.job_type] || j.job_type}</Badge>
                        {j.salary ? <Badge>{j.salary}</Badge> : null}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Badge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-2.5 py-1 font-medium text-[var(--c-ink)]">
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}
