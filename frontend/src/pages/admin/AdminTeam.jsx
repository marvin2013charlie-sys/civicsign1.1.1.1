import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus, Trash2, ShieldCheck, Users as UsersIcon, Eye, EyeOff, Crown,
} from "lucide-react";

const PERMS = [
  { value: "blog",        label: "Manage blog posts",     desc: "Create, edit, publish and delete posts on /blog." },
  { value: "contacts",    label: "Read contact inbox",    desc: "View customer enquiries from /contact." },
  { value: "users-read",  label: "Read user list",        desc: "Browse user accounts (read-only — no edits, no impersonation)." },
];

export default function AdminTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", permissions: ["blog"] });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/staff");
      setMembers(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
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
      toast.error(formatApiError(err.response?.data?.detail));
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
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
  const adminCount = members.filter((m) => m.role === "admin").length;
  const staffCount = members.filter((m) => m.role === "staff").length;

  return (
    <div data-testid="admin-team">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Internal Team</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Super-admins and staff members with scoped permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-[var(--c-primary)]/30 bg-[var(--c-primary)]/5 text-[var(--c-primary)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Super-admin only
          </Badge>
          <Button onClick={() => setCreateOpen(true)} data-testid="admin-team-create-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Add staff
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Super admins</span>
          <p className="mt-1 font-heading text-2xl font-bold text-[var(--c-ink)]" data-testid="admin-team-admin-count">{adminCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Staff members</span>
          <p className="mt-1 font-heading text-2xl font-bold text-[var(--c-ink)]" data-testid="admin-team-staff-count">{staffCount}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="admin-team-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <UsersIcon className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid">
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
                      <p className="truncate text-[11px] text-[var(--muted-foreground)]">
                        {m.permissions.join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-3 truncate text-sm text-[var(--muted-foreground)]">{m.email}</div>
                <div className="col-span-2">
                  {m.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      <Crown className="h-3 w-3" /> Super admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Staff
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{fmtDate(m.created_at)}</div>
                <div className="col-span-1 flex justify-end">
                  {m.role !== "admin" && (
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(m)} title="Remove" data-testid="admin-team-remove">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-2 p-1 text-[var(--muted-foreground)]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Share this with the new staff member &mdash; they can change it from /settings after sign-in.</p>
            </div>

            <div>
              <Label>Permissions (limitations)</Label>
              <div className="mt-2 space-y-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3">
                {PERMS.map((p) => (
                  <label key={p.value} className="flex items-start gap-2.5 cursor-pointer" data-testid={`admin-team-perm-${p.value}`}>
                    <Checkbox checked={form.permissions.includes(p.value)} onCheckedChange={() => togglePerm(p.value)} />
                    <span className="-mt-0.5">
                      <span className="block text-sm font-semibold text-[var(--c-ink)]">{p.label}</span>
                      <span className="block text-xs text-[var(--muted-foreground)]">{p.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
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

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this staff member?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.name || confirmDelete?.email} will lose all access to /admin immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button onClick={() => remove(confirmDelete.user_id)} data-testid="admin-team-confirm-remove" style={{ background: "#DC2626", color: "#fff" }}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
