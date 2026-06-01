import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
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
import { Mail, MessageSquare, Clock, MapPin, Loader2, CheckCircle2, Send } from "lucide-react";

const INFO = [
  { icon: Mail, title: "Email us", body: "hello@civicsign.com", sub: "General & sales enquiries" },
  { icon: MessageSquare, title: "Support", body: "support@civicsign.com", sub: "We reply within 1 business day" },
  { icon: Clock, title: "Hours", body: "Mon – Fri, 9am – 6pm", sub: "Across global time zones" },
  { icon: MapPin, title: "Office", body: "123 Market Street", sub: "San Francisco, CA" },
];

export default function Contact() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [form, setForm] = useState({ name: "", email: "", subject: "General enquiry", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
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
      toast.error(formatApiError(err.response?.data?.detail) || "Could not send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />

      <section className="border-b border-[var(--c-border)] bg-[var(--c-ink)]">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">Talk to us</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Questions about CIVICSIGN, pricing, or partnerships? Send us a note and we’ll get back to you fast.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid lg:grid-cols-[1fr_1.2fr]">
        {/* Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {INFO.map((i) => (
            <div key={i.title} className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
                <i.icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-[var(--c-ink)]">{i.title}</h3>
              <p className="mt-0.5 font-medium text-[var(--c-ink)]">{i.body}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{i.sub}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="mt-8 lg:mt-0">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center py-10 text-center" data-testid="contact-success">
                <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-completed-bg)" }}>
                  <CheckCircle2 className="h-7 w-7" style={{ color: "#16A34A" }} />
                </span>
                <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Message sent!</h2>
                <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">Thanks for reaching out. Our team will get back to you within one business day.</p>
                <Button variant="outline" className="mt-5" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "General enquiry", message: "" }); }}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Send us a message</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="c-name">Name</Label>
                    <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="mt-1" data-testid="contact-name-input" />
                  </div>
                  <div>
                    <Label htmlFor="c-email">Email</Label>
                    <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" className="mt-1" data-testid="contact-email-input" />
                  </div>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                    <SelectTrigger className="mt-1" data-testid="contact-subject-select"><SelectValue /></SelectTrigger>
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
                  <Textarea id="c-msg" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" className="mt-1" data-testid="contact-message-input" />
                </div>
                <Button type="submit" disabled={loading} className="w-full" data-testid="contact-submit-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
                  {loading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-1.5 h-4 w-4" /> Send message</>}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
