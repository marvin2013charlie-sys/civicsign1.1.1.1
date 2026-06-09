import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, downloadCsv } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ShieldCheck, Download, ChevronRight } from "lucide-react";

const PLAN_BADGE = {
  free: { bg: "var(--status-draft-bg)", fg: "var(--c-ink)" },
  pro: { bg: "var(--status-sent-bg)", fg: "var(--c-ink)" },
  business: { bg: "var(--status-viewed-bg)", fg: "var(--c-ink)" },
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Debounced fetch — runs on mount (empty query) and whenever the search box
  // changes. State is set inside an async callback (deferred), satisfying the
  // react-hooks rules without a redundant second effect.
  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/admin/users", { params: { q } });
        if (active) setUsers(data);
      } catch (err) {
        toast.error(formatApiError(err.response?.data?.detail));
      } finally {
        if (active) setLoading(false);
      }
    }, q ? 350 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "\u2014");

  return (
    <div data-testid="admin-users">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Users</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">View accounts, run diagnostics, reset passwords, and enter user accounts for support.</p>
        </div>
        <Button variant="outline" onClick={() => downloadCsv("/admin/export/users.csv", "civicsign_users.csv")} data-testid="admin-export-users">
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" data-testid="admin-users-search" />
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
              <div className="col-span-1 text-right">Status</div>
            </div>
            {users.map((u) => (
              <button
                key={u.user_id}
                type="button"
                data-testid="admin-user-row"
                onClick={() => navigate(`/admin/users/${u.user_id}`)}
                className="grid w-full grid-cols-1 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--c-paper-2)] focus-visible:bg-[var(--c-paper-2)] focus-visible:outline-none lg:grid-cols-12"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-[var(--c-primary)] text-white text-xs">{(u.name || u.email).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{u.name || "\u2014"}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{u.email}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  {u.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-viewed-bg)", color: "var(--c-ink)" }}>
                      <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-draft-bg)", color: "var(--c-ink)" }}>User</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: (PLAN_BADGE[u.plan] || PLAN_BADGE.free).bg, color: (PLAN_BADGE[u.plan] || PLAN_BADGE.free).fg }}>{u.plan}</span>
                </div>
                <div className="col-span-1 text-sm text-[var(--muted-foreground)]">{u.envelope_count}</div>
                <div className="col-span-2 text-sm text-[var(--muted-foreground)]">{fmt(u.created_at)}</div>
                <div className="col-span-1 flex items-center justify-end gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: u.active !== false ? "var(--c-primary)" : "#B91C1C" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: u.active !== false ? "var(--c-primary)" : "#B91C1C" }} />
                    {u.active !== false ? "Active" : "Disabled"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
