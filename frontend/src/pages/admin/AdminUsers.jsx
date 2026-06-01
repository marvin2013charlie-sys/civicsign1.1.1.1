import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ShieldCheck } from "lucide-react";

const PLAN_BADGE = {
  free: { bg: "var(--status-draft-bg)", fg: "var(--c-ink)" },
  pro: { bg: "var(--status-sent-bg)", fg: "var(--c-ink)" },
  business: { bg: "var(--status-viewed-bg)", fg: "var(--c-ink)" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async (query = "") => {
    try {
      const { data } = await api.get("/admin/users", { params: { q: query } });
      setUsers(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(q), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  const patch = async (userId, body) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}`, body);
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, ...data } : u)));
      toast.success("User updated");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "\u2014");

  return (
    <div data-testid="admin-users">
      <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Users</h1>
      <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Manage roles, plans, and account access.</p>

      <div className="relative mt-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email\u2026" className="pl-9" data-testid="admin-users-search" />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="admin-users-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted-foreground)]">No users found.</div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] lg:grid">
              <div className="col-span-4">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Plan</div>
              <div className="col-span-1">Docs</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-1 text-right">Active</div>
            </div>
            {users.map((u) => (
              <div key={u.user_id} data-testid="admin-user-row" className="grid grid-cols-1 items-center gap-3 px-5 py-4 lg:grid-cols-12">
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-[var(--c-primary)] text-white text-xs">{(u.name || u.email).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{u.name || "\u2014"}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{u.email}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <Select value={u.role} onValueChange={(v) => patch(u.user_id, { role: v })}>
                    <SelectTrigger className="h-9 w-32" data-testid="admin-user-role-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Select value={u.plan} onValueChange={(v) => patch(u.user_id, { plan: v })}>
                    <SelectTrigger className="h-9 w-32" data-testid="admin-user-plan-select">
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize" style={{ background: (PLAN_BADGE[u.plan] || PLAN_BADGE.free).bg, color: (PLAN_BADGE[u.plan] || PLAN_BADGE.free).fg }}>{u.plan}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 text-sm text-[var(--muted-foreground)]">{u.envelope_count}</div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{fmt(u.created_at)}</div>
                <div className="col-span-1 flex items-center justify-end gap-2">
                  {u.role === "admin" && <ShieldCheck className="h-4 w-4" style={{ color: "var(--c-primary)" }} />}
                  <Switch checked={u.active !== false} onCheckedChange={(v) => patch(u.user_id, { active: v })} data-testid="admin-user-active-toggle" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
