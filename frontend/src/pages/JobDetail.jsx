import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { publicApi, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CookieBanner } from "@/components/CookieBanner";
import { MarketingGradient } from "@/components/MarketingGradient";
import { ArrowLeft, MapPin, Globe2, Briefcase, CheckCircle2, Send } from "lucide-react";
import { buildJobSeo } from "@/lib/seo";
import { usePageSeo } from "@/hooks/usePageSeo";

const TYPE_LABEL = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", internship: "Internship" };
const WP_LABEL = { remote: "Remote", hybrid: "Hybrid", "on-site": "On-site" };

export default function JobDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", linkedin: "", portfolio: "", cover_message: "" });

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      try {
        const { data } = await publicApi.get(`/careers/jobs/${slug}`);
        setJob(data);
      } catch {
        setNotFound(true);
      }
    })();
  }, [slug]);

  usePageSeo(job ? buildJobSeo(job) : null);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.name.trim() || !form.email.trim() || form.cover_message.trim().length < 20) {
      toast.error("Please fill in your name, email, and tell us a bit about yourself (20+ characters).");
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.post("/careers/apply", { job_slug: slug, ...form });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[var(--c-paper)]">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Position not found</h1>
          <p className="mt-2 text-sm text-[var(--c-muted-fg)]">
            This role may have been filled or unpublished. Browse all open roles instead.
          </p>
          <Button
            className="mt-5 rounded-xl"
            onClick={() => navigate("/careers")}
            style={{ background: "var(--c-ink-solid)", color: "#fff" }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to careers
          </Button>
        </div>
        <CookieBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="job-detail">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--c-muted-fg)] transition-colors hover:text-[var(--c-primary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All positions
          </Link>

          {!job ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-10 w-2/3 rounded-lg" />
              <Skeleton className="h-8 w-1/2 rounded-lg" />
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>
                {job.department}
              </p>
              <h1
                className="mt-1 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)] sm:text-4xl"
                data-testid="job-detail-title"
              >
                {job.title}<span style={{ color: "var(--c-accent)" }}>.</span>
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <JobPill icon={MapPin}>{job.location}</JobPill>
                <JobPill icon={Globe2}>{WP_LABEL[job.workplace] || job.workplace}</JobPill>
                <JobPill icon={Briefcase}>{TYPE_LABEL[job.job_type] || job.job_type}</JobPill>
                {job.salary ? <JobPill>{job.salary}</JobPill> : null}
              </div>
              {job.summary ? (
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--c-muted-fg)]">{job.summary}</p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
        {!job ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
            <div className="cs-portal-surface-card rounded-2xl p-6 sm:p-8" data-testid="job-detail-description">
              <p
                style={{ fontFamily: "'Caveat', cursive", fontSize: "22px", fontWeight: 600, color: "var(--c-primary-hover)" }}
              >
                About the role
              </p>
              <h2 className="mt-0.5 font-heading text-xl font-bold text-[var(--c-ink)]">What you&apos;ll do</h2>
              <div className="prose prose-sm mt-5 max-w-none text-[var(--c-ink)]">
                {job.description.split(/\n{2,}/).map((para, i) => {
                  const lines = para.split(/\n/).map((s) => s.trim()).filter(Boolean);
                  if (lines.every((l) => l.startsWith("- "))) {
                    return (
                      <ul key={i} className="ml-6 list-disc space-y-1.5 text-sm leading-relaxed">
                        {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
                      </ul>
                    );
                  }
                  return <p key={i} className="text-sm leading-relaxed text-[var(--c-muted-fg)]">{para}</p>;
                })}
              </div>
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="cs-portal-surface-card rounded-2xl p-6" id="apply" data-testid="job-apply-card">
                {submitted ? (
                  <div className="py-4 text-center" data-testid="job-apply-success">
                    <span
                      className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: "var(--status-completed-bg)" }}
                    >
                      <CheckCircle2 className="h-6 w-6" style={{ color: "#16A34A" }} />
                    </span>
                    <h2 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">Application received</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                      Thank you for applying to <span className="font-semibold text-[var(--c-ink)]">{job.title}</span>.
                      We&apos;ll review your application and get back to you within a week.
                    </p>
                    <Button className="mt-5 rounded-xl" onClick={() => navigate("/careers")} variant="outline">
                      Browse other roles
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <div>
                      <p
                        style={{ fontFamily: "'Caveat', cursive", fontSize: "20px", fontWeight: 600, color: "var(--c-primary-hover)" }}
                      >
                        Apply now
                      </p>
                      <h2 className="font-heading text-lg font-bold text-[var(--c-ink)]">Join CivicSign</h2>
                      <p className="mt-1 text-sm text-[var(--c-muted-fg)]">No account needed. We read every application.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <Field label="Full name *" id="apply-name">
                        <Input
                          id="apply-name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Jane Smith"
                          className="rounded-xl"
                          data-testid="apply-name"
                          required
                        />
                      </Field>
                      <Field label="Email *" id="apply-email">
                        <Input
                          id="apply-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="jane@example.com"
                          className="rounded-xl"
                          data-testid="apply-email"
                          required
                        />
                      </Field>
                      <Field label="Phone (optional)" id="apply-phone">
                        <Input
                          id="apply-phone"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+44 7700 900000"
                          className="rounded-xl"
                          data-testid="apply-phone"
                        />
                      </Field>
                      <Field label="LinkedIn (optional)" id="apply-linkedin">
                        <Input
                          id="apply-linkedin"
                          value={form.linkedin}
                          onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/…"
                          className="rounded-xl"
                          data-testid="apply-linkedin"
                        />
                      </Field>
                      <Field label="Portfolio or GitHub (optional)" id="apply-portfolio" colSpan>
                        <Input
                          id="apply-portfolio"
                          value={form.portfolio}
                          onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                          placeholder="https://…"
                          className="rounded-xl"
                          data-testid="apply-portfolio"
                        />
                      </Field>
                    </div>

                    <Field label="Why do you want to join CivicSign? *" id="apply-cover">
                      <Textarea
                        id="apply-cover"
                        value={form.cover_message}
                        onChange={(e) => setForm({ ...form, cover_message: e.target.value })}
                        placeholder="Tell us what excites you about this role and a recent piece of work you're proud of (minimum 20 characters)."
                        rows={6}
                        className="rounded-xl"
                        data-testid="apply-cover"
                        required
                      />
                    </Field>

                    <p className="text-xs leading-relaxed text-[var(--c-muted-fg)]">
                      By applying you agree to our{" "}
                      <Link to="/legal/privacy" className="underline hover:text-[var(--c-primary)]">Privacy Policy</Link>.
                    </p>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl"
                      data-testid="apply-submit"
                      style={{ background: "var(--c-ink-solid)", color: "#fff", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
                    >
                      <Send className="mr-1.5 h-4 w-4" />
                      {submitting ? "Submitting…" : "Submit application"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
}

function Field({ label, id, children, colSpan }) {
  return (
    <div className={colSpan ? "sm:col-span-2 lg:col-span-1" : ""}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function JobPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-2.5 py-1 text-xs font-medium text-[var(--c-ink)]">
      {Icon ? <Icon className="h-3 w-3 text-[var(--c-muted-fg)]" /> : null}
      {children}
    </span>
  );
}