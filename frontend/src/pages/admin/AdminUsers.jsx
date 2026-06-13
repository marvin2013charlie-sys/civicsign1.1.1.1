import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, downloadCsv } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShieldCheck, Download, ChevronRight, Crown } from "lucide-react";

const PLAN_BADGE = {
  free: { bg: "var(--status-draft-bg)", fg: "var(--c-ink)" },
  pro: { bg: "var(--status-sent-bg)", fg: "var(--c-ink)" },
  business: { bg: "var(--status-viewed-bg)", fg: "var(--c-ink)" },
};

const ROLE_OPTIONS = [
  { value: "user",  label: "Customers",      desc: "Regular end users." },
  { value: "staff", label: "Staff",          desc: "Internal team members with scoped permissions." },
  { value: "admin", label: "Super admins",   desc: "Full access internal accounts." },
  { value: "all",   label: "All accounts",   desc: "Everyone — customers, staff and admins." },
];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("user"); // default: customers only

  // Debounced fetch — runs on mount, whenever the search box changes, and
  // immediately when the role filter changes.
  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/admin/users", { params: { q, role } });
        if (active) {
          setUsers(data);
          setLoading(false);
        }
      } catch (err) {
        toast.error(formatApiError(err.response?.data?.detail));
        if (active) setLoading(false);
      }
    }, q ? 350 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [q, role]);

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "\u2014");
  const current = ROLE_OPTIONS.find((o) => o.value === role) || ROLE_OPTIONS[0];

  return (
    <div data-testid="admin-users">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]" data-testid="admin-users-heading">
            {current.label}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{current.desc}</p>
        </div>
        <Button variant="outline" onClick={() => downloadCsv(`/admin/export/users.csv`, "civicsign_users.csv")} data-testid="admin-export-users">
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" data-testid="admin-users-search" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-10 w-[180px]" data-testid="admin-users-role-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} data-testid={`admin-users-role-option-${o.value}`}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]" data-testid="admin-users-count">
          {loading ? "…" : `${users.length} ${users.length === 1 ? "account" : "accounts"}`}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="admin-users-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted-foreground)]">No {current.label.toLowerCase()} found.</div>
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
                    {u.role === "staff" && u.permissions?.length > 0 && (
                      <p className="truncate text-[11px] text-[var(--muted-foreground)]">
                        {u.permissions.join(" \u00b7 ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  {u.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      <Crown className="h-3.5 w-3.5" /> Super admin
                    </span>
                  ) : u.role === "staff" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Staff
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-draft-bg)", color: "var(--c-ink)" }}>Customer</span>
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
