import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, API_ORIGIN } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { assignStripeCheckout, assignStripePayment } from "@/lib/safeUrl";
import { getUpgradePlanOptions } from "@/lib/planTier";
import { PlanUpgradeDialog } from "@/components/PlanUpgradeDialog";
import { validatePassword } from "@/lib/password";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {

} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  User, CreditCard, LifeBuoy, Loader2, Save, KeyRound, Check, Mail,
  MessageCircleQuestion, ShieldCheck, Sparkles, Crown, Building2, Gift, Tag,
  Trash2, AlertTriangle, Camera, ImagePlus, ImageOff,
  Palette, Plug, Webhook, Headphones,
} from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { ContactEmailLink, RichTextWithContactEmail } from "@/components/BrandText";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BillingIntervalToggle } from "@/components/BillingIntervalToggle";
import { extraDocumentLimitFeature, formatPlanDocumentLimit, formatProMonthlyShort, getPlanPriceDisplay } from "@/lib/pricing";
import { isOrgStaff, ORG_STAFF_ESCALATION_NOTE } from "@/lib/orgLabels";
import { PlanPriceBreakdown, PricingVatFootnote } from "@/components/PlanPriceBreakdown";
import { normalizeBillingInterval, normalizePaidPlanId } from "@/lib/planCheckout";
import { StripeCheckoutRedirect } from "@/components/StripeCheckoutRedirect";

const EXTRA_DOC_FEATURE = extraDocumentLimitFeature();

function buildPlanDefs(billingInterval) {
  return [
    {
      id: "free", name: "Free", icon: Sparkles,
      tagline: "For individuals getting started",
      features: [
        `${formatPlanDocumentLimit("Free", billingInterval)} (deleting does not restore quota)`,
        EXTRA_DOC_FEATURE,
        "Up to 2 recipients",
        "Draw, type & upload signatures",
        "Electronic signatures with tamper-evident audit trail",
      ],
    },
    {
      id: "pro", name: "Pro", icon: Crown,
      tagline: "For professionals & growing teams",
      features: [
        "All Free features, plus:",
        formatPlanDocumentLimit("Pro", billingInterval),
        "Manage PDF — edit, compress, watermark, protect, unlock, merge, split & AI metadata check",
        EXTRA_DOC_FEATURE,
        "Simple Electronic Signatures (SES), UK eIDAS Art. 3(11)",
        "Advanced Electronic Signatures (AES), UK eIDAS Art. 26",
        "Shared team templates for standardised agreements",
        "Real-time commenting & collaboration",
        "Seal verification — check tamper-evident seals on any signed document",
        "Custom branding (logo & colours) to build trust",
      ],
    },
    {
      id: "business", name: "Business", icon: Building2,
      tagline: "For teams that need volume & controls",
      features: [
        "Everything in Pro, plus:",
        formatPlanDocumentLimit("Business", billingInterval),
        EXTRA_DOC_FEATURE,
        "AES as default, strengthened with SMS / KBA recipient authentication",
        "Bulk send",
        "API & webhooks",
        "Priority support",
      ],
    },
  ];
}

const FAQS = [
  { q: "Are CivicSign signatures legally binding?", a: "Yes. Every completed document captures signer intent and consent, timestamps, IP address, and a SHA-256 tamper-evident seal, and is finalized with a Certificate of Completion, aligned with the UK Electronic Communications Act 2000 and UK eIDAS expectations." },
  { q: "What file types can I upload?", a: "You can upload PDF and Microsoft Word (.docx) documents. Word files are automatically converted to PDF before preparation." },
  { q: "Do my signers need an account?", a: "No. Recipients receive a secure signing link and can complete only their assigned fields without creating an account." },
  { q: "How do reminders and expiration work?", a: "From an envelope's detail page you can send a reminder to pending signers. When sending, you can also set the document to expire in 3, 7, 14, or 30 days." },
  { q: "Can I reuse documents I send often?", a: "Yes. Save any prepared draft as a template from Prepare Studio, then reuse it from the Templates page. Pro users can also share templates with their team." },
  { q: "How do I change or cancel my plan?", a: "Open the Subscription tab to see your current plan. Free users can upgrade to Pro or Business; paid subscribers can manage or cancel billing from the same page." },
];

function fmtPeriodEnd(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

function PlanCard({ plan, billingInterval, isCurrent, switching, verifying, onSelect, showAction = true, highlighted = false }) {
  const Icon = plan.icon;
  const { price, note, savings, tax } = getPlanPriceDisplay(plan.name, billingInterval);
  const borderColor = isCurrent || highlighted ? "var(--c-primary)" : "var(--c-portal-border)";
  return (
    <div
      data-testid={`plan-card-${plan.id}`}
      className="cs-portal-surface-card flex h-full flex-col rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderColor, boxShadow: isCurrent || highlighted ? "0 0 0 1px var(--c-primary)" : undefined }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
          <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        {isCurrent && (
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--c-primary)", color: "#fff" }}>
            Current plan
          </span>
        )}
      </div>
      <h3 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">{plan.name}</h3>
      <p className="text-sm text-[var(--c-muted-fg)]">{plan.tagline}</p>
      {plan.id !== "free" && (
        <div className="mt-3">
          <PlanPriceBreakdown
            price={price}
            note={note}
            savings={savings}
            tax={tax}
            priceClassName="font-heading text-3xl font-bold text-[var(--c-ink)]"
            compact
          />
        </div>
      )}
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[var(--c-ink)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} /> {f}
          </li>
        ))}
      </ul>
      {showAction && onSelect && !isCurrent && (
        <Button
          className="mt-5"
          disabled={switching === plan.id || verifying}
          onClick={() => onSelect(plan.id)}
          data-testid={`plan-select-${plan.id}`}
          style={{ background: "var(--c-primary)", color: "#fff" }}
        >
          {switching === plan.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {plan.id === "free" ? "Switch to Free" : `Upgrade to ${plan.name}`}
        </Button>
      )}
    </div>
  );
}

const CANCEL_REASONS = [
  "Too expensive",
  "Not using it enough",
  "Missing features I need",
  "Switching to another tool",
  "Other",
];

