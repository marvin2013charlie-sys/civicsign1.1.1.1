import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  User, CreditCard, LifeBuoy, Loader2, Save, KeyRound, Check, Mail,
  MessageCircleQuestion, ShieldCheck, Sparkles, Crown, Building2,
} from "lucide-react";

const PLAN_DEFS = [
  {
    id: "free", name: "Free", price: "$0", period: "forever", icon: Sparkles,
    tagline: "For individuals getting started",
    features: ["3 documents / month", "Up to 2 recipients", "Draw, type & upload signatures", "Tamper-evident audit trail"],
  },
  {
    id: "pro", name: "Pro", price: "$15", period: "/ month", icon: Crown,
    tagline: "For professionals & freelancers",
    features: ["Unlimited documents", "Reusable templates", "Reminders & expiration", "Bulk send", "Priority email support"],
  },
  {
    id: "business", name: "Business", price: "$49", period: "/ month", icon: Building2,
    tagline: "For growing teams",
    features: ["Everything in Pro", "Team workspaces (soon)", "Custom branding", "Advanced analytics", "Dedicated support"],
  },
];

const FAQS = [
  { q: "Are CIVICSIGN signatures legally binding?", a: "Yes. Every completed document captures signer intent and consent, timestamps, IP address, and a SHA-256 tamper-evident seal, and is finalized with a Certificate of Completion \u2014 aligned with ESIGN and eIDAS expectations." },
  { q: "What file types can I upload?", a: "You can upload PDF and Microsoft Word (.docx) documents. Word files are automatically converted to PDF before preparation." },
  { q: "Do my signers need an account?", a: "No. Recipients receive a secure signing link and can complete only their assigned fields without creating an account." },
  { q: "How do reminders and expiration work?", a: "From an envelope's detail page you can send a reminder to pending signers. When sending, you can also set the document to expire in 3, 7, 14, or 30 days." },
  { q: "Can I reuse documents I send often?", a: "Yes. Prepare a document with fields and roles, then choose 'Save as template'. You can reuse it, or bulk-send single-signer templates to many recipients at once." },
  { q: "How do I change or cancel my plan?", a: "Head to the Subscription tab on this page to switch between Free, Pro, and Business plans at any time." },
];

