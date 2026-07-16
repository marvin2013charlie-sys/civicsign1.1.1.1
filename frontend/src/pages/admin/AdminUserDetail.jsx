import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { getAppOrigin } from "@/lib/appOrigin";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, ShieldCheck, Loader2, KeyRound, Copy, Check, LogIn, Mail,
  MailWarning, MailCheck, Activity, FileText, CircleCheck, Send, Eye, AlertTriangle,
  UserCog, LifeBuoy,
} from "lucide-react";
import { AdminSurfaceCard, AdminSectionHeader } from "@/components/portal/AdminPrimitives";

const STAT_TILES = [
  { key: "total", label: "Total", icon: FileText },
  { key: "completed", label: "Completed", icon: CircleCheck },
  { key: "sent", label: "Sent", icon: Send },
  { key: "viewed", label: "Viewed", icon: Eye },
];

function DiagnosticRow({ ok, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-[var(--c-muted-fg)]">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--c-ink)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ok ? "var(--c-primary)" : "#D97706" }} />
        {value}
      </span>
    </div>
  );
}

function ImpersonateDialog({ open, onOpenChange, userId, targetName }) {
  const { startImpersonation } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [request, setRequest] = useState(null); // {request_id, otp, dev_mode, target_email}
  const [otp, setOtp] = useState("");

  const requestOtp = useCallback(async () => {
    setRequesting(true);
    setRequest(null);
    setOtp("");
    try {
      const { data } = await api.post(`/admin/users/${userId}/impersonate/request`);
      setRequest(data);
    } catch (err) {
      toast.error(formatApiError(err));
      onOpenChange(false);
    } finally {
      setRequesting(false);
    }
  }, [userId, onOpenChange]);

  useEffect(() => {
    if (open) requestOtp();
  }, [open, requestOtp]);

  const verify = async () => {
    if (otp.trim().length < 6) { toast.error("Enter the 6-digit code"); return; }
    setVerifying(true);
    try {
      const { data } = await api.post(`/admin/users/${userId}/impersonate/verify`, {
        request_id: request.request_id, otp: otp.trim(),
      });
      startImpersonation(data.user);
      // Hard-redirect so route guards re-evaluate against the impersonated user
      // (avoids the AdminProtected guard bouncing us back to the admin login).
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(formatApiError(err));
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="impersonate-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <LogIn className="h-5 w-5" style={{ color: "var(--c-primary)" }} /> Enter {targetName}'s account
          </DialogTitle>
          <DialogDescription>
            Entering a user's account requires their consent: a one-time code is emailed to
            the user, and they must read it back to you before you can proceed.
          </DialogDescription>
        </DialogHeader>

        {requesting ? (
          <div className="flex items-center justify-center py-8 text-[var(--c-muted-fg)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating code…
          </div>
        ) : request ? (
          <div className="space-y-4">
            {request.dev_mode ? (
              <div className="rounded-lg border border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] p-4 text-center" data-testid="impersonate-dev-otp">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Dev one-time code</p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-[var(--c-ink)]">{request.otp}</p>
                <p className="mt-1 text-xs text-[var(--c-muted-fg)]">Expires in 5 minutes (email delivery is off in this environment)</p>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--c-border)] bg-[var(--status-sent-bg)] p-4 text-sm text-[var(--c-ink)]" data-testid="impersonate-emailed-note">
                A 6-digit code has been emailed to <b>{request.target_email}</b>. Ask the user to
                read it to you. It expires in 5 minutes.
              </div>
            )}
            <div>
              <Label htmlFor="imp-otp">Enter verification code</Label>
              <Input
                id="imp-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                autoComplete="one-time-code"
                className="mt-1 text-center font-mono text-lg tracking-[0.3em]"
                data-testid="impersonate-otp-input"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="impersonate-cancel">Cancel</Button>
          <Button
            onClick={verify}
            disabled={verifying || requesting || !request || otp.trim().length < 6}
            data-testid="impersonate-verify-button"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            {verifying ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
            Verify & enter account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: actor } = useAuth();
  const isSuperAdmin = actor?.role === "admin";
  const canImpersonate = isSuperAdmin || (actor?.permissions || []).includes("impersonate");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetLink, setResetLink] = useState(null);
  const [resetEmailed, setResetEmailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [impOpen, setImpOpen] = useState(false);
  const [contractLimit, setContractLimit] = useState("");
  const [orgs, setOrgs] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setData(data);
    } catch (err) {
      toast.error(formatApiError(err));
      navigate("/admin/users");
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      try {
        const { data } = await api.get("/admin/organizations");
        setOrgs(data);
      } catch (err) {
        console.warn("AdminUserDetail: could not load organisations", err);
      }
    })();
  }, [isSuperAdmin]);

  useEffect(() => {
    const lim = data?.usage?.monthly_envelope_limit ?? data?.usage?.contract_limit;
    setContractLimit(lim != null ? String(lim) : "");
  }, [data?.usage?.monthly_envelope_limit, data?.usage?.contract_limit]);

  const patch = async (body) => {
    setSaving(true);
    try {
      await api.patch(`/admin/users/${userId}`, body);
      await load();
      toast.success("User updated");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    setResetting(true);
    try {
      const { data: res } = await api.post(`/admin/users/${userId}/send-reset`, {
        base_url: getAppOrigin(),
      });
      setResetLink(res.reset_link);
      setResetEmailed(res.emailed);
      toast.success(res.emailed ? "Reset link emailed to the user" : "Reset link generated");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResetting(false);
    }
  };

  const copyLink = async () => {
    const ok = await copyToClipboard(resetLink);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "\u2014");

  if (loading) {
    return (
      <div className="space-y-4" data-testid="admin-user-detail-loading">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { user, stats, usage, organization, diagnostics } = data;
  const inOrg = usage?.scope === "organization";
  const isAdmin = user.role === "admin";
  const isGoogle = (diagnostics.auth_provider || user.auth_provider) === "google";

  return (
    <div data-testid="admin-user-detail" className="space-y-6">
      <button
        onClick={() => navigate("/admin/users")}
        data-testid="admin-user-detail-back"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--c-muted-fg)] transition-colors hover:text-[var(--c-ink)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </button>

      {/* Header */}
      <AdminSurfaceCard className="flex flex-wrap items-center gap-4">
        <Avatar className="h-14 w-14"><AvatarFallback className="bg-[var(--c-primary)] text-base text-white">{(user.name || user.email).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-xl font-bold text-[var(--c-ink)]" data-testid="admin-user-detail-name">{user.name || "\u2014"}</h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-viewed-bg)", color: "var(--c-ink)" }}>
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Admin
              </span>
            )}
          </div>
          <p className="truncate text-sm text-[var(--c-muted-fg)]" data-testid="admin-user-detail-email">{user.email}</p>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
            {isGoogle ? "Signs in with Google" : "Email & password"} · Joined {fmt(user.created_at)}
          </p>
        </div>
      </AdminSurfaceCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account management — super-admin only */}
        {isSuperAdmin && (
        <AdminSurfaceCard flush className="overflow-hidden">
          <AdminSectionHeader
            title="Account management"
            subtitle="Adjust plan and access. Roles can't be changed here."
            icon={UserCog}
          />
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[var(--c-ink)]">Plan</Label>
                <p className="text-xs text-[var(--c-muted-fg)]">Subscription tier</p>
              </div>
              <Select value={user.plan} onValueChange={(v) => patch({ plan: v })} disabled={saving}>
                <SelectTrigger className="h-9 w-36" data-testid="admin-detail-plan-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-4">
              <div>
                <Label className="text-[var(--c-ink)]">Account active</Label>
                <p className="text-xs text-[var(--c-muted-fg)]">Disabled users can&apos;t sign in</p>
              </div>
              <Switch
                checked={user.active !== false}
                onCheckedChange={(v) => patch({ active: v })}
                disabled={saving}
                data-testid="admin-detail-active-toggle"
              />
            </div>

            <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-4">
              <div>
                <Label className="text-[var(--c-ink)]">Role</Label>
                <p className="text-xs text-[var(--c-muted-fg)]">Admin access is provisioned on the backend only</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: "var(--status-draft-bg)", color: "var(--c-ink)" }} data-testid="admin-detail-role-badge">
                {isAdmin && <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />}
                {user.role}
              </span>
            </div>

            <div className="border-t border-[var(--c-border)] pt-4" data-testid="admin-org-assignment">
              <Label className="text-[var(--c-ink)]">Organisation pool</Label>
              <p className="text-xs text-[var(--c-muted-fg)]">
                Assign to a shared bucket. All team sends count against the org limit, not this login alone.
              </p>
              <Select
                value={user.org_id || "__none__"}
                onValueChange={(v) => patch({ org_id: v === "__none__" ? "" : v })}
                disabled={saving}
              >
                <SelectTrigger className="mt-2 h-9 w-full" data-testid="admin-detail-org-select">
                  <SelectValue placeholder="No organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No organisation (per-user quota)</SelectItem>
                  {orgs.map((o) => (
                    <SelectItem key={o.org_id} value={o.org_id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inOrg && usage.organization && (
                <p className="mt-2 rounded-lg bg-[var(--c-paper-2)] px-3 py-2 text-xs text-[var(--c-muted-fg)]">
                  Pool: {usage.used.toLocaleString()} / {usage.unlimited ? "∞" : usage.limit.toLocaleString()} used by {usage.organization.member_count} member(s).
                  This user contributed {usage.personal_used?.toLocaleString() ?? 0} this month.
                </p>
              )}
            </div>

            {user.plan === "business" && usage && !inOrg && (
              <div className="space-y-4 border-t border-[var(--c-border)] pt-4" data-testid="admin-quota-controls">
                <div>
                  <Label className="text-[var(--c-ink)]">Document usage · {usage.month}</Label>
                  <p className="mt-1 text-sm text-[var(--c-ink)]">
                    {usage.unlimited ? `${usage.used.toLocaleString()} sent (enterprise unlimited)` : (
                      <>{usage.used.toLocaleString()} / {usage.limit.toLocaleString()}</>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">{usage.quota_note}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[var(--c-ink)]">Enterprise unlimited</Label>
                    <p className="text-xs text-[var(--c-muted-fg)]">Signed contract only, no monthly cap</p>
                  </div>
                  <Switch
                    checked={!!usage.enterprise_unlimited}
                    onCheckedChange={(v) => patch({ enterprise_unlimited: v })}
                    disabled={saving}
                    data-testid="admin-enterprise-unlimited"
                  />
                </div>
                {!usage.enterprise_unlimited && (
                  <div>
                    <Label htmlFor="contract-limit">Contract monthly limit</Label>
                    <p className="text-xs text-[var(--c-muted-fg)]">Leave empty for default fair use (10,000/mo)</p>
                    <div className="mt-1 flex gap-2">
                      <Input id="contract-limit" type="number" min="1" placeholder="e.g. 50000"
                        value={contractLimit} onChange={(e) => setContractLimit(e.target.value)}
                        data-testid="admin-contract-limit" />
                      <Button variant="outline" disabled={saving} onClick={() => {
                        const n = parseInt(contractLimit, 10);
                        patch({ monthly_envelope_limit: Number.isFinite(n) && n > 0 ? n : 0 });
                      }}>Save limit</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </AdminSurfaceCard>
        )}

        {/* Diagnostics */}
        <AdminSurfaceCard flush className="overflow-hidden" testId="admin-detail-diagnostics">
          <AdminSectionHeader
            title="Diagnostics"
            subtitle="Account health & delivery status."
            icon={Activity}
          />
          <div className="divide-y divide-[var(--c-border)] px-5">
            <DiagnosticRow ok={diagnostics.account_active} label="Account status" value={diagnostics.account_active ? "Active" : "Disabled"} />
            <DiagnosticRow ok label="Sign-in method" value={isGoogle ? "Google" : "Password"} />
            <DiagnosticRow ok={diagnostics.email_configured} label="Email delivery" value={diagnostics.email_configured ? "Configured" : "Skip-mode"} />
            <DiagnosticRow ok={!!diagnostics.sender_email} label="Sender address" value={diagnostics.sender_email || "Not set"} />
          </div>

          <div
            className="mx-5 mb-5 mt-3 flex items-start gap-2 rounded-lg p-3 text-xs"
            style={{ background: diagnostics.email_configured ? "var(--status-sent-bg)" : "#FEF3C7", color: "#78350F" }}
            data-testid="admin-detail-email-note"
          >
            {diagnostics.email_configured
              ? <MailCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
              : <MailWarning className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#D97706" }} />}
            <span style={{ color: diagnostics.email_configured ? "var(--c-ink)" : "#78350F" }}>{diagnostics.email_note}</span>
          </div>
        </AdminSurfaceCard>

        {/* Activity — super-admin sees document counts only; titles are never shown */}
        {isSuperAdmin ? (
        <AdminSurfaceCard flush className="overflow-hidden">
          <AdminSectionHeader
            title="Activity"
            subtitle="Aggregate document counts only — titles and contents stay private to the account owner."
            icon={FileText}
          />
          <div className="grid grid-cols-4 gap-3 p-5">
            {STAT_TILES.map((t) => (
              <div key={t.key} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3 text-center">
                <t.icon className="mx-auto h-4 w-4 text-[var(--c-muted-fg)]" />
                <p className="mt-1 font-heading text-xl font-bold text-[var(--c-ink)]">{stats[t.key] ?? 0}</p>
                <p className="text-[11px] text-[var(--c-muted-fg)]">{t.label}</p>
              </div>
            ))}
          </div>
          <p className="mx-5 mb-5 mt-4 rounded-lg bg-[var(--c-paper-2)] px-3 py-2 text-xs text-[var(--c-muted-fg)]">
            Templates saved: <span className="font-semibold text-[var(--c-ink)]">{stats.templates ?? 0}</span>
          </p>
        </AdminSurfaceCard>
        ) : (
        <AdminSurfaceCard flush className="overflow-hidden">
          <AdminSectionHeader title="Activity" icon={FileText} />
          <p className="p-5 text-sm text-[var(--c-muted-fg)]">
            Document counts and titles are restricted to super-admins. Templates on file:{" "}
            <span className="font-semibold text-[var(--c-ink)]">{stats.templates ?? 0}</span>.
          </p>
        </AdminSurfaceCard>
        )}

        {/* Support actions — super-admin, or staff granted the impersonate permission */}
        {canImpersonate && (
        <AdminSurfaceCard flush className="overflow-hidden" testId="admin-detail-support">
          <AdminSectionHeader
            title="Support actions"
            subtitle="Help this user recover access or troubleshoot their account."
            icon={LifeBuoy}
          />
          <div className="space-y-3 p-5">
          {/* Password reset — super-admin only */}
          {isSuperAdmin && (
          <div className="rounded-lg border border-[var(--c-border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                <span className="text-sm font-semibold text-[var(--c-ink)]">Password reset link</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={sendReset}
                disabled={resetting || isGoogle}
                data-testid="admin-detail-send-reset"
              >
                {resetting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
                Generate link
              </Button>
            </div>
            {isGoogle && (
              <p className="mt-2 text-xs text-[var(--c-muted-fg)]">This account signs in with Google, so there is no password to reset.</p>
            )}
            {resetLink && (
              <div className="mt-3" data-testid="admin-detail-reset-result">
                <p className="text-xs text-[var(--c-muted-fg)]">
                  {resetEmailed ? "Emailed to the user. You can also share this link directly:" : "Email is in skip-mode. Copy this link and share it with the user:"}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input readOnly value={resetLink} className="font-mono text-xs" data-testid="admin-detail-reset-link" onFocus={(e) => e.target.select()} />
                  <Button size="sm" variant="outline" onClick={copyLink} data-testid="admin-detail-copy-reset">
                    {copied ? <Check className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Impersonation */}
          <div className="rounded-lg border border-[var(--c-border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                <span className="text-sm font-semibold text-[var(--c-ink)]">Enter user account</span>
              </div>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => setImpOpen(true)}
                disabled={isAdmin || user.active === false}
                data-testid="admin-detail-impersonate"
                style={isAdmin || user.active === false ? {} : { background: "var(--c-ink-solid)", color: "#fff" }}
              >
                <LogIn className="mr-1.5 h-4 w-4" /> Impersonate
              </Button>
            </div>
            {isAdmin ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--c-muted-fg)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Admin accounts cannot be impersonated.
              </p>
            ) : user.active === false ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--c-muted-fg)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Reactivate this account before entering it.
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--c-muted-fg)]">
                Securely view the app as this user (OTP-verified) to reproduce and troubleshoot issues.
              </p>
            )}
          </div>
          </div>
        </AdminSurfaceCard>
        )}
      </div>

      <ImpersonateDialog open={impOpen} onOpenChange={setImpOpen} userId={userId} targetName={user.name || user.email} />
    </div>
  );
}