function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  onAcceptOffer,
  cancelling,
  acceptingOffer,
  planName,
  showRetentionOffer,
}) {
  const [step, setStep] = useState("offer");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(showRetentionOffer ? "offer" : "feedback");
        setReason("");
        setFeedback("");
      }, 0);
      return () => clearTimeout(t);
    }
    setStep(showRetentionOffer ? "offer" : "feedback");
    return undefined;
  }, [open, showRetentionOffer]);

  const handleOpenChange = (next) => {
    if (!cancelling && !acceptingOffer) onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="cancel-subscription-dialog" className="max-w-md">
        {step === "offer" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Gift className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                Stay on {planName} — 50% off next month
              </DialogTitle>
              <DialogDescription>
                Before you go, we&apos;d like to offer <b>50% off your next billing month</b> on your {planName} plan.
                This is a one-time offer on your account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full"
                disabled={acceptingOffer}
                onClick={onAcceptOffer}
                data-testid="retention-offer-accept"
                style={{ background: "var(--c-primary)", color: "#fff" }}
              >
                {acceptingOffer ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Gift className="mr-1.5 h-4 w-4" />}
                Keep my plan — 50% off next month
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={acceptingOffer}
                onClick={() => setStep("feedback")}
                data-testid="retention-offer-decline"
              >
                No thanks, continue cancelling
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading">Help us improve before you go</DialogTitle>
              <DialogDescription>
                Tell us why you&apos;re leaving {planName}. Your feedback helps us build a better product.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label htmlFor="cancel-reason">Main reason</Label>
                <select
                  id="cancel-reason"
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-3 text-sm text-[var(--c-ink)]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  data-testid="cancel-reason-select"
                >
                  <option value="">Select a reason (optional)</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cancel-feedback">Additional feedback</Label>
                <Textarea
                  id="cancel-feedback"
                  className="mt-1 min-h-[88px]"
                  placeholder="What could we have done better? (optional)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  data-testid="cancel-feedback-input"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancelling}>
                Keep subscription
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirm({ reason, feedback })}
                disabled={cancelling}
                data-testid="cancel-subscription-confirm"
              >
                {cancelling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Cancel subscription
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrgSubscriptionPanel({ user, orgStaff }) {
  const planName = orgStaff ? "Organisation member" : "Organisation";
  const tagline = orgStaff
    ? `Team plan via ${user?.company || "your organisation"}`
    : "Custom contract with full organisation features";
  const features = orgStaff
    ? [
        "Full organisation feature set for sending and signing",
        "Personal monthly document allowance set by your organisation admin",
        "Contact your organisation admin for allowance changes",
      ]
    : [
        "Custom document pools per seat — set in your organisation contract",
        "Bulk send, API, webhooks, branding & team features included",
        "Custom pricing agreed with your account manager",
      ];

  return (
    <div data-testid={orgStaff ? "org-staff-subscription-panel" : "org-subscription-panel"}>
      <div className="max-w-lg">
        <PlanCard
          plan={{
            id: "organisation",
            name: planName,
            icon: Building2,
            tagline,
            features,
          }}
          billingInterval="monthly"
          isCurrent
          showAction={false}
        />
      </div>
      <div className="mt-5 cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="org-subscription-manage">
        <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
            <Building2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Account management
          </h3>
        </div>
        <div className="p-5">
        <p className="text-sm text-[var(--c-muted-fg)]">
          {orgStaff
            ? "Your subscription is managed by your organisation. Billing and plan changes are handled by your account team."
            : "Your organisation contract is managed by your account manager — not via self-serve checkout."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => window.location.assign("/organisation")}
            className="rounded-xl"
            style={{ background: "var(--c-ink-solid)", color: "#fff" }}
          >
            {orgStaff ? "View your allowance" : "Open organisation portal"}
          </Button>
          {orgStaff ? (
            <Button variant="outline" onClick={() => window.location.assign("/usage")}>
              Usage details
            </Button>
          ) : (
            <Button variant="outline" onClick={() => window.location.assign("/contact")}>
              Contact account team
            </Button>
          )}
        </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--c-muted-fg)]">
        {orgStaff ? ORG_STAFF_ESCALATION_NOTE : "Need more seats or a higher allocation? Email info@civicbot.co.uk or book a call to review your contract."}
      </p>
    </div>
  );
}

