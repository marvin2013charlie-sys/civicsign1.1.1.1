import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, API_ORIGIN } from "@/lib/api";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  User, CreditCard, LifeBuoy, Loader2, Save, KeyRound, Check, Mail,
  MessageCircleQuestion, ShieldCheck, Sparkles, Crown, Building2,
  Trash2, AlertTriangle, Bot, SendHorizonal, Camera, ImagePlus, ImageOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PLAN_DEFS = [
  {
    id: "free", name: "Free", price: "£0", period: "forever", icon: Sparkles,
    tagline: "For individuals getting started",
    features: ["5 documents / month", "Up to 2 recipients", "Draw, type & upload signatures", "Tamper-evident audit trail"],
  },
  {
    id: "pro", name: "Pro", price: "£15", period: "/ month", icon: Crown,
    tagline: "For professionals & growing teams",
    features: [
      "All Free features, plus:",
      "Up to 500 documents per user / month",
      "Simple Electronic Signatures (SES) from your recipients",
      "Shared team templates for standardised agreements",
      "Real-time commenting & collaboration",
      "Custom branding (logo & colours) to build trust",
    ],
  },
  {
    id: "business", name: "Business", price: "£49", period: "/ month", icon: Building2,
    tagline: "For organisations at scale",
    features: ["Everything in Pro, unlimited documents", "Recipient authentication (SMS / KBA)", "Bulk send & advanced routing", "API access & webhooks", "Dedicated priority support"],
  },
];

const FAQS = [
  { q: "Are CIVICSIGN signatures legally binding?", a: "Yes. Every completed document captures signer intent and consent, timestamps, IP address, and a SHA-256 tamper-evident seal, and is finalized with a Certificate of Completion \u2014 aligned with the UK Electronic Communications Act 2000 and UK eIDAS expectations." },
  { q: "What file types can I upload?", a: "You can upload PDF and Microsoft Word (.docx) documents. Word files are automatically converted to PDF before preparation." },
  { q: "Do my signers need an account?", a: "No. Recipients receive a secure signing link and can complete only their assigned fields without creating an account." },
  { q: "How do reminders and expiration work?", a: "From an envelope's detail page you can send a reminder to pending signers. When sending, you can also set the document to expire in 3, 7, 14, or 30 days." },
  { q: "Can I reuse documents I send often?", a: "Yes. Prepare a document with fields and roles, then choose 'Save as template'. You can also use the ready-made Starter templates such as NDA, Offer Letter and more." },
  { q: "How do I change or cancel my plan?", a: "Head to the Subscription tab on this page to switch between Free, Pro, and Business plans at any time." },
];

