import React, { useCallback, useEffect, useState } from "react";
import { usePoll, POLL_FAST_MS } from "@/hooks/usePoll";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { formatOrgRole } from "@/lib/orgLabels";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  UserPlus, Users, KeyRound, PauseCircle, PlayCircle, Eye, EyeOff, Copy, Check, Loader2, Gauge,
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

/**
 * @param {object} [props]
 * @param {Array|null} [props.members] When provided (Organisation portal), use parent data — no duplicate polling.
 * @param {number} [props.orgPerSeat]
 * @param {() => Promise<void>} [props.onReload] Refresh callback after mutations (parent reloads /org/portal).
 */
export default function OrgTeamTab({ members: membersProp = null, orgPerSeat: orgPerSeatProp, onReload } = {}) {
  const embedded = membersProp != null;
  const [members, setMembers] = useState(membersProp ?? []);
  const [loading, setLoading] = useState(!embedded);
  const [createOpen, setCreateOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [resetShowPw, setResetShowPw] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [holdTarget, setHoldTarget] = useState(null);
  const [holdSaving, setHoldSaving] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState(null);
  const [quotaValue, setQuotaValue] = useState("");
  const [quotaUseDefault, setQuotaUseDefault] = useState(false);
  const [quotaSaving, setQuotaSaving] = useState(false);
  const orgPerSeat = orgPerSeatProp
    ?? members.find((m) => m.org_per_seat_limit)?.org_per_seat_limit
    ?? 500;

  useEffect(() => {
    if (embedded) setMembers(membersProp);
  }, [embedded, membersProp]);

  const load = useCallback(async (silent = false) => {
    if (embedded) {
      if (onReload) await onReload({ silent });
      return;
    }
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/org/members", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      setMembers(data);
    } catch (err) {
      if (!silent) toast.error(formatApiError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [embedded, onReload]);

  useEffect(() => {
    if (!embedded) load();
  }, [embedded, load]);

  const dialogOpen = createOpen || !!resetTarget || !!holdTarget || !!quotaTarget
    || !!resetSuccess || saving || resetSaving || holdSaving || quotaSaving;

  usePoll(() => load(true), POLL_FAST_MS, { enabled: !embedded && !dialogOpen });

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Name, email and an 8+ character password are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/org/members", form);
      toast.success(`Account created for ${form.email}. Share the login details securely.`);
      setForm({ name: "", email: "", password: "" });
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
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
        : `Set ${quotaTarget.email} to ${parseInt(quotaValue, 10).toLocaleString()} documents/month`);
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

  return (
    <div className="space-y-5" data-testid="org-team-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Organisation team</h2>
          <p className="mt-0.5 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Create logins for colleagues and set each member&apos;s monthly document allowance (up to {orgPerSeat.toLocaleString()} per seat). Contract pricing is agreed with your account manager.
          </p>
        </div>
        <Button onClick={() => { setForm((f) => ({ ...f, password: f.password || generatePw() })); setCreateOpen(true); }}
          data-testid="org-team-add" style={{ background: "var(--c-primary)", color: "#fff" }}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Add team member
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-[var(--c-muted-fg)]" />
            <p className="mt-3 text-sm text-[var(--c-muted-fg)]">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
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
                    docs this month{m.seat_limit_custom ? " · custom limit" : ""}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="org-team-create-dialog">
          <DialogHeader>
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>
              Create a login for someone in your organisation. Share the email and temporary password securely — they can change it in Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="org-member-name">Full name</Label>
              <Input id="org-member-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="org-member-email">Work email</Label>
              <Input id="org-member-email" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} />
            </div>
            <div>
              <Label htmlFor="org-member-password">Temporary password</Label>
              <div className="relative">
                <Input id="org-member-password" type={showPw ? "text" : "password"} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-2 p-1 text-[var(--c-muted-fg)]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs"
                onClick={() => setForm({ ...form, password: generatePw() })}>
                Generate secure password
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving} style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.email}</DialogTitle>
            <DialogDescription>Set a new temporary password. Share it securely with the team member.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input type={resetShowPw ? "text" : "password"} value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
            <button type="button" onClick={() => setResetShowPw(!resetShowPw)} className="absolute right-2 top-2 p-1 text-[var(--c-muted-fg)]">
              {resetShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
            <DialogDescription>Copy these details and share them with the team member.</DialogDescription>
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
            <DialogTitle>Monthly limit for {quotaTarget?.email}</DialogTitle>
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
              Use organisation default ({orgPerSeat.toLocaleString()} / month)
            </label>
            {!quotaUseDefault && (
              <div>
                <Label htmlFor="org-member-quota">Documents per month</Label>
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