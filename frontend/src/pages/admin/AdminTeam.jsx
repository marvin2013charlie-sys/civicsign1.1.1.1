import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminPageIntro, AdminStatCard, AdminSurfaceCard, AdminEmptyState, AdminStaffBadge,
} from "@/components/portal/AdminPrimitives";
import {
  UserPlus, Trash2, ShieldCheck, Users as UsersIcon, Eye, EyeOff, Crown,
  KeyRound, PauseCircle, PlayCircle, Copy, Check,
} from "lucide-react";

const PERMS = [
  { value: "blog",        label: "Manage blog posts",     desc: "Create, edit, publish and delete posts on /blog." },
  { value: "careers",     label: "Manage careers",        desc: "Publish job openings on /careers and review applications." },
  { value: "contacts",    label: "Read contact inbox",    desc: "View customer enquiries from /contact." },
  { value: "users-read",  label: "Read user list",        desc: "Browse user accounts (read-only, no edits, no impersonation)." },

  { value: "billing",     label: "View billing",          desc: "See transactions and billing metrics. Refunds stay super-admin only." },
  { value: "audit",       label: "View audit log",        desc: "Read the admin action history (impersonations, resets, refunds)." },
  { value: "impersonate", label: "Enter user accounts",   desc: "Support workflow gated by user consent: a one-time code is emailed to the user, who must share it before access is granted." },
];

