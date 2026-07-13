import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FilePlus2, FileText, Menu, X, LayoutTemplate, Eye, Loader2, BarChart3, Gauge, PenTool, Users, UserCog, Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PortalHeaderActions } from "@/components/PortalHeaderActions";
import { PortalSubscriptionActions } from "@/components/PortalSubscriptionActions";
import { PortalSidebarProfile } from "@/components/PortalSidebarProfile";
import { useProductTour } from "@/hooks/useProductTour";
import { hasPlanFeature } from "@/lib/planFeatures";
import { formatQuotaRemainingLine } from "@/lib/quotaDisplay";

const WORKSPACE_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/new", label: "New Envelope", icon: FilePlus2, testid: "nav-new" },
  { to: "/documents", label: "Documents & seals", icon: FileText, testid: "nav-documents" },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, testid: "nav-templates" },
  { to: "/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
  { to: "/manage-pdf", label: "Manage PDF", icon: PenTool, testid: "nav-manage-pdf", feature: "manage_pdf" },
];

const INSIGHTS_NAV = [
  { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
  { to: "/usage", label: "Usage", icon: Gauge, testid: "nav-usage" },
];

function NavSection({ label, items, user, onNavigate }) {
  const visible = items.filter((n) => !n.feature || hasPlanFeature(user, n.feature));
  if (!visible.length) return null;
  return (
    <div className="mb-3">
      <p className="cs-sidebar-section-label">{label}</p>
      <div className="space-y-1">
        {visible.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={n.testid}
            onClick={onNavigate}
            className={({ isActive }) =>
              `cs-app-nav-link ${isActive ? "cs-app-nav-link-active" : ""}`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function SidebarQuotaMini({ usage }) {
  if (!usage || usage.unlimited || !usage.limit) return null;
  const pct = Math.min(100, usage.percent || 0);
  const isOrg = usage.scope === "organization";
  return (
    <div
      className="mx-4 mb-3 rounded-[14px] border p-3.5"
      style={{ background: "rgba(248,247,242,.06)", borderColor: "rgba(248,247,242,.1)" }}
      data-testid="sidebar-quota-mini"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "rgba(248,247,242,.6)" }}>
          {isOrg ? "Organisation" : `${usage.plan || "Free"} plan`}
        </span>
        <span className="text-[11.5px] font-semibold" style={{ color: "#2DD4BF" }}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <div className="mt-2 h-[5px] overflow-hidden rounded-[3px]" style={{ background: "rgba(248,247,242,.12)" }}>
        <div
          className="h-full rounded-[3px] transition-all"
          style={{ width: `${pct}%`, background: pct >= 90 ? "#FF7A5C" : "#2DD4BF" }}
        />
      </div>
      <div className="mt-1.5 text-[10.5px]" style={{ color: "rgba(248,247,242,.45)" }}>
        {formatQuotaRemainingLine(usage)}
      </div>
    </div>
  );
}

function SidebarContent({ user, usage, onNavigate }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pb-2 pt-5">
        <Logo dark />
      </div>
      <NavLink
        to="/new"
        onClick={onNavigate}
        data-testid="sidebar-new-envelope"
        className="mx-4 mb-4 mt-1 rounded-xl py-3 text-center text-[13.5px] font-semibold transition-all hover:-translate-y-px hover:bg-white"
        style={{ background: "#2DD4BF", color: "#122120", boxShadow: "0 8px 20px rgba(45,212,191,.25)" }}
      >
        + New envelope
      </NavLink>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 cs-scroll">
        <NavSection label="Workspace" items={WORKSPACE_NAV} user={user} onNavigate={onNavigate} />
        <NavSection label="Insights" items={INSIGHTS_NAV} user={user} onNavigate={onNavigate} />
        {user?.org_id && (
          <NavLink
            to="/organisation"
            data-testid="nav-organisation"
            onClick={onNavigate}
            className={({ isActive }) =>
              `cs-app-nav-link ${isActive ? "cs-app-nav-link-active" : ""}`
            }
          >
            <Building2 className="h-4 w-4" />
            Organisation
          </NavLink>
        )}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              `cs-app-nav-link mt-1 ${isActive ? "cs-app-nav-link-active" : ""}`
            }
          >
            <UserCog className="h-4 w-4" />
            Admin Console
          </NavLink>
        )}
      </nav>
      <SidebarQuotaMini usage={usage} />
      <div className="mt-auto border-t p-3" style={{ borderColor: "rgba(248,247,242,.1)" }}>
        <PortalSidebarProfile user={user} variant="dark" />
      </div>
    </div>
  );
}