function ProfileTab() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [saving, setSaving] = useState(false);
  const isPasswordAccount = user?.auth_provider !== "google";
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm: "" });
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || "", email: user.email || "", mobile: user.mobile || "" });
  }, [user]);

  const saveProfile = async () => {
    if (!form.name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/auth/profile", {
        name: form.name.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
      });
      setUser(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwd.new_password.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (pwd.new_password !== pwd.confirm) { toast.error("New passwords do not match"); return; }
    setChangingPwd(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwd.current_password, new_password: pwd.new_password,
      });
      toast.success("Password updated");
      setPwd({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
          <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Personal information</h3>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Update your name, email and mobile number.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" className="mt-1" value={form.name} data-testid="settings-name-input"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile number</Label>
              <Input id="mobile" className="mt-1" value={form.mobile} placeholder="+1 555 000 0000" data-testid="settings-mobile-input"
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" className="mt-1" value={form.email} data-testid="settings-email-input"
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">This is the email you use to sign in.</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={saveProfile} disabled={saving} data-testid="settings-save-profile"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save changes
            </Button>
          </div>
        </div>

        {isPasswordAccount && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
            <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
              <KeyRound className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Change password
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="cur">Current password</Label>
                <Input id="cur" type="password" className="mt-1" value={pwd.current_password} data-testid="settings-current-password"
                  onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" className="mt-1" value={pwd.new_password} data-testid="settings-new-password"
                  onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="conf">Confirm new password</Label>
                <Input id="conf" type="password" className="mt-1" value={pwd.confirm} data-testid="settings-confirm-password"
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={changePassword} disabled={changingPwd} data-testid="settings-change-password-btn">
                {changingPwd ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1.5 h-4 w-4" />} Update password
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6" data-testid="account-summary-card">
        <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Account</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--muted-foreground)]">Sign-in method</dt>
            <dd className="font-medium capitalize text-[var(--c-ink)]">{user?.auth_provider === "google" ? "Google" : "Email & password"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--muted-foreground)]">Current plan</dt>
            <dd className="font-semibold capitalize" style={{ color: "var(--c-primary)" }}>{user?.plan || "free"}</dd>
          </div>
          {user?.role === "admin" && (
            <div className="flex items-center justify-between">
              <dt className="text-[var(--muted-foreground)]">Role</dt>
              <dd className="inline-flex items-center gap-1 font-medium text-[var(--c-ink)]"><ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Admin</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function SubscriptionTab() {
  const { user, setUser } = useAuth();
  const [switching, setSwitching] = useState("");
  const current = user?.plan || "free";

  const choose = async (planId) => {
    if (planId === current) return;
    setSwitching(planId);
    try {
      const { data } = await api.post("/auth/subscription", { plan: planId });
      setUser(data);
      toast.success(`You're now on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSwitching("");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--status-sent-bg)] px-4 py-3 text-sm" data-testid="current-plan-banner">
        <CreditCard className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
        <span className="text-[var(--c-ink)]">You are currently on the <b className="capitalize">{current}</b> plan.</span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PLAN_DEFS.map((p) => {
          const isCurrent = p.id === current;
          const Icon = p.icon;
          return (
            <div key={p.id} data-testid={`plan-card-${p.id}`}
              className="flex flex-col rounded-xl border bg-[var(--card)] p-6 transition-shadow hover:shadow-md"
              style={{ borderColor: isCurrent ? "var(--c-primary)" : "var(--c-border)", boxShadow: isCurrent ? "0 0 0 1px var(--c-primary)" : undefined }}>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                  <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                </span>
                {isCurrent && <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--c-primary)", color: "#fff" }}>Current</span>}
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">{p.name}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{p.tagline}</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-heading text-3xl font-bold text-[var(--c-ink)]">{p.price}</span>
                <span className="mb-1 text-sm text-[var(--muted-foreground)]">{p.period}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--c-ink)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-5" disabled={isCurrent || switching === p.id} onClick={() => choose(p.id)}
                data-testid={`plan-select-${p.id}`}
                variant={isCurrent ? "outline" : "default"}
                style={isCurrent ? {} : { background: "var(--c-primary)", color: "#fff" }}>
                {switching === p.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {isCurrent ? "Current plan" : `Switch to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-[var(--muted-foreground)]">Plans are illustrative for now \u2014 no payment is collected. Billing integration is coming soon.</p>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
          <MessageCircleQuestion className="h-5 w-5" style={{ color: "var(--c-primary)" }} /> Frequently asked questions
        </h3>
        <Accordion type="single" collapsible className="mt-3" data-testid="help-faq-accordion">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-semibold text-[var(--c-ink)]">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-[var(--muted-foreground)]">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="space-y-5">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
            <LifeBuoy className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
          </span>
          <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">Still need help?</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Our team typically replies within one business day. Send us a message and we'll get right back to you.</p>
          <Link to="/contact" data-testid="help-contact-link">
            <Button className="mt-4 w-full" style={{ background: "var(--c-primary)", color: "#fff" }}>
              <Mail className="mr-1.5 h-4 w-4" /> Contact support
            </Button>
          </Link>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6 text-sm">
          <p className="font-semibold text-[var(--c-ink)]">Email us directly</p>
          <a href="mailto:support@civicsign.com" className="mt-1 inline-block font-medium" style={{ color: "var(--c-primary)" }}>support@civicsign.com</a>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "profile";
  const setTab = (t) => setParams(t === "profile" ? {} : { tab: t });

  return (
    <AppShell title="Settings">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-5 h-auto flex-wrap gap-1 bg-[var(--c-paper-2)] p-1">
          <TabsTrigger value="profile" data-testid="settings-tab-profile" className="data-[state=active]:bg-[var(--card)]">
            <User className="mr-1.5 h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" data-testid="settings-tab-subscription" className="data-[state=active]:bg-[var(--card)]">
            <CreditCard className="mr-1.5 h-4 w-4" /> Subscription
          </TabsTrigger>
          <TabsTrigger value="help" data-testid="settings-tab-help" className="data-[state=active]:bg-[var(--card)]">
            <LifeBuoy className="mr-1.5 h-4 w-4" /> Help & Support
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="subscription"><SubscriptionTab /></TabsContent>
        <TabsContent value="help"><HelpTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
