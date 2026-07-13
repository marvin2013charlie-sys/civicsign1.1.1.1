import React, { useCallback, useEffect, useState } from "react";
import { usePoll, POLL_FAST_MS } from "@/hooks/usePoll";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
import { formatOrgRole } from "@/lib/orgLabels";
import { copyToClipboard } from "@/lib/clipboard";
import {
  ORG_MEMBER_FEATURE_OPTIONS,
  defaultOrgMemberFeatureFlags,
} from "@/lib/orgMemberFeatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  UserPlus, Users, KeyRound, PauseCircle, PlayCircle, Copy, Check, Loader2, Gauge,
  Mail, RotateCw, XCircle,
} from "lucide-react";

function generatePw() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = "abcdefghijkmnpqrstuvwxyz";
  const n = "23456789";
  const s = "!@#$%^&*";
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  let out = pick(A) + pick(a) + pick(n) + pick(s);
  const all = A + a + n + s;
  for (let i = 0; i < 8; i++) out += pick(all);
  return out.split("").sort(() => Math.random() - 0.5).join("");
}

const fmtDate = (iso) => (iso
  ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  : "—");

const emptyInviteForm = () => ({
  email: "",
  name: "",
  quotaUseDefault: true,
  quotaValue: "",
  featureFlags: defaultOrgMemberFeatureFlags(),
});

/**
 * @param {object} [props]
 * @param {Array|null} [props.members] When provided (Organisation portal), use parent data — no duplicate polling.
 * @param {Array|null} [props.pendingInvites] Pending email invitations (owner view).
 * @param {number} [props.orgPerSeat]
 * @param {() => Promise<void>} [props.onReload] Refresh callback after mutations (parent reloads /org/portal).
 */
