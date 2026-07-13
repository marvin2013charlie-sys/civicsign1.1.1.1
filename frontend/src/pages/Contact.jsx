import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { isOrgStaff, ORG_STAFF_ESCALATION_NOTE } from "@/lib/orgLabels";
import { MarketingGradient } from "@/components/MarketingGradient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mail, MessageSquare, Clock, MapPin, Loader2, CheckCircle2, Send, Building2,
} from "lucide-react";
import { CIVICSIGN_CONTACT_EMAIL } from "@/lib/contactEmail";
import { ContactEmailLink } from "@/components/BrandText";

const INFO = [
  { icon: Mail, title: "Email us", mailto: true, sub: "General, sales & support enquiries" },
  { icon: MessageSquare, title: "Support", mailto: true, sub: "We reply within 1 business day" },
  { icon: Clock, title: "Hours", body: "Mon–Fri, 9am–6pm", sub: "London time (GMT/BST)" },
  { icon: MapPin, title: "Registered office", body: "71-75 Shelton Street", sub: "Covent Garden, London WC2H 9JQ, United Kingdom" },
];

export default function Contact() {
  const { user } = useAuth();
  const orgStaff = isOrgStaff(user);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [form, setForm] = useState({ name: "", email: "", subject: "General enquiry", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (orgStaff) {
      toast.error("Contact your organisation admin first. They can escalate to CivicSign if needed.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email and message");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/contact", form);
      setSent(true);
      toast.success(data.message || "Message sent!");
    } catch (err) {
      toast.error(formatApiError(err) || "Could not send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="contact-page">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-14 lg:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <MessageSquare className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
            Get in touch
          </span>
          <div
            className="mt-4"
            style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            We&apos;re here to help
          </div>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl">
            Talk to us<span style={{ color: "var(--c-accent)" }}>.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
            Questions about CivicSign, pricing, or partnerships? Send us a note and we&apos;ll get back to you fast.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {orgStaff ? (
          <div
            className="cs-portal-surface-card mx-auto max-w-lg rounded-2xl p-8 text-center lg:col-span-2"
            style={{ boxShadow: "0 0 0 1px color-mix(in srgb, var(--c-primary) 25%, var(--c-border))" }}
            data-testid="contact-org-staff-notice"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--badge-teal-bg)" }}>
              <Building2 className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
            </span>
            <h2 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">Contact your organisation admin</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              {ORG_STAFF_ESCALATION_NOTE} Billing, limits, contracts and account changes are managed by your organisation.
            </p>
            <Link to="/organisation" className="mt-5 inline-block">
              <Button className="rounded-xl" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                View your allowance
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {INFO.map((i) => {
                const Icon = i.icon;
                return (
                  <div key={i.title} className="cs-portal-surface-card rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: "var(--badge-teal-bg)" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                    </span>
                    <h3 className="mt-3 font-heading text-base font-semibold text-[var(--c-ink)]">{i.title}</h3>
                    <p className="mt-0.5 font-medium text-[var(--c-ink)]">
                      {i.mailto ? <ContactEmailLink /> : i.body}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">{i.sub}</p>
                  </div>
                );
              })}
            </div>

            <div className="cs-portal-surface-card rounded-2xl p-6 sm:p-8">
              {sent ? (
                <div className="flex flex-col items-center py-10 text-center" data-testid="contact-success">
                  <span
                    className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "var(--status-completed-bg)" }}
                  >
                    <CheckCircle2 className="h-7 w-7" style={{ color: "#16A34A" }} />
                  </span>
                  <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Message sent!</h2>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--c-muted-fg)]">
                    Thanks for reaching out. Our team will get back to you within one business day.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 rounded-xl"
                    onClick={() => {
                      setSent(false);
                      setForm({ name: "", email: "", subject: "General enquiry", message: "" });
                    }}
                  >
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <p
                      style={{ fontFamily: "'Caveat', cursive", fontSize: "22px", fontWeight: 600, color: "var(--c-primary-hover)" }}
                    >
                      Send a message
                    </p>
                    <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">How can we help?</h2>
                    <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
                      Fill in the form and we&apos;ll route your enquiry to the right team.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="c-name">Name</Label>
                      <Input
                        id="c-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your name"
                        className="mt-1 rounded-xl"
                        data-testid="contact-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="c-email">Email</Label>
                      <Input
                        id="c-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@company.com"
                        className="mt-1 rounded-xl"
                        data-testid="contact-email-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Subject</Label>
                    <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                      <SelectTrigger className="mt-1 rounded-xl" data-testid="contact-subject-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General enquiry">General enquiry</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="c-msg">Message</Label>
                    <Textarea
                      id="c-msg"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we help?"
                      className="mt-1 rounded-xl"
                      data-testid="contact-message-input"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl"
                    data-testid="contact-submit-button"
                    style={{ background: "var(--c-ink-solid)", color: "#fff", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-4 w-4" /> Send message
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-[var(--c-muted-fg)]">
                    Or email us directly at{" "}
                    <a href={`mailto:${CIVICSIGN_CONTACT_EMAIL}`} className="font-medium hover:underline" style={{ color: "var(--c-primary)" }}>
                      {CIVICSIGN_CONTACT_EMAIL}
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
}