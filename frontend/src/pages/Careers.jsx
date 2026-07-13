import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Briefcase, MapPin, Globe2, ArrowRight, Heart, Users, Sparkles, Search, X as XIcon, Mail,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { SiteHeader } from "@/components/SiteHeader";
import { CookieBanner } from "@/components/CookieBanner";
import { ContactEmailLink } from "@/components/BrandText";

const TYPE_LABEL = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", internship: "Internship" };
const WP_LABEL = { remote: "Remote", hybrid: "Hybrid", "on-site": "On-site" };

const VALUES = [
  { icon: Heart, title: "Make signing humane", text: "We sweat the small details so signers and senders feel calm, not confused." },
  { icon: Users, title: "Build for the UK first", text: "Compliance, language, payment rails and trust marks — all designed for Britain." },
  { icon: Sparkles, title: "Ship fast, write things down", text: "We move quickly but document decisions so the team can scale without losing context." },
];

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      try {
        const { data } = await publicApi.get("/careers/jobs");
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

  const roleCountLabel = loading
    ? "Loading roles…"
    : visible.length === 0
      ? "No matching roles right now"
      : `${visible.length} ${visible.length === 1 ? "role" : "roles"}${query ? " match your search" : " open"}`;

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="careers-page">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <Briefcase className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
            Careers at CivicSign
          </span>
          <div
            className="mt-4"
            style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Join the team
          </div>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl lg:text-5xl">
            Help us build the UK&apos;s trusted signing platform<span style={{ color: "var(--c-accent)" }}>.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
            We&apos;re a small, ambitious team turning paperwork into a smooth, lawful, dignified experience.
            If you care about craft, compliance and the customers who depend on us, we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--c-border)] bg-[var(--c-paper)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <p
              style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
            >
              How we work
            </p>
            <h2 className="mt-0.5 font-heading text-2xl font-bold text-[var(--c-ink)] sm:text-3xl">
              Culture that ships with care<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="cs-portal-surface-card rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: "var(--badge-teal-bg)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-[var(--c-ink)]">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{v.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6" data-testid="careers-openings">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
            >
              Open roles
            </p>
            <h2 className="mt-0.5 font-heading text-2xl font-bold text-[var(--c-ink)] sm:text-3xl">
              Current openings<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-2 text-sm text-[var(--c-muted-fg)]">{roleCountLabel}</p>
          </div>
        </div>

        <div className="cs-portal-surface-card relative mt-6 rounded-2xl p-1.5">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted-fg)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, team, or location…"
            className="h-11 rounded-xl border-0 bg-transparent pl-10 pr-10 shadow-none focus-visible:ring-0"
            data-testid="careers-search-input"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              data-testid="careers-search-clear"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
            >
              <XIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : visible.length === 0 ? (
            <div
              className="cs-portal-surface-card rounded-2xl border border-dashed p-12 text-center"
              data-testid="careers-empty-state"
            >
              <span
                className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "var(--badge-teal-bg)" }}
              >
                <Briefcase className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
              </span>
              <p className="mt-4 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                {query ? (
                  <>No openings match &ldquo;<b className="text-[var(--c-ink)]">{query}</b>&rdquo;. Try a different keyword or clear the search.</>
                ) : (
                  <>We&apos;re not actively hiring right now, but we&apos;re always happy to hear from exceptional people.</>
                )}
              </p>
            </div>
          ) : (
            visible.map((j) => (
              <Link
                key={j.slug}
                to={`/careers/${j.slug}`}
                data-testid={`career-job-${j.slug}`}
                className="cs-portal-surface-card group block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
                style={{ borderLeft: "3px solid var(--c-primary)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>
                      {j.department}
                    </p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-primary-hover)]">
                      {j.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)] line-clamp-2">
                      {j.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <JobBadge icon={MapPin}>{j.location}</JobBadge>
                      <JobBadge icon={Globe2}>{WP_LABEL[j.workplace] || j.workplace}</JobBadge>
                      <JobBadge icon={Briefcase}>{TYPE_LABEL[j.job_type] || j.job_type}</JobBadge>
                      {j.salary ? <JobBadge>{j.salary}</JobBadge> : null}
                    </div>
                  </div>
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--card)] transition-all group-hover:border-[var(--c-primary)] group-hover:bg-[var(--badge-teal-bg)]"
                  >
                    <ArrowRight className="h-4 w-4 text-[var(--c-muted-fg)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--c-primary)]" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div
          className="cs-portal-surface-card mt-10 rounded-2xl p-6 text-center sm:p-8"
          style={{ background: "color-mix(in srgb, var(--c-primary) 5%, var(--c-portal-card))" }}
        >
          <Mail className="mx-auto h-6 w-6" style={{ color: "var(--c-primary)" }} />
          <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">Don&apos;t see your role?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--c-muted-fg)]">
            We&apos;re always open to hearing from talented people. Send a short note and your CV to{" "}
            <ContactEmailLink className="font-semibold" /> and we&apos;ll keep you in mind.
          </p>
        </div>
      </section>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
}

function JobBadge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--c-ink)]">
      {Icon ? <Icon className="h-3 w-3 text-[var(--c-muted-fg)]" /> : null}
      {children}
    </span>
  );
}