export default function AdminTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [resetShowPw, setResetShowPw] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null); // { email, password }
  const [resetCopied, setResetCopied] = useState(false);
  const [holdTarget, setHoldTarget] = useState(null);
  const [holdSaving, setHoldSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", permissions: ["blog"] });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/staff");
      setMembers(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePerm = (p) => {
    setForm((f) => {
      const has = f.permissions.includes(p);
      return { ...f, permissions: has ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] };
    });
  };

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Name, email and an 8+ char password are required");
      return;
    }
    if (form.permissions.length === 0) {
      toast.error("Pick at least one permission");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/staff", form);
      toast.success(`Staff account created for ${form.email}`);
      setForm({ name: "", email: "", password: "", permissions: ["blog"] });
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (user_id) => {
    try {
      await api.delete(`/admin/staff/${user_id}`);
      toast.success("Staff member removed");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const generatePw = () => {
    // 12 chars, mix of letters, digits and symbols (no ambiguous chars).
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const a = "abcdefghijkmnpqrstuvwxyz";
    const n = "23456789";
    const s = "!@#$%^&*";
    const pick = (set) => set[Math.floor(Math.random() * set.length)];
    let out = pick(A) + pick(a) + pick(n) + pick(s);
    const all = A + a + n + s;
    for (let i = 0; i < 8; i++) out += pick(all);
    return out.split("").sort(() => Math.random() - 0.5).join("");
  };

  const submitReset = async () => {
    if (resetPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetSaving(true);
    try {
      await api.post(`/admin/staff/${resetTarget.user_id}/reset-password`, { password: resetPw });
      setResetSuccess({ email: resetTarget.email, password: resetPw });
      toast.success(`Password updated for ${resetTarget.email}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResetSaving(false);
    }
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetPw("");
    setResetShowPw(false);
    setResetSuccess(null);
    setResetCopied(false);
  };

  const copyResetPw = async () => {
    const ok = await copyToClipboard(resetSuccess.password);
    if (ok) {
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 1800);
    } else {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  const toggleHold = async () => {
    if (!holdTarget) return;
    setHoldSaving(true);
    const nextActive = holdTarget.active === false; // currently held -> resume
    try {
      await api.patch(`/admin/staff/${holdTarget.user_id}/status`, { active: nextActive });
      toast.success(nextActive ? `Access resumed for ${holdTarget.email}` : `Access held for ${holdTarget.email}`);
      setHoldTarget(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setHoldSaving(false);
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
  const adminCount = members.filter((m) => m.role === "admin").length;
  const staffCount = members.filter((m) => m.role === "staff").length;

  return (
    <div data-testid="admin-team">
      <AdminPageIntro
        caveat="Access control"
        title="Internal Team"
        subtitle="Super-admins and staff members with scoped permissions."
        actions={(
          <>
            <AdminStaffBadge label="Super-admin only" />
            <Button onClick={() => setCreateOpen(true)} data-testid="admin-team-create-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Add staff
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <AdminStatCard
          icon={Crown}
          label="Super admins"
          value={loading ? "…" : adminCount}
          tone="warning"
          testId="admin-team-admin-count"
        />
        <AdminStatCard
          icon={ShieldCheck}
          label="Staff members"
          value={loading ? "…" : staffCount}
          tone="teal"
          testId="admin-team-staff-count"
        />
      </div>

      <AdminSurfaceCard className="mt-4 overflow-hidden" flush testId="admin-team-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : members.length === 0 ? (
          <AdminEmptyState
            icon={UsersIcon}
            title="No team members yet"
            description="Add staff accounts with scoped permissions for blog, careers, contacts and more."
            action={(
              <Button onClick={() => setCreateOpen(true)} data-testid="admin-team-empty-create" style={{ background: "var(--c-primary)", color: "#fff" }}>
                <UserPlus className="mr-1.5 h-4 w-4" /> Add staff
              </Button>
            )}
          />
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] sm:grid">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-1" />
            </div>
            {members.map((m) => (
              <div key={m.user_id} data-testid="admin-team-row"
                className="grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-12">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--c-paper-2)] font-heading text-sm font-bold uppercase text-[var(--c-ink)]">
                    {(m.name || m.email).slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{m.name || "Unnamed"}</p>
                    {m.permissions?.length > 0 && (
                      <p className="truncate text-[11px] text-[var(--c-muted-fg)]">
                        {m.permissions.join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-3 truncate text-sm text-[var(--c-muted-fg)]">{m.email}</div>
                <div className="col-span-2">
                  {m.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      <Crown className="h-3 w-3" /> Super admin
                    </span>
                  ) : m.active === false ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                      <PauseCircle className="h-3 w-3" /> On hold
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Staff
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{fmtDate(m.created_at)}</div>
                <div className="col-span-1 flex items-center justify-end gap-0.5">
                  {m.role !== "admin" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setResetTarget(m); setResetPw(generatePw()); }}
                        title="Reset password"
                        data-testid="admin-team-reset"
                        className="h-8 w-8"
                      >
                        <KeyRound className="h-4 w-4 text-[var(--c-ink)]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setHoldTarget(m)}
                        title={m.active === false ? "Resume access" : "Hold access"}
                        data-testid={m.active === false ? "admin-team-resume" : "admin-team-hold"}
                        className="h-8 w-8"
                      >
                        {m.active === false ? (
                          <PlayCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <PauseCircle className="h-4 w-4 text-amber-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(m)}
                        title="Revoke access (delete)"
                        data-testid="admin-team-remove"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSurfaceCard>

      {/* Create staff dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="admin-team-create-dialog">
          <DialogHeader>
            <DialogTitle>Add a new staff member</DialogTitle>
            <DialogDescription>Staff accounts have limited permissions. They can sign in at /admin/login and access only the areas you grant below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="admin-team-name-input" />
            </div>
            <div>
              <Label htmlFor="staff-email">Work email</Label>
              <Input id="staff-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} data-testid="admin-team-email-input" />
            </div>
            <div>
              <Label htmlFor="staff-password">Temporary password</Label>
              <div className="relative">
                <Input id="staff-password" type={showPw ? "text" : "password"}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters" data-testid="admin-team-password-input" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-2 p-1 text-[var(--c-muted-fg)]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--c-muted-fg)]">Share this with the new staff member. They can change it from /settings after sign-in.</p>
            </div>

            <div>
              <Label>Permissions (limitations)</Label>
              <div className="mt-2 space-y-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3">
                {PERMS.map((p) => (
                  <label key={p.value} className="flex items-start gap-2.5 cursor-pointer" data-testid={`admin-team-perm-${p.value}`}>
                    <Checkbox checked={form.permissions.includes(p.value)} onCheckedChange={() => togglePerm(p.value)} />
                    <span className="-mt-0.5">
                      <span className="block text-sm font-semibold text-[var(--c-ink)]">{p.label}</span>
                      <span className="block text-xs text-[var(--c-muted-fg)]">{p.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--c-muted-fg)]">
                Staff cannot access billing, refunds, audit logs, user impersonation or other staff accounts. Only super-admins can.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving} data-testid="admin-team-create-submit" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? "Creating…" : "Create staff account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke (delete) confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke access for this staff member?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.name || confirmDelete?.email} will be permanently deleted and lose all access to /admin immediately.
              This cannot be undone. If you only need a temporary pause, use <span className="font-semibold">Hold access</span> instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button onClick={() => remove(confirmDelete.user_id)} data-testid="admin-team-confirm-remove" style={{ background: "#DC2626", color: "#fff" }}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold / Resume confirmation */}
      <Dialog open={!!holdTarget} onOpenChange={(o) => !o && setHoldTarget(null)}>
        <DialogContent data-testid="admin-team-hold-dialog">
          <DialogHeader>
            <DialogTitle>
              {holdTarget?.active === false ? "Resume access for this staff member?" : "Hold access for this staff member?"}
            </DialogTitle>
            <DialogDescription>
              {holdTarget?.active === false
                ? `${holdTarget?.name || holdTarget?.email} will be able to sign in to /admin again immediately. Their existing permissions are still in place.`
                : `${holdTarget?.name || holdTarget?.email} will be unable to sign in to /admin until you resume access. Their permissions and account history are preserved.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldTarget(null)} disabled={holdSaving}>Cancel</Button>
            <Button
              onClick={toggleHold}
              disabled={holdSaving}
              data-testid="admin-team-confirm-hold"
              style={{ background: holdTarget?.active === false ? "var(--c-primary)" : "#D97706", color: "#fff" }}
            >
              {holdTarget?.active === false ? (
                <><PlayCircle className="mr-1.5 h-4 w-4" /> {holdSaving ? "Resuming…" : "Resume access"}</>
              ) : (
                <><PauseCircle className="mr-1.5 h-4 w-4" /> {holdSaving ? "Holding…" : "Hold access"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && closeReset()}>
        <DialogContent data-testid="admin-team-reset-dialog">
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.name || resetTarget?.email}</DialogTitle>
            <DialogDescription>
              {resetSuccess
                ? "Password updated. Share these credentials with the staff member through a secure channel. This is the only time it will be shown."
                : "Set a new password. The staff member will use it the next time they sign in. Share it through a secure channel."}
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-3" data-testid="admin-team-reset-success">
              <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-2 text-sm">
                <span className="text-[var(--c-muted-fg)]">Email:</span> <span className="font-mono">{resetSuccess.email}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-2">
                <span className="text-sm text-[var(--c-muted-fg)]">Password:</span>
                <code className="flex-1 truncate font-mono text-sm">{resetSuccess.password}</code>
                <Button size="sm" variant="outline" onClick={copyResetPw} data-testid="admin-team-reset-copy">
                  {resetCopied ? <><Check className="mr-1 h-3.5 w-3.5" /> Copied</> : <><Copy className="mr-1 h-3.5 w-3.5" /> Copy</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="reset-pw">New password</Label>
                <div className="relative mt-1">
                  <Input
                    id="reset-pw"
                    type={resetShowPw ? "text" : "password"}
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="At least 8 characters"
                    data-testid="admin-team-reset-pw-input"
                  />
                  <button type="button" onClick={() => setResetShowPw((s) => !s)} className="absolute right-2 top-2 text-[var(--c-muted-fg)]" aria-label="Toggle visibility">
                    {resetShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setResetPw(generatePw())}
                  className="mt-1.5 text-xs font-medium text-[var(--c-primary)] hover:underline"
                  data-testid="admin-team-reset-regen"
                >
                  Generate a strong password
                </button>
              </div>
            </div>
          )}

          <DialogFooter>
            {resetSuccess ? (
              <Button onClick={closeReset} data-testid="admin-team-reset-done" style={{ background: "var(--c-primary)", color: "#fff" }}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeReset} disabled={resetSaving}>Cancel</Button>
                <Button onClick={submitReset} disabled={resetSaving} data-testid="admin-team-reset-submit" style={{ background: "var(--c-primary)", color: "#fff" }}>
                  <KeyRound className="mr-1.5 h-4 w-4" /> {resetSaving ? "Updating…" : "Set new password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