export default function OrgTeamTab({
  members: membersProp = null,
  pendingInvites: pendingInvitesProp = null,
  orgPerSeat: orgPerSeatProp,
  onReload,
} = {}) {
  const embedded = membersProp != null;
  const [members, setMembers] = useState(membersProp ?? []);
  const [invites, setInvites] = useState(pendingInvitesProp ?? []);
  const [loading, setLoading] = useState(!embedded);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyInviteForm);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [holdTarget, setHoldTarget] = useState(null);
  const [holdSaving, setHoldSaving] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState(null);
  const [quotaValue, setQuotaValue] = useState("");
  const [quotaUseDefault, setQuotaUseDefault] = useState(false);
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeSaving, setRevokeSaving] = useState(false);
  const [resendId, setResendId] = useState(null);
  const orgPerSeat = orgPerSeatProp
    ?? members.find((m) => m.org_per_seat_limit)?.org_per_seat_limit
    ?? 500;

  useEffect(() => {
    if (embedded) {
      setMembers(membersProp);
      setInvites(pendingInvitesProp ?? []);
    }
  }, [embedded, membersProp, pendingInvitesProp]);

  const load = useCallback(async (silent = false) => {
    if (embedded) {
      if (onReload) await onReload({ silent });
      return;
    }
    if (!silent) setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.get("/org/members", { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        api.get("/org/invites", { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }),
      ]);
      setMembers(membersRes.data);
      setInvites(invitesRes.data);
    } catch (err) {
      if (!silent) toast.error(formatApiError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [embedded, onReload]);

  useEffect(() => {
    if (!embedded) load();
  }, [embedded, load]);

  const dialogOpen = inviteOpen || !!resetTarget || !!holdTarget || !!quotaTarget
    || !!resetSuccess || !!revokeTarget || saving || resetSaving || holdSaving || quotaSaving || revokeSaving;

  usePoll(() => load(true), POLL_FAST_MS, { enabled: !embedded && !dialogOpen });

  const sendInvite = async () => {
    if (!form.email.trim()) {
      toast.error("Work email is required");
      return;
    }
    if (!form.quotaUseDefault) {
      const n = parseInt(form.quotaValue, 10);
      if (!Number.isFinite(n) || n < 1) {
        toast.error("Enter a valid monthly document limit");
        return;
      }
      if (n > orgPerSeat) {
        toast.error(`Cannot exceed your organisation allowance of ${orgPerSeat.toLocaleString()} per seat`);
        return;
      }
    }
    setSaving(true);
    try {
      await api.post("/org/invites", {
        email: form.email.trim().toLowerCase(),
        name: form.name.trim() || undefined,
        monthly_seat_limit: form.quotaUseDefault ? null : parseInt(form.quotaValue, 10),
        feature_flags: form.featureFlags,
        base_url: getAppOrigin(),
      });
      toast.success(`Invitation sent to ${form.email}`);
      setForm(emptyInviteForm());
      setInviteOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const resendInvite = async (invite) => {
    setResendId(invite.invite_id);
    try {
      await api.post(`/org/invites/${invite.invite_id}/resend`);
      toast.success(`Invitation resent to ${invite.email}`);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResendId(null);
    }
  };

  const revokeInvite = async () => {
    if (!revokeTarget) return;
    setRevokeSaving(true);
    try {
      await api.delete(`/org/invites/${revokeTarget.invite_id}`);
      toast.success(`Revoked invitation for ${revokeTarget.email}`);
      setRevokeTarget(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setRevokeSaving(false);
    }
  };

  const toggleHold = async (member) => {
    setHoldSaving(true);
    try {
      await api.patch(`/org/members/${member.user_id}/status`, { active: member.active === false });
      toast.success(member.active === false ? "Access resumed" : "Access paused");
      setHoldTarget(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setHoldSaving(false);
    }
  };

  const openQuota = (member) => {
    const custom = member.seat_limit_custom && member.monthly_seat_limit;
    setQuotaTarget(member);
    setQuotaUseDefault(!custom);
    setQuotaValue(custom ? String(member.monthly_seat_limit) : String(member.seat_limit ?? orgPerSeat));
  };

  const submitQuota = async () => {
    if (!quotaUseDefault) {
      const n = parseInt(quotaValue, 10);
      if (!Number.isFinite(n) || n < 1) {
        toast.error("Enter a valid monthly document limit");
        return;
      }
      if (n > orgPerSeat) {
        toast.error(`Cannot exceed your organisation allowance of ${orgPerSeat.toLocaleString()} per seat`);
        return;
      }
    }
    setQuotaSaving(true);
    try {
      await api.patch(`/org/members/${quotaTarget.user_id}/quota`, {
        monthly_seat_limit: quotaUseDefault ? null : parseInt(quotaValue, 10),
      });
      toast.success(quotaUseDefault
        ? `Reset ${quotaTarget.email} to the organisation default (${orgPerSeat.toLocaleString()}/month)`
        : `Set ${quotaTarget.email} to ${parseInt(quotaValue, 10).toLocaleString()} documents per billing period`);
      setQuotaTarget(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setQuotaSaving(false);
    }
  };

  const submitReset = async () => {
    if (resetPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetSaving(true);
    try {
      await api.post(`/org/members/${resetTarget.user_id}/reset-password`, { password: resetPw });
      setResetSuccess({ email: resetTarget.email, password: resetPw });
      setResetTarget(null);
      setResetPw("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResetSaving(false);
    }
  };

  const toggleFeature = (key) => {
    setForm((f) => ({
      ...f,
      featureFlags: { ...f.featureFlags, [key]: !f.featureFlags[key] },
    }));
  };

  const empty = !loading && members.length === 0 && invites.length === 0;

  return (
    <div className="space-y-5" data-testid="org-team-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Organisation team</h2>
          <p className="mt-0.5 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Invite colleagues by email — they choose their own password. Set each member&apos;s monthly
            document allowance (up to {orgPerSeat.toLocaleString()} per seat) and feature access when inviting.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm((f) => ({
              ...emptyInviteForm(),
              quotaValue: String(orgPerSeat),
              featureFlags: f.featureFlags,
            }));
            setInviteOpen(true);
          }}
          data-testid="org-team-invite"
          style={{ background: "var(--c-primary)", color: "#fff" }}
        >
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite team member
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : empty ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-[var(--c-muted-fg)]" />
            <p className="mt-3 text-sm text-[var(--c-muted-fg)]">No team members yet. Send your first invitation.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {invites.map((inv) => (
              <div key={inv.invite_id} data-testid="org-team-invite-row" className="flex flex-wrap items-center gap-3 px-5 py-4 bg-[var(--c-paper-2)]/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--c-ink)]">{inv.name || inv.email}</p>
                  <p className="text-xs text-[var(--c-muted-fg)]">{inv.email}</p>
                </div>
                <Badge variant="outline" className="border-dashed border-[var(--c-primary)]/40 text-[var(--c-primary)]">
                  <Mail className="mr-1 h-3 w-3" /> Invited
                </Badge>
                <div className="text-right text-sm">
                  <p className="font-medium text-[var(--c-ink)]">
                    {(inv.monthly_seat_limit ?? orgPerSeat).toLocaleString()} / billing period
                  </p>
                  <p className="text-xs text-[var(--c-muted-fg)]">pending acceptance</p>
                </div>
                <span className="text-sm text-[var(--c-muted-fg)]">{fmtDate(inv.created_at)}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Resend invitation"
                    disabled={resendId === inv.invite_id}
                    onClick={() => resendInvite(inv)}
                  >
                    {resendId === inv.invite_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RotateCw className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Revoke invitation"
                    onClick={() => setRevokeTarget(inv)}
                  >
                    <XCircle className="h-4 w-4 text-amber-600" />
                  </Button>
                </div>
              </div>
            ))}
            {members.map((m) => (
              <div key={m.user_id} data-testid="org-team-row" className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--c-ink)]">{m.name || m.email}</p>
                  <p className="text-xs text-[var(--c-muted-fg)]">{m.email}</p>
                </div>
                <Badge variant="outline">{formatOrgRole(m.org_role)}</Badge>
                <div className="text-right text-sm">
                  <p className="font-medium text-[var(--c-ink)]">
                    {(m.seat_used ?? 0).toLocaleString()} / {(m.seat_limit ?? orgPerSeat).toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--c-muted-fg)]">
                    docs this billing period{m.seat_limit_custom ? " · custom limit" : ""}
                  </p>
                </div>
                <span className="text-sm text-[var(--c-muted-fg)]">{fmtDate(m.created_at)}</span>
                {m.org_role !== "owner" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Set monthly limit"
                      data-testid="org-team-quota"
                      onClick={() => openQuota(m)}>
                      <Gauge className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset password"
                      onClick={() => { setResetTarget(m); setResetPw(generatePw()); }}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      title={m.active === false ? "Resume access" : "Pause access"}
                      onClick={() => setHoldTarget(m)}>
                      {m.active === false ? <PlayCircle className="h-4 w-4 text-emerald-600" /> : <PauseCircle className="h-4 w-4 text-amber-600" />}
                    </Button>
                  </div>
                )}
                {m.active === false && m.org_role !== "owner" && (
                  <Badge variant="outline" className="border-amber-200 text-amber-700">Paused</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent data-testid="org-team-invite-dialog" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              We&apos;ll email them a secure link to join your organisation and set their own password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="org-invite-email">Work email</Label>
              <Input
                id="org-invite-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })}
                placeholder="colleague@company.co.uk"
                data-testid="org-invite-email"
              />
            </div>
            <div>
              <Label htmlFor="org-invite-name">Name (optional)</Label>
              <Input
                id="org-invite-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Shown in the invitation email"
              />
            </div>
            <div className="space-y-2 rounded-lg border border-[var(--c-border)] p-3">
              <p className="text-sm font-semibold text-[var(--c-ink)]">Document limit per billing period</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.quotaUseDefault}
                  onChange={(e) => setForm({ ...form, quotaUseDefault: e.target.checked })}
                  className="rounded border-[var(--c-border)]"
                />
                Use organisation default ({orgPerSeat.toLocaleString()} / billing period)
              </label>
              {!form.quotaUseDefault && (
                <div>
                  <Label htmlFor="org-invite-quota">Documents per billing period</Label>
                  <Input
                    id="org-invite-quota"
                    type="number"
                    min={1}
                    max={orgPerSeat}
                    value={form.quotaValue}
                    onChange={(e) => setForm({ ...form, quotaValue: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2 rounded-lg border border-[var(--c-border)] p-3">
              <p className="text-sm font-semibold text-[var(--c-ink)]">Feature access</p>
              <p className="text-xs text-[var(--c-muted-fg)]">
                Choose what this member can use. Organisation admins always have full access including API keys.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ORG_MEMBER_FEATURE_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.featureFlags[opt.key]}
                      onChange={() => toggleFeature(opt.key)}
                      className="rounded border-[var(--c-border)]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={saving} style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation</DialogTitle>
            <DialogDescription>
              Cancel the pending invitation for {revokeTarget?.email}. They will no longer be able to join using that link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Keep invitation</Button>
            <Button onClick={revokeInvite} disabled={revokeSaving}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.email}</DialogTitle>
            <DialogDescription>Emergency fallback — prefer invitations so members manage their own passwords.</DialogDescription>
          </DialogHeader>
          <Input type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={submitReset} disabled={resetSaving}>Save password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetSuccess} onOpenChange={(open) => { if (!open) setResetSuccess(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password updated</DialogTitle>
            <DialogDescription>Copy these details and share them securely with the team member.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3 text-sm font-mono">
            <p>Email: {resetSuccess?.email}</p>
            <p>Password: {resetSuccess?.password}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={async () => {
              const ok = await copyToClipboard(`Email: ${resetSuccess.email}\nPassword: ${resetSuccess.password}`);
              if (ok) { setResetCopied(true); setTimeout(() => setResetCopied(false), 2000); }
            }}>
              {resetCopied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              Copy credentials
            </Button>
            <Button onClick={() => setResetSuccess(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quotaTarget} onOpenChange={(open) => { if (!open) setQuotaTarget(null); }}>
        <DialogContent data-testid="org-team-quota-dialog">
          <DialogHeader>
            <DialogTitle>Billing-period limit for {quotaTarget?.email}</DialogTitle>
            <DialogDescription>
              Set how many documents this team member can send each billing period. Cannot exceed your organisation allowance of {orgPerSeat.toLocaleString()} per seat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={quotaUseDefault}
                onChange={(e) => setQuotaUseDefault(e.target.checked)}
                className="rounded border-[var(--c-border)]"
              />
              Use organisation default ({orgPerSeat.toLocaleString()} / billing period)
            </label>
            {!quotaUseDefault && (
              <div>
                <Label htmlFor="org-member-quota">Documents per billing period</Label>
                <Input
                  id="org-member-quota"
                  type="number"
                  min={1}
                  max={orgPerSeat}
                  value={quotaValue}
                  onChange={(e) => setQuotaValue(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotaTarget(null)}>Cancel</Button>
            <Button onClick={submitQuota} disabled={quotaSaving} style={{ background: "var(--c-primary)", color: "#fff" }}>
              {quotaSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!holdTarget} onOpenChange={(open) => { if (!open) setHoldTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{holdTarget?.active === false ? "Resume access" : "Pause access"}</DialogTitle>
            <DialogDescription>
              {holdTarget?.active === false
                ? `Allow ${holdTarget?.email} to sign in again.`
                : `Prevent ${holdTarget?.email} from signing in until you resume access.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldTarget(null)}>Cancel</Button>
            <Button onClick={() => toggleHold(holdTarget)} disabled={holdSaving}>
              {holdSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}