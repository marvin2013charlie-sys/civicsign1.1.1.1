import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError, downloadCsv } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShieldCheck, Download, ChevronRight, Crown, Building2 } from "lucide-react";
import { AdminPageIntro, AdminPillTabs, AdminEmptyState } from "@/components/portal/AdminPrimitives";

const PLAN_BADGE = {
  free: { bg: "var(--status-draft-bg)", fg: "var(--c-ink)" },
  pro: { bg: "var(--status-sent-bg)", fg: "var(--c-ink)" },
  business: { bg: "var(--status-viewed-bg)", fg: "var(--c-ink)" },
  organisation: { bg: "var(--c-primary)22", fg: "var(--c-primary)" },
};

const CATEGORY_OPTIONS = [
  { value: "customer", label: "Customer", desc: "End-user accounts — solo plans or organisation seats." },
  { value: "team", label: "Team member", desc: "Internal team accounts — staff members and super-admins." },
];

const CATEGORY_TABS = [
  { id: "customer", label: "Customer", testId: "admin-users-category-customer" },
  { id: "team", label: "Team member", testId: "admin-users-category-team" },
];

const CUSTOMER_PLAN_OPTIONS = [
  { value: "all", label: "All customers", role: "user", plan: "all", org: "" },
  { value: "free", label: "Free", role: "user", plan: "free", org: "" },
  { value: "pro", label: "Pro", role: "user", plan: "pro", org: "" },
  { value: "business", label: "Business", role: "user", plan: "business", org: "" },
  { value: "organisation", label: "Organisation", role: "user", plan: "", org: "yes" },
];

const ORG_MEMBER_TYPE_OPTIONS = [
  { value: "all", label: "All members" },
  { value: "owner", label: "Owners only" },
  { value: "member", label: "Members only" },
];

const TEAM_TYPE_OPTIONS = [
  { value: "all", label: "All team members", role: "team", plan: "" },
  { value: "staff", label: "Staff", role: "staff", plan: "" },
  { value: "admin", label: "Super admins", role: "admin", plan: "" },
];

function normalizeCategory(value) {
  if (value === "team" || value === "staff") return "team";
  return "customer";
}

function normalizeSubFilter(category, subFilter) {
  const options = category === "customer" ? CUSTOMER_PLAN_OPTIONS : TEAM_TYPE_OPTIONS;
  return options.some((o) => o.value === subFilter) ? subFilter : "all";
}

