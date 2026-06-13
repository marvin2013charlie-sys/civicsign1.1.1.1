import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { API_BASE, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { ArrowLeft, MapPin, Globe2, Briefcase, CheckCircle2, Send } from "lucide-react";

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
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/careers/jobs/${slug}`);
        setJob(data);
      } catch {
        setNotFound(true);
      }
    })();
  }, [slug]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.name.trim() || !form.email.trim() || form.cover_message.trim().length < 20) {
      toast.error("Please fill in your name, email, and tell us a bit about yourself (20+ characters).");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/careers/apply`, { job_slug: slug, ...form });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[var(--c-paper)]">
        <NavBar />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Position not found</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">This role may have been filled or unpublished. Browse all open roles instead.</p>
          <Button className="mt-5" onClick={() => navigate("/careers")} style={{ background: "var(--c-primary)", color: "#fff" }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to careers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="job-detail">
      <NavBar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/careers" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--c-primary)]">
          <ArrowLeft className="h-3.5 w-3.5" /> All positions
        </Link>

        {!job ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>{job.department}</p>
              <h1 className="mt-1 font-heading text-3xl font-bold text-[var(--c-ink)] sm:text-4xl" data-testid="job-detail-title">{job.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <Pill icon={MapPin}>{job.location}</Pill>
                <Pill icon={Globe2}>{WP_LABEL[job.workplace] || job.workplace}</Pill>
                <Pill icon={Briefcase}>{TYPE_LABEL[job.job_type] || job.job_type}</Pill>
                {job.salary ? <Pill>{job.salary}</Pill> : null}
              </div>
            </div>

            <div className="prose prose-sm mt-8 max-w-none text-[var(--c-ink)]" data-testid="job-detail-description">
              {job.description.split(/\n{2,}/).map((para, i) => {
                // Render bullet-point blocks as <ul>
                const lines = para.split(/\n/).map((s) => s.trim()).filter(Boolean);
                if (lines.every((l) => l.startsWith("- "))) {
                  return (
                    <ul key={i} className="ml-6 list-disc space-y-1 text-sm leading-relaxed">
                      {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
                    </ul>
                  );
                }
                return <p key={i} className="text-sm leading-relaxed">{para}</p>;
              })}
            </div>

            {/* Apply card */}
            <div className="mt-12 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6" id="apply" data-testid="job-apply-card">
              {submitted ? (
                <div className="py-6 text-center" data-testid="job-apply-success">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h2 className="mt-3 font-heading text-xl font-bold text-[var(--c-ink)]">Application received</h2>
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                    Thank you for applying to <span className="font-semibold">{job.title}</span>. We&rsquo;ll review your application and get back to you within a week.
                  </p>
                  <Button className="mt-5" onClick={() => navigate("/careers")} variant="outline">Browse other roles</Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Apply for this role</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">No portal account needed. We read every application.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Full name *" id="apply-name">
                      <Input id="apply-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" data-testid="apply-name" required />
                    </Field>
                    <Field label="Email *" id="apply-email">
                      <Input id="apply-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" data-testid="apply-email" required />
                    </Field>
                    <Field label="Phone (optional)" id="apply-phone">
                      <Input id="apply-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 900000" data-testid="apply-phone" />
                    </Field>
                    <Field label="LinkedIn (optional)" id="apply-linkedin">
                      <Input id="apply-linkedin" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/…" data-testid="apply-linkedin" />
                    </Field>
                    <Field label="Portfolio or GitHub (optional)" id="apply-portfolio" colSpan>
                      <Input id="apply-portfolio" value={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.value })} placeholder="https://…" data-testid="apply-portfolio" />
                    </Field>
                  </div>
                  <Field label="Why do you want to join CIVICSIGN? *" id="apply-cover">
                    <Textarea
                      id="apply-cover"
                      value={form.cover_message}
                      onChange={(e) => setForm({ ...form, cover_message: e.target.value })}
                      placeholder="Tell us what excites you about this role and a recent piece of work you're proud of (minimum 20 characters)."
                      rows={6}
                      data-testid="apply-cover"
                      required
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      By applying you agree to our <Link to="/privacy" className="underline">Privacy Policy</Link>.
                    </p>
                    <Button type="submit" disabled={submitting} data-testid="apply-submit" style={{ background: "var(--c-primary)", color: "#fff" }}>
                      <Send className="mr-1.5 h-4 w-4" /> {submitting ? "Submitting…" : "Submit application"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--c-border)] bg-[var(--c-paper)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/"><Logo /></Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/careers" className="text-[var(--c-ink)] hover:text-[var(--c-primary)]">Careers</Link>
          <Link to="/about"   className="text-[var(--c-ink)] hover:text-[var(--c-primary)]">About</Link>
          <Link to="/contact" className="text-[var(--c-ink)] hover:text-[var(--c-primary)]">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

function Field({ label, id, children, colSpan }) {
  return (
    <div className={colSpan ? "sm:col-span-2" : ""}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Pill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-2.5 py-1 font-medium text-[var(--c-ink)]">
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}