function DeleteAccountDialog({ open, onOpenChange }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!open) { const t = setTimeout(() => setConfirm(""), 0); return () => clearTimeout(t); } return undefined; }, [open]);

  const del = async () => {
    setDeleting(true);
    try {
      await api.delete("/auth/account", { data: { confirm } });
      localStorage.removeItem("cs_token");
      toast.success("Your account and all data have been deleted");
      await logout();
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="delete-account-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-[#B91C1C]">
            <AlertTriangle className="h-5 w-5" /> Delete account
          </DialogTitle>
          <DialogDescription>
            This permanently deletes your account and <b>all</b> of your envelopes, templates and documents. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="confirm-delete">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
          <Input id="confirm-delete" className="mt-1" value={confirm} autoComplete="off"
            onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" data-testid="delete-confirm-input" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={del} disabled={deleting || confirm.trim().toUpperCase() !== "DELETE"}
            data-testid="confirm-delete-account-btn"
            style={{ background: "#DC2626", color: "#fff" }}>
            {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />} Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AvatarCard() {
  const { user, setUser } = useAuth();
  const fileRef = React.useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();
  // The backend stores picture as either an absolute URL (Google) or a relative
  // path like "/api/auth/avatar/{file_id}". Prepend the backend origin only
  // for the relative case so the <img> tag resolves on the correct host.
  const rawPicture = user?.picture || "";
  const pictureSrc = rawPicture && rawPicture.startsWith("/")
    ? `${API_ORIGIN}${rawPicture}`
    : rawPicture;

  const onPick = () => fileRef.current?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.type)) {
      toast.error("Please choose a JPG, PNG, WebP or GIF image"); return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(data);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const onRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await api.delete("/auth/avatar");
      setUser(data);
      toast.success("Avatar removed");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6" data-testid="avatar-card">
      <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Profile picture</h3>
      <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
        Shown to your recipients on the signing page and in audit emails. JPG, PNG, WebP or GIF, up to 2&nbsp;MB.
      </p>
      <div className="mt-5 flex items-center gap-5">
        <div className="relative">
          <Avatar className="h-20 w-20 ring-2 ring-[var(--c-border)]">
            {pictureSrc && <AvatarImage src={pictureSrc} alt={user?.name || "Avatar"} />}
            <AvatarFallback className="bg-[var(--c-primary)] text-lg font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button" onClick={onPick} data-testid="avatar-upload-overlay"
            aria-label="Change profile picture"
            className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--card)] bg-[var(--c-ink)] text-white shadow-sm transition-transform hover:scale-105"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onPick} disabled={uploading} data-testid="avatar-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            {uploading
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <ImagePlus className="mr-1.5 h-4 w-4" />}
            {pictureSrc ? "Replace photo" : "Upload photo"}
          </Button>
          {pictureSrc && (
            <Button variant="outline" onClick={onRemove} disabled={removing} data-testid="avatar-remove-btn">
              {removing
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <ImageOff className="mr-1.5 h-4 w-4" />}
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onChange} className="hidden" data-testid="avatar-file-input"
      />
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", mobile: "",
    company: "", job_title: "", phone: "", country: "United Kingdom",
    city: "", postcode: "", vat_number: "", company_size: "", industry: "",
    marketing_opt_in: false,
  });
  const [saving, setSaving] = useState(false);
  const isPasswordAccount = user?.auth_provider !== "google";
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm: "" });
  const [changingPwd, setChangingPwd] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const t = setTimeout(() => setForm({
      name: user.name || "", email: user.email || "", mobile: user.mobile || "",
      company: user.company || "", job_title: user.job_title || "", phone: user.phone || "",
      country: user.country || "United Kingdom", city: user.city || "",
      postcode: user.postcode || "", vat_number: user.vat_number || "",
      company_size: user.company_size || "", industry: user.industry || "",
      marketing_opt_in: !!user.marketing_opt_in,
    }), 0);
    return () => clearTimeout(t);
  }, [user]);

  const saveProfile = async () => {
    if (!form.name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/auth/profile", {
        name: form.name.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
        company: form.company.trim(), job_title: form.job_title.trim(), phone: form.phone.trim(),
        country: form.country.trim(), city: form.city.trim(), postcode: form.postcode.trim(),
        vat_number: form.vat_number.trim(), company_size: form.company_size,
        industry: form.industry.trim(), marketing_opt_in: form.marketing_opt_in,
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
        <AvatarCard />
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

        {/* ---- Business details ---- */}
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6" data-testid="business-details-card">
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
            <Building2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Business details
          </h3>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Used on invoices, signing emails and your branded signing page.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company">Company / Organisation</Label>
              <Input id="company" className="mt-1" data-testid="settings-company-input"
                value={form.company} placeholder="Acme Solicitors Ltd"
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" className="mt-1" data-testid="settings-job-title-input"
                value={form.job_title} placeholder="Managing Director"
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Work phone</Label>
              <Input id="phone" className="mt-1" data-testid="settings-phone-input"
                value={form.phone} placeholder="+44 20 1234 5678"
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <select id="industry" data-testid="settings-industry-input"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-[var(--c-border)] bg-[var(--card)] px-3 text-sm text-[var(--c-ink)]">
                <option value="">Select industry…</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Staffing Agency">Staffing Agency</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="company_size">Company size</Label>
              <select id="company_size" data-testid="settings-company-size-input"
                value={form.company_size}
                onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-[var(--c-border)] bg-[var(--card)] px-3 text-sm text-[var(--c-ink)]">
                <option value="">Select size…</option>
                <option value="1">Just me</option>
                <option value="2-10">2 – 10</option>
                <option value="11-50">11 – 50</option>
                <option value="51-200">51 – 200</option>
                <option value="200+">200+</option>
              </select>
            </div>
            <div>
              <Label htmlFor="vat_number">VAT number</Label>
              <Input id="vat_number" className="mt-1" data-testid="settings-vat-input"
                value={form.vat_number} placeholder="GB123456789"
                onChange={(e) => setForm((f) => ({ ...f, vat_number: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" className="mt-1" data-testid="settings-city-input"
                value={form.city} placeholder="London"
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input id="postcode" className="mt-1" data-testid="settings-postcode-input"
                value={form.postcode} placeholder="WC2H 9JQ"
                onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" className="mt-1" data-testid="settings-country-input"
                value={form.country} placeholder="United Kingdom"
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
            <label className="sm:col-span-2 flex cursor-pointer items-start gap-2 rounded-lg border border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] p-3 text-sm">
              <input
                type="checkbox" data-testid="settings-marketing-optin"
                className="mt-0.5 h-4 w-4 rounded border-[var(--c-border)]"
                checked={form.marketing_opt_in}
                onChange={(e) => setForm((f) => ({ ...f, marketing_opt_in: e.target.checked }))}
              />
              <span>
                <strong>Send me product updates & UK e-signature tips</strong>
                <span className="block text-xs text-[var(--muted-foreground)]">Occasional, no spam. You can opt out anytime — UK GDPR compliant.</span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={saveProfile} disabled={saving} data-testid="settings-save-business"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save business details
            </Button>
          </div>
        </div>

        {isPasswordAccount && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
            <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
              <KeyRound className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Change password
            </h3>
            {/* autoComplete=new-password prevents the browser from pre-filling saved credentials */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="cur">Current password</Label>
                <Input id="cur" type="password" autoComplete="new-password" className="mt-1" value={pwd.current_password} data-testid="settings-current-password"
                  onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" autoComplete="new-password" className="mt-1" value={pwd.new_password} data-testid="settings-new-password"
                  onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="conf">Confirm new password</Label>
                <Input id="conf" type="password" autoComplete="new-password" className="mt-1" value={pwd.confirm} data-testid="settings-confirm-password"
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

        {/* Danger zone */}
        <div className="rounded-xl border p-6" style={{ borderColor: "#FCA5A5", background: "#FEF2F2" }} data-testid="danger-zone">
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold" style={{ color: "#B91C1C" }}>
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </h3>
          <p className="mt-1 text-sm" style={{ color: "#7F1D1D" }}>
            Permanently delete your account and all associated envelopes, templates and documents. This action cannot be undone.
          </p>
          <div className="mt-4">
            <Button onClick={() => setDelOpen(true)} data-testid="delete-account-button"
              style={{ background: "#DC2626", color: "#fff" }}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete account
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6 self-start" data-testid="account-summary-card">
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

      <DeleteAccountDialog open={delOpen} onOpenChange={setDelOpen} />
    </div>
  );
}

function SubscriptionTab() {
  const { user, setUser, checkAuth } = useAuth();
  const [params, setParams] = useSearchParams();
  const [switching, setSwitching] = useState("");
  const [verifying, setVerifying] = useState(false);
  const current = user?.plan || "free";

  // When Stripe redirects back with ?session_id=..., poll the backend until the
  // payment is confirmed (polling is the source of truth for one-time checkout).
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;
    Promise.resolve().then(() => setVerifying(true));

    const clearSessionParam = () => {
      const p = new URLSearchParams(params);
      p.delete("session_id");
      setParams(p, { replace: true });
    };

    const poll = async () => {
      try {
        const { data } = await api.get(`/billing/status/${sessionId}`);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          await checkAuth();
          const name = (data.plan_id || "").charAt(0).toUpperCase() + (data.plan_id || "").slice(1);
          toast.success(`Payment successful — you're now on the ${name} plan`);
          setVerifying(false);
          clearSessionParam();
          return;
        }
        if (data.status === "expired") {
          toast.error("Your payment session expired. Please try again.");
          setVerifying(false);
          clearSessionParam();
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          toast.info("Still processing your payment. Refresh in a moment to see your updated plan.");
          setVerifying(false);
          clearSessionParam();
          return;
        }
        setTimeout(poll, 2000);
      } catch (err) {
        if (cancelled) return;
        toast.error("Couldn't verify your payment status. Please refresh.");
        setVerifying(false);
        clearSessionParam();
      }
    };
    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount to detect a returning Stripe session

  const choose = async (planId) => {
    if (planId === current) return;
    setSwitching(planId);
    // Free is a downgrade — no payment required.
    if (planId === "free") {
      try {
        const { data } = await api.post("/auth/subscription", { plan: planId });
        setUser(data);
        toast.success("You're now on the Free plan");
      } catch (err) {
        toast.error(formatApiError(err.response?.data?.detail));
      } finally {
        setSwitching("");
      }
      return;
    }
    // Paid plans go through Stripe Checkout.
    try {
      const { data } = await api.post("/billing/checkout", {
        plan_id: planId, origin_url: window.location.origin,
      });
      if (data.url) {
        window.location.assign(data.url); // redirect to Stripe-hosted checkout
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      setSwitching("");
    }
  };

  return (
    <div>
      {verifying && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--status-viewed-bg)] px-4 py-3 text-sm" data-testid="payment-verifying-banner">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--c-primary)" }} />
          <span className="text-[var(--c-ink)]">Confirming your payment…</span>
        </div>
      )}
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
              <Button className="mt-5" disabled={isCurrent || switching === p.id || verifying} onClick={() => choose(p.id)}
                data-testid={`plan-select-${p.id}`}
                variant={isCurrent ? "outline" : "default"}
                style={isCurrent ? {} : { background: "var(--c-primary)", color: "#fff" }}>
                {switching === p.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {isCurrent ? "Current plan" : p.id === "free" ? "Switch to Free" : `Upgrade to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
        Payments are processed securely by Stripe. Upgrades are charged once and take effect immediately; downgrading to Free is always free.
      </p>
    </div>
  );
}

function AiAssistant() {
  const greeting = { role: "assistant", content: "Hi! I'm the CivicSign Assistant. Ask me anything about preparing, sending, signing, templates, reminders or your account." };
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      // history = everything after greeting, excluding the message we're sending now
      const history = next.slice(1, -1).map((m) => ({ role: m.role, content: m.content }));
      const { data } = await api.post("/assistant/chat", { message: text, history });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const suggestions = [
    "How do I add a signature field?",
    "How do reminders work?",
    "What's the difference between the plans?",
  ];

  return (
    <div className="flex h-[460px] flex-col rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="help-ai-chat">
      <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-5 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)" }}>
          <Bot className="h-4 w-4 text-white" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--c-ink)]">CivicSign Assistant</p>
          <p className="text-xs text-[var(--muted-foreground)]">AI-powered help · available 24/7</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 cs-scroll" data-testid="help-ai-messages">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm text-[var(--c-ink)]"}`}
              style={m.role === "user" ? { background: "var(--c-primary)" } : { background: "var(--c-paper-2)" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-[var(--c-paper-2)] px-3.5 py-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-5 pb-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setInput(s)} data-testid="help-ai-suggestion"
              className="rounded-full border border-[var(--c-border)] px-3 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-[var(--c-border)] p-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Ask the assistant…" data-testid="help-ai-input" />
        <Button onClick={send} disabled={loading || !input.trim()} data-testid="help-ai-send"
          style={{ background: "var(--c-primary)", color: "#fff" }}>
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <AiAssistant />
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
            <MessageCircleQuestion className="h-5 w-5" style={{ color: "var(--c-primary)" }} /> Frequently asked questions
          </h3>
          <Accordion type="single" collapsible className="mt-3" data-testid="help-faq-accordion">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold text-[var(--c-ink)]">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-[var(--muted-foreground)]">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      <div className="space-y-5">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
            <LifeBuoy className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
          </span>
          <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">Still need a human?</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Our team typically replies within one business day. Send us a message and we will get right back to you.</p>
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