export const AppShell = ({ children, title, actions, headerSearch }) => {
  const { user, logout, impersonation, stopImpersonation } = useAuth();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/usage")
      .then(({ data }) => { if (!cancelled) setUsage(data); })
      .catch(() => { /* mini quota is best-effort chrome */ });
    return () => { cancelled = true; };
  }, []);

  const { startTour } = useProductTour({
    surface: "app",
    user,
    impersonation,
    onOpenMobileNav: () => setOpen(true),
  });

  const handleLogout = async () => {
    await logout();
    window.location.replace("/login");
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  const handleExitImpersonation = async () => {
    setExiting(true);
    try {
      const result = await stopImpersonation();
      window.location.href = result?.ok ? "/admin/users" : "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--c-portal-bg)]">
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Navigation menu" className="cs-portal-sidebar absolute inset-y-0 left-0 flex w-[min(100vw-3rem,16rem)] max-w-[85vw] flex-col overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] shadow-xl cs-scroll">
            <button className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)]" onClick={() => setOpen(false)} data-testid="mobile-menu-close" aria-label="Close navigation menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} usage={usage} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="cs-portal-shell min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="cs-portal-sidebar hidden border-r border-[var(--c-border)] lg:sticky lg:top-0 lg:block lg:flex lg:h-screen lg:max-h-screen lg:flex-col lg:overflow-hidden">
          <SidebarContent user={user} usage={usage} />
        </aside>

        <div className="cs-portal-main-panel relative z-[1] min-h-screen min-w-0 overflow-x-clip">
        {impersonation && (
          <div
            data-testid="impersonation-banner"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm font-medium text-[var(--c-ink)]"
            style={{ background: "var(--status-viewed-bg)", borderBottom: "1px solid var(--c-border)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              Viewing as <b data-testid="impersonation-target">{impersonation.name || impersonation.email}</b>
              <span className="hidden text-[var(--c-muted-fg)] sm:inline">({impersonation.email})</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExitImpersonation}
              disabled={exiting}
              data-testid="exit-impersonation-button"
              className="h-7 border-[var(--c-ink)]/20 bg-[var(--card)]"
            >
              {exiting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Exit impersonation
            </Button>
          </div>
        )}
        <header className="cs-portal-topbar sticky top-0 z-30 border-b border-[var(--c-border)]" data-testid="portal-topbar">
          <div className="flex h-14 min-w-0 items-center gap-2 overflow-hidden px-3 sm:gap-4 sm:px-6">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--c-muted-fg)] transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)] lg:hidden"
              onClick={() => setOpen(true)}
              data-testid="mobile-menu-button"
              aria-label="Open navigation menu"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" />
            </button>

            {headerSearch ? (
              <div className="relative min-w-0 flex-1 max-w-sm sm:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted-fg)]" />
                <Input
                  value={headerSearch.value}
                  onChange={(e) => headerSearch.onChange(e.target.value)}
                  placeholder={headerSearch.placeholder || "Search…"}
                  disabled={headerSearch.disabled}
                  className="cs-portal-topbar-search h-9 rounded-full border-[var(--c-border)] bg-[var(--c-portal-card)] pl-10 pr-4 text-sm shadow-[inset_0_1px_2px_rgba(18,33,32,0.04)]"
                  data-testid={headerSearch.testId || "app-shell-search"}
                  aria-label={headerSearch.placeholder || "Search"}
                />
              </div>
            ) : title ? (
              <h1 className="min-w-0 truncate font-heading text-base font-semibold text-[var(--c-ink)] sm:text-lg">{title}</h1>
            ) : null}

            <div className="min-w-0 flex-1" aria-hidden />

            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              {actions ? (
                <div className="flex shrink-0 items-center" data-testid="portal-header-actions-slot">
                  {actions}
                </div>
              ) : null}
              <PortalSubscriptionActions user={user} />
              <PortalHeaderActions
                onLogout={handleLogout}
                onReplayTour={() => startTour(true)}
              />
            </div>
          </div>
        </header>
        <main className="relative z-[1] min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
};