function DeleteAccountDialog({ open, onOpenChange }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("ask");
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("ask");
        setConfirm("");
      }, 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const del = async () => {
    setDeleting(true);
    try {
      await api.delete("/auth/account", { data: { confirm } });
      toast.success("Your account and all data have been deleted");
      await logout();
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="delete-account-dialog" className="max-w-md">
        {step === "ask" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading text-[#B91C1C]">
                <AlertTriangle className="h-4 w-4" /> Delete account?
              </DialogTitle>
              <DialogDescription>
                This permanently removes your account and all envelopes, templates and documents. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => setStep("confirm")}
                data-testid="delete-account-continue-btn"
                style={{ background: "#DC2626", color: "#fff" }}
              >
                Yes, delete my account
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-[#B91C1C]">Confirm deletion</DialogTitle>
              <DialogDescription>
                Type <span className="font-mono font-semibold">DELETE</span> below to permanently delete your account.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="confirm-delete" className="sr-only">Confirmation</Label>
              <Input
                id="confirm-delete"
                className="mt-1"
                value={confirm}
                autoComplete="off"
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                data-testid="delete-confirm-input"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("ask")}>Back</Button>
              <Button
                onClick={del}
                disabled={deleting || confirm.trim().toUpperCase() !== "DELETE"}
                data-testid="confirm-delete-account-btn"
                style={{ background: "#DC2626", color: "#fff" }}
              >
                {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                Delete permanently
              </Button>
            </DialogFooter>
          </>
        )}
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
      toast.error(formatApiError(err));
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
      toast.error(formatApiError(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="avatar-card">
      <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
          <Camera className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Profile picture
        </h3>
        <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
          Shown to your recipients on the signing page and in audit emails. JPG, PNG, WebP or GIF, up to 2&nbsp;MB.
        </p>
      </div>
      <div className="p-6">
      <div className="flex items-center gap-5">
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
            className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--card)] bg-[var(--c-ink-solid)] text-white shadow-sm transition-transform hover:scale-105"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onPick} disabled={uploading} data-testid="avatar-upload-btn" className="rounded-xl"
            style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
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
        name: form.name.trim(), mobile: form.mobile.trim(),
        company: form.company.trim(), job_title: form.job_title.trim(), phone: form.phone.trim(),
        country: form.country.trim(), city: form.city.trim(), postcode: form.postcode.trim(),
        vat_number: form.vat_number.trim(), company_size: form.company_size,
        industry: form.industry.trim(), marketing_opt_in: form.marketing_opt_in,
      });
      setUser(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const pwdError = validatePassword(pwd.new_password);
    if (pwdError) { toast.error(pwdError); return; }
    if (pwd.new_password !== pwd.confirm) { toast.error("New passwords do not match"); return; }
    setChangingPwd(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwd.current_password, new_password: pwd.new_password,
      });
      toast.success("Password updated");
      setPwd({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <AvatarCard />
        <div className="cs-portal-surface-card overflow-hidden rounded-2xl">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">Personal information</h3>
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">Update your name, email and mobile number.</p>
          </div>
          <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <Input id="email" type="email" value={form.email} data-testid="settings-email-input"
                readOnly disabled className="mt-1 bg-[var(--c-paper-2)]" />
              <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
                Sign-in email is fixed during private beta. Contact support if you need to change it.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end border-t border-[var(--c-border)] pt-5">
            <Button onClick={saveProfile} disabled={saving} data-testid="settings-save-profile" className="rounded-xl"
              style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save changes
            </Button>
          </div>
          </div>
        </div>

        {/* ---- Business details ---- */}
        <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="business-details-card">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
              <Building2 className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Business details
            </h3>
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">Used on invoices, signing emails and your branded signing page.</p>
          </div>
          <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
                className="mt-1 h-10 w-full rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-3 text-sm text-[var(--c-ink)]">
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
                className="mt-1 h-10 w-full rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-3 text-sm text-[var(--c-ink)]">
                <option value="">Select size…</option>
                <option value="1">Just me</option>
                <option value="2-10">2, 10</option>
                <option value="11-50">11, 50</option>
                <option value="51-200">51, 200</option>
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
                <span className="block text-xs text-[var(--c-muted-fg)]">Occasional, no spam. You can opt out anytime, UK GDPR compliant.</span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end border-t border-[var(--c-border)] pt-5">
            <Button onClick={saveProfile} disabled={saving} data-testid="settings-save-business" className="rounded-xl"
              style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save business details
            </Button>
          </div>
          </div>
        </div>

        {isPasswordAccount && (
          <div className="cs-portal-surface-card overflow-hidden rounded-2xl">
            <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
              <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
                <KeyRound className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Change password
              </h3>
            </div>
            <div className="p-6">
            {/* autoComplete=new-password prevents the browser from pre-filling saved credentials */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="cur">Current password</Label>
                <Input id="cur" type="password" autoComplete="current-password" className="mt-1" value={pwd.current_password} data-testid="settings-current-password"
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
            <div className="mt-5 flex justify-end border-t border-[var(--c-border)] pt-5">
              <Button variant="outline" onClick={changePassword} disabled={changingPwd} data-testid="settings-change-password-btn" className="rounded-xl">
                {changingPwd ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1.5 h-4 w-4" />} Update password
              </Button>
            </div>
            </div>
          </div>
        )}

      </div>

      <div className="cs-portal-surface-card overflow-hidden rounded-2xl self-start" data-testid="account-summary-card">
        <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">Account</h3>
        </div>
        <div className="p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--c-muted-fg)]">Sign-in method</dt>
            <dd className="font-medium capitalize text-[var(--c-ink)]">{user?.auth_provider === "google" ? "Google" : "Email & password"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--c-muted-fg)]">Current plan</dt>
            <dd className="font-semibold capitalize" style={{ color: "var(--c-primary)" }}>{user?.plan || "free"}</dd>
          </div>
          {user?.role === "admin" && (
            <div className="flex items-center justify-between">
              <dt className="text-[var(--c-muted-fg)]">Role</dt>
              <dd className="inline-flex items-center gap-1 font-medium text-[var(--c-ink)]"><ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Admin</dd>
            </div>
          )}
        </dl>
        <div className="border-t border-[var(--c-border)] pt-4" data-testid="danger-zone">
          <button
            type="button"
            onClick={() => setDelOpen(true)}
            data-testid="delete-account-button"
            className="text-xs text-[var(--c-muted-fg)] underline-offset-2 transition-colors hover:text-[#B91C1C] hover:underline"
          >
            Delete account
          </button>
        </div>
        </div>
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
  const [billingInterval, setBillingInterval] = useState(user?.billing_interval || "monthly");
  const upgradeTarget = params.get("upgrade");
  const intervalParam = params.get("interval");
  const autoCheckout = params.get("checkout") === "1";
  const checkoutStarted = useRef(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [managing, setManaging] = useState(false);
  const [checkoutRedirect, setCheckoutRedirect] = useState(null);
  const [billingConfig, setBillingConfig] = useState(null);
  const [upgradePreview, setUpgradePreview] = useState(null);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState(null);
  const [upgradeTargetInterval, setUpgradeTargetInterval] = useState("monthly");
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);
  const current = user?.plan || "free";
  const isPaid = current === "pro" || current === "business";
  const isOrgAccount = !!user?.org_id;
  const orgStaff = isOrgStaff(user);
  const userInterval = user?.billing_interval || "monthly";
  const periodEndLabel = fmtPeriodEnd(user?.subscription_current_period_end);
  const cancelScheduled = !!user?.subscription_cancel_at_period_end;
  const currentPlan = buildPlanDefs(isPaid ? userInterval : billingInterval).find((p) => p.id === current);
  const allPaidPlans = buildPlanDefs(billingInterval).filter((p) => p.id !== "free");
  const upgradePlans = current === "free" ? allPaidPlans : getUpgradePlanOptions(allPaidPlans, current);

  useEffect(() => {
    if (intervalParam === "yearly" || intervalParam === "monthly") {
      setBillingInterval(intervalParam);
    }
  }, [intervalParam]);

  useEffect(() => {
    let cancelled = false;
    api.get("/billing/config")
      .then(({ data }) => { if (!cancelled) setBillingConfig(data); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (autoCheckout || !upgradeTarget || current !== "free") return undefined;
    const t = setTimeout(() => {
      document.getElementById("upgrade-plans-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [upgradeTarget, current, autoCheckout]);

  // When Stripe redirects back with ?session_id=..., poll the backend until the
  // payment is confirmed (polling is the source of truth for one-time checkout).
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return;
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
          const promoNote = data.promotion_code
            ? ` Promo ${data.promotion_code} applied.`
            : "";
          if (data.purchase_type === "extra_document") {
            const n = data.document_credits || 1;
            toast.success(`Payment successful, ${n} extra document credit${n !== 1 ? "s" : ""} added.${promoNote}`);
          } else {
            const name = (data.plan_id || "").charAt(0).toUpperCase() + (data.plan_id || "").slice(1);
            toast.success(`Payment successful, you're now on the ${name} plan.${promoNote}`);
          }
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

  const paymentsBlocked = billingConfig?.payments_blocked || (
    billingConfig?.stripe_live_required && billingConfig?.stripe_mode !== "live"
  );

  const choose = async (planId, intervalOverride) => {
    if (planId === current) return;
    if (paymentsBlocked && planId !== "free") {
      toast.error("Live card payments are not enabled yet. Upgrades are disabled until Stripe live keys are configured.");
      return;
    }
    setSwitching(planId);
    const checkoutInterval = intervalOverride || billingInterval;
    // Free is a downgrade — cancel the Stripe subscription (or downgrade locally
    // if there is no live subscription). Access continues until the paid period ends.
    if (planId === "free") {
      try {
        const { data } = await api.post("/billing/cancel", {});
        if (data.cancel_at_period_end) {
          toast.success(data.message || "Your plan will revert to Free at the end of the billing period.");
          try {
            const { data: me } = await api.get("/auth/me");
            setUser(me);
          } catch { /* keep current user; next load will reflect it */ }
        } else {
          if (data.user) setUser(data.user);
          toast.success(data.message || "You're now on the Free plan");
        }
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setSwitching("");
      }
      return;
    }
    // Paid plans go through Stripe Hosted Checkout (Emergent-style secure payment page).
    try {
      const planDef = buildPlanDefs(checkoutInterval).find((p) => p.id === planId);
      const priceDisplay = planDef ? getPlanPriceDisplay(planDef.name, checkoutInterval) : null;
      const { data } = await api.post("/billing/checkout", {
        plan_id: planId,
        billing_interval: checkoutInterval,
        origin_url: getAppOrigin(),
      });
      if (data.upgrade_confirmation_required && data.preview) {
        setUpgradeTargetPlan(planId);
        setUpgradeTargetInterval(checkoutInterval);
        setUpgradePreview(data.preview);
        setSwitching("");
        return;
      }
      if (data.changed) {
        await checkAuth();
        toast.success(data.message || `You're now on the ${planId} plan`);
        setSwitching("");
        return;
      }
      if (data.url) {
        setCheckoutRedirect({
          planLabel: planDef ? `CivicSign ${planDef.name}` : `CivicSign ${planId}`,
          priceLabel: priceDisplay?.tax?.amount_inc_vat
            ? `£${priceDisplay.tax.amount_inc_vat.toFixed(2)} incl. VAT`
            : priceDisplay?.price || null,
          billingInterval: checkoutInterval,
        });
        window.setTimeout(() => {
          assignStripeCheckout(data.url);
        }, 450);
        return;
      }
      throw new Error("No checkout URL received");
    } catch (err) {
      setCheckoutRedirect(null);
      toast.error(formatApiError(err));
      setSwitching("");
    }
  };

  // After register/verify, pricing CTAs land here and go straight to Stripe Checkout.
  useEffect(() => {
    if (!autoCheckout || checkoutStarted.current) return undefined;
    const plan = normalizePaidPlanId(upgradeTarget);
    if (!plan || current !== "free" || orgStaff || isOrgAccount) return undefined;
    checkoutStarted.current = true;
    const nextParams = new URLSearchParams(params);
    nextParams.delete("checkout");
    setParams(nextParams, { replace: true });
    choose(plan, normalizeBillingInterval(intervalParam || billingInterval));
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout, upgradeTarget, current, orgStaff, isOrgAccount, intervalParam, billingInterval]);

  const acceptRetentionOffer = async () => {
    setAcceptingOffer(true);
    try {
      const { data } = await api.post("/billing/retention-offer", {});
      if (data.user) setUser(data.user);
      toast.success(data.message || "50% off your next month has been applied.");
      setCancelOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAcceptingOffer(false);
    }
  };

  const cancelSubscription = async ({ reason = "", feedback = "" } = {}) => {
    setCancelling(true);
    try {
      const { data } = await api.post("/billing/cancel", { reason, feedback });
      if (data.cancel_at_period_end) {
        toast.success(data.message || "Your plan will revert to Free at the end of the billing period.");
        try {
          const { data: me } = await api.get("/auth/me");
          setUser(me);
        } catch { /* next load will reflect it */ }
      } else {
        if (data.user) setUser(data.user);
        toast.success(data.message || "You're now on the Free plan");
      }
      setCancelOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCancelling(false);
    }
  };

  const confirmPlanUpgrade = async () => {
    if (!upgradeTargetPlan || !upgradePreview) return;
    setConfirmingUpgrade(true);
    try {
      const { data } = await api.post("/billing/confirm-upgrade", {
        plan_id: upgradeTargetPlan,
        billing_interval: upgradeTargetInterval,
        origin_url: getAppOrigin(),
      });
      if (data.payment_required && data.url) {
        setUpgradePreview(null);
        toast.info(data.message || "Complete payment to finish your upgrade.");
        assignStripePayment(data.url);
        return;
      }
      if (data.changed) {
        if (data.user) setUser(data.user);
        else await checkAuth();
        toast.success(data.message || `You're now on the ${upgradeTargetPlan} plan`);
        setUpgradePreview(null);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setConfirmingUpgrade(false);
      setSwitching("");
    }
  };

  const openBillingPortal = async () => {
    setManaging(true);
    try {
      const { data } = await api.post("/billing/portal", { origin_url: getAppOrigin() });
      if (data.url) {
        assignStripeCheckout(data.url);
      } else {
        throw new Error("No portal URL received");
      }
    } catch (err) {
      toast.error(formatApiError(err));
      setManaging(false);
    }
  };

  if (isOrgAccount) {
    return <OrgSubscriptionPanel user={user} orgStaff={orgStaff} />;
  }

  return (
    <div data-testid="self-serve-subscription-panel">
      <PlanUpgradeDialog
        open={!!upgradePreview}
        onOpenChange={(open) => { if (!open) setUpgradePreview(null); }}
        preview={upgradePreview}
        confirming={confirmingUpgrade}
        onConfirm={confirmPlanUpgrade}
      />
      {checkoutRedirect && (
        <StripeCheckoutRedirect
          planLabel={checkoutRedirect.planLabel}
          priceLabel={checkoutRedirect.priceLabel}
          billingInterval={checkoutRedirect.billingInterval}
        />
      )}
      {billingConfig?.promotion_codes_enabled && (current === "free" || upgradePlans.length > 0) && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--card)] px-4 py-2.5 text-xs text-[var(--c-muted-fg)]"
          data-testid="billing-promo-hint"
        >
          <Tag className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--c-primary)" }} />
          Have a promo code? Enter it on the Stripe checkout page when you upgrade.
        </div>
      )}
      {billingConfig?.stripe_mode === "live" && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--card)] px-4 py-2.5 text-xs text-[var(--c-muted-fg)]"
          data-testid="billing-live-badge"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--c-primary)" }} />
          Secure live payments via Stripe — UK cards only, VAT shown at checkout.
        </div>
      )}
      {paymentsBlocked && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
          data-testid="billing-test-warning"
        >
          <b>Upgrades disabled:</b> Stripe is still in test mode (test cards like 4242… can fake payment).
          Set <code className="text-xs">sk_live_…</code> and a live webhook secret in Render before accepting real payments.
        </div>
      )}
      {verifying && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--status-viewed-bg)] px-4 py-3 text-sm" data-testid="payment-verifying-banner">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--c-primary)" }} />
          <span className="text-[var(--c-ink)]">Confirming your payment…</span>
        </div>
      )}
      <div className="cs-portal-surface-card flex items-center gap-2 rounded-2xl border-l-4 px-4 py-3.5 text-sm" style={{ borderLeftColor: "var(--c-primary)" }} data-testid="current-plan-banner">
        <CreditCard className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
        <span className="text-[var(--c-ink)]">
          You are on the <b className="capitalize">{current}</b> plan
          {isPaid ? ` · billed ${userInterval}` : ""}.
        </span>
      </div>

      {currentPlan && (
        <div className={`mt-5 ${current === "free" ? "max-w-xl" : "max-w-lg"}`}>
          <PlanCard
            plan={currentPlan}
            billingInterval={isPaid ? userInterval : billingInterval}
            isCurrent
            showAction={false}
          />
        </div>
      )}

      {upgradePlans.length > 0 && (
        <div id="upgrade-plans-section" className="mt-8 cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="upgrade-plans-section">
          <div className="flex flex-col gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">
                {isPaid ? "Upgrade your subscription" : "Upgrade your plan"}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
                {isPaid
                  ? "Pay only the prorated difference — unused time on your current plan is credited this billing cycle."
                  : "Compare Pro and Business — pick the plan that fits how you send documents."}
              </p>
            </div>
            <BillingIntervalToggle
              className="shrink-0 justify-start"
              value={billingInterval}
              onChange={setBillingInterval}
            />
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {upgradePlans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                billingInterval={billingInterval}
                switching={switching}
                verifying={verifying}
                onSelect={choose}
                highlighted={upgradeTarget === p.id}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 max-w-lg cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="manage-subscription-panel">
        <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
            <CreditCard className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Manage subscription
          </h3>
        </div>
        <div className="p-5">

        {isPaid ? (
          <>
            <p className="text-sm text-[var(--c-muted-fg)]">
              {cancelScheduled
                ? periodEndLabel
                  ? `Cancellation scheduled — your ${current} plan stays active until ${periodEndLabel}, then reverts to Free.`
                  : `Cancellation scheduled — your ${current} plan stays active until the end of this billing period, then reverts to Free.`
                : periodEndLabel
                  ? `Billed ${userInterval}. Your current period ends ${periodEndLabel}.`
                  : `Billed ${userInterval} via Stripe.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {user?.can_manage_billing && (
                <Button
                  variant="outline"
                  disabled={managing || verifying}
                  onClick={openBillingPortal}
                  data-testid="manage-subscription-portal-button"
                >
                  {managing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1.5 h-4 w-4" />}
                  Manage in Stripe
                </Button>
              )}
              {!cancelScheduled && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  disabled={cancelling || verifying}
                  onClick={() => setCancelOpen(true)}
                  data-testid="cancel-subscription-button"
                >
                  Cancel subscription
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--c-muted-fg)]">
            You&apos;re on the Free plan. Choose Pro or Business above to upgrade, or buy a one-off extra document from the dashboard when you hit your limit.
          </p>
        )}
        </div>
      </div>

      <PricingVatFootnote className="mt-4 text-xs" />
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--c-muted-fg)]">
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
        Payments are processed securely by Stripe. Cancelling keeps access until the end of your paid period.
        {(isPaid ? userInterval : billingInterval) === "yearly"
          ? " Annual Pro and Business are billed at 10 months\u2019 price (2 months free) and include 12× the monthly document allowance for the year."
          : ""}
      </p>
      <p className="mt-2 text-xs text-[var(--c-muted-fg)]">
        Refunds and billing disputes are covered in our{" "}
        <Link to="/legal/refunds" className="font-medium text-[var(--c-primary)] hover:underline" data-testid="settings-refund-policy-link">
          Refund Policy
        </Link>
        .
      </p>

      <CancelSubscriptionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={cancelSubscription}
        onAcceptOffer={acceptRetentionOffer}
        cancelling={cancelling}
        acceptingOffer={acceptingOffer}
        showRetentionOffer={!!user?.retention_offer_available}
        planName={current.charAt(0).toUpperCase() + current.slice(1)}
      />
    </div>
  );
}

function BrandingTab() {
  const { has, features } = usePlan();
  const brandingEnabled = features.custom_branding;
  const [branding, setBranding] = useState({
    logo_url: null, primary_color: "#14B8A6", accent_color: "#0F766E", banner_text: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = React.useRef(null);

  useEffect(() => {
    if (!brandingEnabled) { setLoading(false); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/me/branding");
        if (!cancelled) {
          setBranding({
            logo_url: data.logo_url || null,
            primary_color: data.primary_color || "#14B8A6",
            accent_color: data.accent_color || "#0F766E",
            banner_text: data.banner_text || "",
          });
        }
      } catch (err) {
        if (!cancelled) toast.error(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandingEnabled]);

  if (!brandingEnabled) {
    return (
      <UpgradePrompt
        feature="custom_branding"
        title="Custom branding is a Pro feature"
        description={`Add your logo, brand colours and a signing-page banner so recipients see your business, not generic CivicSign chrome. Included on Pro (${formatProMonthlyShort()}).`}
      />
    );
  }

  const logoSrc = branding.logo_url?.startsWith("/")
    ? `${API_ORIGIN}${branding.logo_url}`
    : branding.logo_url;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/me/branding", {
        primary_color: branding.primary_color,
        accent_color: branding.accent_color,
        banner_text: branding.banner_text.trim() || null,
      });
      setBranding((b) => ({ ...b, ...data }));
      toast.success("Branding saved");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.type)) {
      toast.error("Please choose a JPG, PNG, WebP or GIF image"); return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/me/branding/logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBranding((b) => ({ ...b, logo_url: data.logo_url }));
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="branding-settings">
        <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
            <Palette className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Signing page branding
          </h3>
          <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
            Your logo and colours appear on signing links and emails you send.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <Label>Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)]">
                {logoSrc
                  ? <img src={logoSrc} alt="Brand logo" className="max-h-14 max-w-[7rem] object-contain" />
                  : <ImagePlus className="h-6 w-6 text-[var(--c-muted-fg)]" />}
              </div>
              <Button variant="outline" onClick={() => logoRef.current?.click()} disabled={uploading} data-testid="branding-logo-upload">
                {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
                {logoSrc ? "Replace logo" : "Upload logo"}
              </Button>
            </div>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onLogo} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="primary-color">Primary colour</Label>
              <div className="mt-1 flex items-center gap-2">
                <input id="primary-color" type="color" value={branding.primary_color}
                  onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))}
                  className="h-10 w-12 cursor-pointer rounded border border-[var(--c-border)]" data-testid="branding-primary-color" />
                <Input value={branding.primary_color} onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="accent-color">Accent colour</Label>
              <div className="mt-1 flex items-center gap-2">
                <input id="accent-color" type="color" value={branding.accent_color}
                  onChange={(e) => setBranding((b) => ({ ...b, accent_color: e.target.value }))}
                  className="h-10 w-12 cursor-pointer rounded border border-[var(--c-border)]" data-testid="branding-accent-color" />
                <Input value={branding.accent_color} onChange={(e) => setBranding((b) => ({ ...b, accent_color: e.target.value }))} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="banner-text">Signing page banner</Label>
            <Input id="banner-text" className="mt-1" maxLength={140} placeholder="e.g. Acme Solicitors, secure signing"
              value={branding.banner_text}
              onChange={(e) => setBranding((b) => ({ ...b, banner_text: e.target.value }))}
              data-testid="branding-banner-text" />
          </div>
          <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
            <Button onClick={save} disabled={saving} data-testid="branding-save" className="rounded-xl"
              style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save branding
            </Button>
          </div>
        </div>
      </div>
      <div className="cs-portal-surface-card overflow-hidden rounded-2xl self-start" data-testid="branding-preview">
        <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">Live preview</p>
        </div>
        <div className="p-5">
        <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: branding.primary_color }}>
            {logoSrc && <img src={logoSrc} alt="" className="h-8 max-w-[5rem] object-contain" />}
            <span className="text-sm font-semibold text-white">{branding.banner_text || "Your signing page"}</span>
          </div>
          <div className="bg-[var(--c-paper)] p-4 text-sm text-[var(--c-ink)]">
            <p>Recipients see your brand colours on the signing experience.</p>
            <span className="mt-3 inline-block rounded px-3 py-1.5 text-xs font-medium text-white" style={{ background: branding.accent_color }}>
              Finish & Sign
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

const WEBHOOK_EVENT_OPTIONS = [
  { id: "envelope.sent", label: "Sent", hint: "Envelope emailed to signers" },
  { id: "envelope.viewed", label: "Viewed", hint: "Signer opened the document" },
  { id: "envelope.signed", label: "Signed", hint: "A recipient signed" },
  { id: "envelope.completed", label: "Completed", hint: "All parties signed" },
  { id: "envelope.declined", label: "Declined", hint: "A recipient declined" },
  { id: "envelope.voided", label: "Voided", hint: "Sender voided the envelope" },
];

function IntegrationsTab() {
  const { features } = usePlan();
  const [keys, setKeys] = useState([]);
  const [webhook, setWebhook] = useState({ url: "", enabled: false, events: [], has_secret: false });
  const [deliveries, setDeliveries] = useState([]);
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingWh, setSavingWh] = useState(false);
  const [testingWh, setTestingWh] = useState(false);
  const [newKey, setNewKey] = useState(null);

  const loadIntegrations = async () => {
    const [kRes, wRes, dRes, docRes] = await Promise.all([
      api.get("/me/api-keys"),
      api.get("/me/webhook"),
      api.get("/me/webhook/deliveries", { params: { limit: 10 } }),
      api.get("/me/integrations/docs"),
    ]);
    setKeys(kRes.data || []);
    setWebhook(wRes.data || {});
    setDeliveries(dRes.data?.deliveries || []);
    setDocs(docRes.data || null);
  };

  useEffect(() => {
    if (!features.api_webhooks) { setLoading(false); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        await loadIntegrations();
      } catch (err) {
        if (!cancelled) toast.error(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [features.api_webhooks]);

  if (!features.api_webhooks) {
    return (
      <UpgradePrompt
        tier="business"
        feature="api_webhooks"
        title="API & webhooks are a Business feature"
        description="Generate API keys to integrate CivicSign with your systems, and receive real-time webhook events when envelopes are sent, signed or completed."
      />
    );
  }

  const createKey = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/me/api-keys", { label: "Integration key" });
      setNewKey(data.api_key);
      setKeys((k) => [...k, { key_id: data.key_id, prefix: data.prefix, label: "Integration key", created_at: new Date().toISOString() }]);
      toast.success("API key created, copy it now");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId) => {
    try {
      await api.delete(`/me/api-keys/${keyId}`);
      setKeys((k) => k.filter((x) => x.key_id !== keyId));
      toast.success("API key revoked");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const toggleEvent = (eventId) => {
    setWebhook((w) => {
      const current = w.events?.length ? [...w.events] : WEBHOOK_EVENT_OPTIONS.map((e) => e.id);
      const next = current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
      return { ...w, events: next.length ? next : [eventId] };
    });
  };

  const saveWebhook = async (regen = false) => {
    setSavingWh(true);
    try {
      const { data } = await api.patch("/me/webhook", {
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events?.length ? webhook.events : WEBHOOK_EVENT_OPTIONS.map((e) => e.id),
        regenerate_secret: regen,
      });
      setWebhook(data);
      if (data.secret) toast.success("Webhook secret regenerated, copy it now");
      else toast.success("Webhook settings saved");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingWh(false);
    }
  };

  const testWebhook = async () => {
    setTestingWh(true);
    try {
      const { data } = await api.post("/me/webhook/test");
      toast.success(`Test delivered (${data.attempts} attempt${data.attempts !== 1 ? "s" : ""})`);
      const dRes = await api.get("/me/webhook/deliveries", { params: { limit: 10 } });
      setDeliveries(dRes.data?.deliveries || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setTestingWh(false);
    }
  };

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div>;
  }

  const selectedEvents = webhook.events?.length
    ? webhook.events
    : WEBHOOK_EVENT_OPTIONS.map((e) => e.id);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="api-keys-card">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
              <KeyRound className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> API keys
            </h3>
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
              Server-to-server access with <code className="rounded bg-[var(--c-paper-2)] px-1 text-xs">X-API-Key</code> — like PandaDoc API keys or DocuSign integration keys.
            </p>
          </div>
          <div className="p-5">
          {newKey && (
            <div className="mt-3 rounded-lg border border-[var(--c-primary)] bg-[var(--status-sent-bg)] p-3 text-sm">
              <p className="font-semibold text-[var(--c-ink)]">Copy your new key (shown once):</p>
              <code className="mt-2 block break-all font-mono text-xs">{newKey}</code>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {keys.map((k) => (
              <div key={k.key_id} className="flex items-center justify-between rounded-lg border border-[var(--c-portal-border)] px-3 py-2 text-sm">
                <span><span className="font-mono text-xs">{k.prefix}…</span> · {k.label || "API key"}</span>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => revokeKey(k.key_id)}>Revoke</Button>
              </div>
            ))}
          </div>
          <Button className="mt-3 h-9 rounded-xl text-sm" onClick={createKey} disabled={creating} data-testid="create-api-key"
            style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1.5 h-4 w-4" />}
            Generate API key
          </Button>
          </div>
        </div>

        <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="webhook-card">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
              <Webhook className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Webhooks
            </h3>
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
              Real-time HTTPS POST with HMAC signing — compatible with Zapier, Make, and custom endpoints.
            </p>
          </div>
          <div className="space-y-3 p-5">
            <div>
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input id="wh-url" className="mt-1" placeholder="https://your-app.com/webhooks/civicsign"
                value={webhook.url || ""} onChange={(e) => setWebhook((w) => ({ ...w, url: e.target.value }))}
                data-testid="webhook-url" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!webhook.enabled}
                onChange={(e) => setWebhook((w) => ({ ...w, enabled: e.target.checked }))}
                data-testid="webhook-enabled" />
              Enable webhooks
            </label>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Subscribe to events</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                  <label key={ev.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--c-portal-border)] px-2.5 py-2 text-sm hover:bg-[var(--c-portal-muted)]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedEvents.includes(ev.id)}
                      onChange={() => toggleEvent(ev.id)}
                      data-testid={`webhook-event-${ev.id}`}
                    />
                    <span>
                      <span className="font-medium text-[var(--c-ink)]">{ev.label}</span>
                      <span className="block text-[11px] text-[var(--c-muted-fg)]">{ev.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {webhook.secret && (
              <div className="rounded-lg bg-[var(--c-paper-2)] p-3 text-xs font-mono break-all">
                Signing secret: {webhook.secret}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-[var(--c-muted-fg)]">
              Verify with <code className="rounded bg-[var(--c-paper-2)] px-1">X-CivicSign-Signature</code> (HMAC-SHA256 of raw body).
              Retries: 3 attempts over ~6 minutes.
            </p>
            <div className="flex flex-wrap gap-2 border-t border-[var(--c-border)] pt-4">
              <Button className="h-9 rounded-xl text-sm" onClick={() => saveWebhook(false)} disabled={savingWh} data-testid="webhook-save"
                style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                {savingWh ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Save
              </Button>
              <Button variant="outline" className="h-9 rounded-xl text-sm" onClick={() => saveWebhook(true)} disabled={savingWh}>
                Regenerate secret
              </Button>
              <Button variant="outline" className="h-9 rounded-xl text-sm" onClick={testWebhook} disabled={testingWh || !webhook.url}
                data-testid="webhook-test">
                {testingWh ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plug className="mr-1.5 h-4 w-4" />}
                Send test event
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="api-reference-card">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">REST API</h3>
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
              Poll envelope status or list activity from your CRM, iPaaS, or backend.
            </p>
          </div>
          <div className="space-y-2 p-5 text-xs">
            {(docs?.endpoints || [
              { method: "GET", path: "/api/v1/envelopes" },
              { method: "GET", path: "/api/v1/envelopes/{id}" },
              { method: "GET", path: "/api/v1/envelopes/{id}/status" },
            ]).map((ep) => (
              <div key={ep.path} className="flex items-center gap-2 rounded-lg bg-[var(--c-portal-muted)] px-3 py-2 font-mono">
                <span className="rounded bg-[var(--badge-teal-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--badge-teal-fg)]">{ep.method}</span>
                <span className="break-all text-[var(--c-ink)]">{API_ORIGIN}{ep.path}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-[var(--c-muted-fg)]">
              Zapier / Make: trigger on webhook <strong>envelope.completed</strong>, action via API key + status endpoint.
            </p>
          </div>
        </div>

        <div className="cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="webhook-deliveries-card">
          <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">Recent deliveries</h3>
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">Last webhook attempts — like DocuSign Connect logs or PandaDoc delivery history.</p>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto p-5">
            {deliveries.length === 0 ? (
              <p className="text-sm text-[var(--c-muted-fg)]">No deliveries yet. Save your URL and send a test event.</p>
            ) : deliveries.map((d) => (
              <div key={d.delivery_id} className="rounded-lg border border-[var(--c-portal-border)] px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[var(--c-ink)]">{d.event}</span>
                  <span className={d.success ? "text-[var(--c-success)]" : "text-[var(--c-danger)]"}>
                    {d.success ? `OK ${d.status_code || ""}` : `Failed · ${d.attempts}×`}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[var(--c-muted-fg)]">{d.created_at}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PRIVATE_BETA = process.env.REACT_APP_PRIVATE_BETA === "true";

function HelpTab() {
  const { user } = useAuth();
  const { features } = usePlan();
  const orgStaff = isOrgStaff(user);
  const faqs = orgStaff
    ? FAQS.filter((f) => f.q !== "How do I change or cancel my plan?")
    : FAQS;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        {PRIVATE_BETA && !orgStaff && (
          <div className="cs-portal-surface-card rounded-2xl border-l-4 px-5 py-4" style={{ borderLeftColor: "var(--c-primary)" }} data-testid="private-beta-help-banner">
            <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">Private beta</p>
            <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
              You&apos;re on an early access build. For billing, limits, or product questions, email{" "}
              <ContactEmailLink /> — we reply personally during beta hours (Mon–Fri).
            </p>
          </div>
        )}
        {orgStaff && (
          <div className="cs-portal-surface-card rounded-2xl border-l-4 px-5 py-4" style={{ borderLeftColor: "var(--c-primary)" }} data-testid="org-staff-help-banner">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 shrink-0" style={{ color: "var(--c-primary)" }} />
              <div>
                <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">Organisation member support</p>
                <p className="text-sm text-[var(--c-muted-fg)]">{ORG_STAFF_ESCALATION_NOTE}</p>
              </div>
            </div>
          </div>
        )}
        {features.priority_support && !orgStaff && (
          <div className="cs-portal-surface-card rounded-2xl border-l-4 px-5 py-4" style={{ borderLeftColor: "var(--c-primary)", background: "var(--status-sent-bg)" }} data-testid="priority-support-banner">
            <div className="flex items-center gap-3">
              <Headphones className="h-8 w-8" style={{ color: "var(--c-primary)" }} />
              <div>
                <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">Business priority support</p>
                <p className="text-sm text-[var(--c-muted-fg)]">
                  Your account has priority handling, we aim to respond within 4 business hours.
                  Email <ContactEmailLink /> with &ldquo;Business&rdquo; in the subject line.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="cs-portal-surface-card rounded-2xl p-5">
          <p
            style={{ fontFamily: "'Caveat', cursive", fontSize: "22px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Quick answers
          </p>
          <h3 className="mt-0.5 flex items-center gap-2 font-heading text-lg font-bold text-[var(--c-ink)]">
            <MessageCircleQuestion className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
            Frequently asked questions
          </h3>
          <MarketingFaqSection
            embedded
            faqs={faqs}
            testIdPrefix="help"
            defaultOpen={0}
            className="mt-4"
            renderAnswer={(item) => <RichTextWithContactEmail text={item.a} />}
          />
        </div>
      </div>
      <div className="space-y-5">
        {orgStaff ? (
          <div className="cs-portal-surface-card rounded-2xl p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
              <LifeBuoy className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
            </span>
            <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">Need help?</h3>
            <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
              Billing, limits, contracts and account changes are managed by your organisation admin.
              Ask them first — they can contact CivicSign on your organisation&apos;s behalf.
            </p>
            <Link to="/organisation" data-testid="help-org-admin-link">
              <Button className="mt-4 w-full rounded-xl" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                <Building2 className="mr-1.5 h-4 w-4" /> View your allowance
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="cs-portal-surface-card rounded-2xl p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
                <LifeBuoy className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
              </span>
              <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">Still need a human?</h3>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">Our team typically replies within one business day. Send us a message and we will get right back to you.</p>
              <Link to="/contact" data-testid="help-contact-link">
                <Button className="mt-4 w-full rounded-xl" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                  <Mail className="mr-1.5 h-4 w-4" /> Contact support
                </Button>
              </Link>
            </div>
            <div className="cs-portal-surface-card rounded-2xl p-6 text-sm">
              <p className="font-semibold text-[var(--c-ink)]">Email us directly</p>
              <ContactEmailLink className="mt-1 inline-block" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { has } = usePlan();
  const tab = params.get("tab") || "profile";
  const setTab = (t) => setParams(t === "profile" ? {} : { tab: t });
  const showBranding = has("custom_branding");
  const showIntegrations = has("api_webhooks");

  const settingsTabs = [
    { id: "profile", label: "Profile", short: "Profile", icon: User, testId: "settings-tab-profile" },
    { id: "subscription", label: "Subscription", short: "Plan", icon: CreditCard, testId: "settings-tab-subscription" },
    ...(showBranding ? [{ id: "branding", label: "Branding", short: "Brand", icon: Palette, testId: "settings-tab-branding" }] : []),
    ...(showIntegrations ? [{ id: "integrations", label: "Integrations", short: "API", icon: Plug, testId: "settings-tab-integrations" }] : []),
    { id: "help", label: "Help & Support", short: "Help", icon: LifeBuoy, testId: "settings-tab-help" },
  ];

  useEffect(() => {
    if ((tab === "branding" && !showBranding)
      || (tab === "integrations" && !showIntegrations)
      || tab === "org-team") {
      setParams({}, { replace: true });
    }
  }, [tab, showBranding, showIntegrations, setParams]);

  return (
    <AppShell>
      <div className="mb-5">
        <div
          style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
        >
          Your account
        </div>
        <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
          Settings
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
        <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
          Profile, billing, branding, integrations, and support — all in one place.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div
          className="mb-5 flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px] w-fit gap-0.5"
          data-testid="settings-tab-pills"
        >
          {settingsTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                data-testid={t.testId}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all sm:px-4"
                style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            );
          })}
        </div>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="subscription"><SubscriptionTab /></TabsContent>
        {showBranding && <TabsContent value="branding"><BrandingTab /></TabsContent>}
        {showIntegrations && <TabsContent value="integrations"><IntegrationsTab /></TabsContent>}
        <TabsContent value="help"><HelpTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