function buildQueryParams(category, subFilter, orgFilter, orgMemberType) {
  const cat = normalizeCategory(category);
  const sub = normalizeSubFilter(cat, subFilter);
  if (cat === "customer") {
    const opt = CUSTOMER_PLAN_OPTIONS.find((o) => o.value === sub) || CUSTOMER_PLAN_OPTIONS[0];
    const params = { role: opt.role, plan: opt.plan, org: opt.org || "", org_id: "", org_role: "" };
    if (sub === "organisation") {
      if (orgFilter && orgFilter !== "all") params.org_id = orgFilter;
      if (orgMemberType && orgMemberType !== "all") params.org_role = orgMemberType;
    }
    return params;
  }
  const opt = TEAM_TYPE_OPTIONS.find((o) => o.value === sub) || TEAM_TYPE_OPTIONS[0];
  return { role: opt.role, plan: "", org: "", org_id: "", org_role: "" };
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: actor } = useAuth();
  const isSuperAdmin = actor?.role === "admin";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("customer");
  const [subFilter, setSubFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [orgMemberType, setOrgMemberType] = useState("all");
  const [orgs, setOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const queryParams = useMemo(
    () => buildQueryParams(category, subFilter, orgFilter, orgMemberType),
    [category, subFilter, orgFilter, orgMemberType],
  );

  const activeCategory = normalizeCategory(category);
  const activeSubFilter = normalizeSubFilter(activeCategory, subFilter);
  const isOrgFilter = activeCategory === "customer" && activeSubFilter === "organisation";
  const subOptions = activeCategory === "customer" ? CUSTOMER_PLAN_OPTIONS : TEAM_TYPE_OPTIONS;
  const currentCategory = CATEGORY_OPTIONS.find((o) => o.value === activeCategory) || CATEGORY_OPTIONS[0];
  const currentSub = subOptions.find((o) => o.value === activeSubFilter) || subOptions[0];
  const selectedOrg = orgs.find((o) => o.org_id === orgFilter);

  const heading = activeCategory === "customer"
    ? (activeSubFilter === "all"
      ? "Customers"
      : activeSubFilter === "organisation"
        ? selectedOrg
          ? `${selectedOrg.name} members`
          : orgMemberType === "owner"
            ? "Organisation owners"
            : orgMemberType === "member"
              ? "Organisation members"
              : "Organisation customers"
        : activeSubFilter === "business"
          ? "Business customers (solo)"
          : `${currentSub.label} customers`)
    : (activeSubFilter === "all" ? "Team members" : currentSub.label);

  const description = activeCategory === "customer" && activeSubFilter === "organisation"
    ? "Multi-seat organisation accounts sharing a document pool. Pick an organisation or member type below."
    : activeCategory === "customer" && activeSubFilter === "business"
      ? "Single-user Business plan accounts — not part of an organisation pool."
      : activeCategory === "customer" && activeSubFilter !== "all"
        ? `${currentCategory.desc} Showing ${currentSub.label.toLowerCase()} only.`
        : currentCategory.desc;

  useEffect(() => {
    if (!isOrgFilter) return;
    let active = true;
    setOrgsLoading(true);
    api.get("/admin/users/organisation-options")
      .then(({ data }) => { if (active) setOrgs(data); })
      .catch((err) => { if (active) toast.error(formatApiError(err)); })
      .finally(() => { if (active) setOrgsLoading(false); });
    return () => { active = false; };
  }, [isOrgFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = { q, role: queryParams.role };
        if (queryParams.plan && queryParams.plan !== "all") params.plan = queryParams.plan;
        if (queryParams.org) params.org = queryParams.org;
        if (queryParams.org_id) params.org_id = queryParams.org_id;
        if (queryParams.org_role) params.org_role = queryParams.org_role;
        const { data } = await api.get("/admin/users", { params });
        if (active) {
          setUsers(data);
          setLoading(false);
        }
      } catch (err) {
        toast.error(formatApiError(err));
        if (active) setLoading(false);
      }
    }, q ? 350 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [q, queryParams]);

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "\u2014");

  const planLabel = (u) => {
    if (u.org_id) return "organisation";
    return u.plan || "free";
  };

  return (
    <div data-testid="admin-users">
      <div data-testid="admin-users-heading">
        <AdminPageIntro
          caveat="Internal console"
          title={heading}
          subtitle={description}
          actions={(
            <Button variant="outline" className="rounded-xl" onClick={() => downloadCsv(`/admin/export/users.csv`, "civicsign_users.csv")} data-testid="admin-export-users">
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          )}
        />
      </div>

      <div className="mb-4">
        <AdminPillTabs
          tabs={CATEGORY_TABS}
          value={activeCategory}
          onChange={(v) => { setCategory(v); setSubFilter("all"); setOrgFilter("all"); setOrgMemberType("all"); }}
          testId="admin-users-category-filter"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" data-testid="admin-users-search" />
        </div>
        <Select value={activeSubFilter} onValueChange={(v) => { setSubFilter(v); setOrgFilter("all"); setOrgMemberType("all"); }}>
          <SelectTrigger
            className="h-10 w-[180px]"
            data-testid={activeCategory === "customer" ? "admin-users-plan-filter" : "admin-users-team-type-filter"}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {subOptions.map((o) => (
              <SelectItem
                key={o.value}
                value={o.value}
                data-testid={activeCategory === "customer" ? `admin-users-plan-${o.value}` : `admin-users-team-type-${o.value}`}
              >
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOrgFilter && (
          <>
            <Select value={orgFilter} onValueChange={setOrgFilter} disabled={orgsLoading}>
              <SelectTrigger className="h-10 w-[200px]" data-testid="admin-users-org-filter">
                <SelectValue placeholder={orgsLoading ? "Loading…" : "All organisations"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="admin-users-org-all">All organisations</SelectItem>
                {orgs.map((o) => (
                  <SelectItem key={o.org_id} value={o.org_id} data-testid={`admin-users-org-${o.org_id}`}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orgMemberType} onValueChange={setOrgMemberType}>
              <SelectTrigger className="h-10 w-[160px]" data-testid="admin-users-org-member-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_MEMBER_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} data-testid={`admin-users-org-role-${o.value}`}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]" data-testid="admin-users-count">
          {loading ? "…" : `${users.length} ${users.length === 1 ? "account" : "accounts"}`}
        </span>
      </div>

      <div className="mt-4 cs-portal-surface-card overflow-hidden rounded-2xl" data-testid="admin-users-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={`users-skel-${i}`} className="h-14 w-full" />)}</div>
        ) : users.length === 0 ? (
          <AdminEmptyState title={`No ${heading.toLowerCase()} found`} description="Try adjusting your search or filters." />
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] lg:grid">
              <div className="col-span-4">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Plan</div>
              {isSuperAdmin && <div className="col-span-1">Docs</div>}
              <div className={isSuperAdmin ? "col-span-2" : "col-span-3"}>Joined</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {users.map((u) => {
              const label = planLabel(u);
              const badge = PLAN_BADGE[label] || PLAN_BADGE.free;
              return (
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
                      <p className="truncate text-xs text-[var(--c-muted-fg)]">{u.email}</p>
                      {u.org_id && (
                        <p className="truncate text-[11px] text-[var(--c-muted-fg)]">
                          {u.org_role === "owner" ? "Org owner" : "Org member"} · {u.org_id}
                        </p>
                      )}
                      {u.role === "staff" && u.permissions?.length > 0 && (
                        <p className="truncate text-[11px] text-[var(--c-muted-fg)]">
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
                        <ShieldCheck className="h-3.5 w-3.5" /> Team member
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-draft-bg)", color: "var(--c-ink)" }}>Customer</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {label === "organisation" ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: badge.bg, color: badge.fg }}>
                        <Building2 className="h-3 w-3" /> Organisation
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: badge.bg, color: badge.fg }}>{label}</span>
                    )}
                  </div>
                  {isSuperAdmin && (
                    <div className="col-span-1 text-sm text-[var(--c-muted-fg)]" title="Document count (titles are private)">
                      {u.envelope_count ?? 0}
                    </div>
                  )}
                  <div className={`${isSuperAdmin ? "col-span-2" : "col-span-3"} text-sm text-[var(--c-muted-fg)]`}>{fmt(u.created_at)}</div>
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: u.active !== false ? "var(--c-primary)" : "#B91C1C" }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: u.active !== false ? "var(--c-primary)" : "#B91C1C" }} />
                      {u.active !== false ? "Active" : "Disabled"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--c-muted-fg)]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}