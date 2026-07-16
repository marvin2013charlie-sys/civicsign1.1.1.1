import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Inbox,
  ArrowLeft,
  Menu,
  X,
  CreditCard,
  History,
  BookOpen,
  UserCog,
  Briefcase,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasAdminAccess } from "@/components/RequirePerm";
import { PortalHeaderActions } from "@/components/PortalHeaderActions";
import { PortalSidebarProfile } from "@/components/PortalSidebarProfile";
import { useProductTour } from "@/hooks/useProductTour";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { SidebarHeader } from "@/components/portal/SidebarHeader";
import { SidebarNavSection } from "@/components/portal/SidebarNavSection";
import { PortalSidebarAside, portalSidebarShellClass } from "@/components/portal/PortalSidebarAside";
import { TopbarSidebarToggle } from "@/components/SidebarCollapseToggle";
import { cn } from "@/lib/utils";

const OVERVIEW_NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard, testid: "admin-nav-overview", perm: "admin" },
];

const DIRECTORY_NAV = [
  { to: "/admin/users", label: "Users", icon: Users, testid: "admin-nav-users", perm: "users-read" },
  { to: "/admin/organizations", label: "Organisations", icon: Building2, testid: "admin-nav-orgs", perm: "admin" },
];

const PUBLISHING_NAV = [
  { to: "/admin/blog", label: "Blog", icon: BookOpen, testid: "admin-nav-blog", perm: "blog" },
  { to: "/admin/careers", label: "Careers", icon: Briefcase, testid: "admin-nav-careers", perm: "careers" },
];

const OPERATIONS_NAV = [
  { to: "/admin/billing", label: "Billing & Refunds", icon: CreditCard, testid: "admin-nav-billing", perm: "billing" },
  { to: "/admin/audit", label: "Audit Log", icon: History, testid: "admin-nav-audit", perm: "audit" },
  { to: "/admin/contacts", label: "Contact Inbox", icon: Inbox, testid: "admin-nav-contacts", perm: "contacts" },
];

const TEAM_NAV = [
  { to: "/admin/team", label: "Internal Team", icon: UserCog, testid: "admin-nav-team", perm: "admin" },
];

const NAV_SECTIONS = [
  { label: "Overview", items: OVERVIEW_NAV },
  { label: "Directory", items: DIRECTORY_NAV },
  { label: "Publishing", items: PUBLISHING_NAV },
  { label: "Operations", items: OPERATIONS_NAV },
  { label: "Team", items: TEAM_NAV },
];

function filterAdminItems(items, user) {
  return items
    .filter((item) => hasAdminAccess(user, item.perm))
    .map(({ perm, ...item }) => item);
}

function SidebarContent({ user, onNavigate, goApp, collapsed, onToggle, showToggle }) {
  const isStaff = user?.role === "staff";
  const sections = useMemo(
    () => NAV_SECTIONS.map((section) => ({
      ...section,
      items: filterAdminItems(section.items, user),
    })),
    [user],
  );
  const visibleCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} showToggle={showToggle} />

      <button
        type="button"
        onClick={goApp}
        data-testid="admin-back-to-app"
        data-label="Back to app"
        className={cn(
          "cs-sidebar-primary-cta cs-sidebar-nav-link mb-4 mt-1 flex items-center rounded-xl border font-semibold transition-all hover:-translate-y-px",
          collapsed ? "mx-2 justify-center py-3" : "mx-4 justify-center gap-2 py-2.5 text-[13.5px]",
        )}
        style={{
          borderColor: "rgba(248, 247, 242, 0.14)",
          background: "rgba(248, 247, 242, 0.06)",
          color: "#F8F7F2",
        }}
      >
        <span className="cs-sidebar-nav-icon">
          <ArrowLeft className="h-4 w-4 shrink-0" style={{ color: "#2DD4BF" }} aria-hidden />
        </span>
        <span className="cs-sidebar-nav-label">Back to app</span>
      </button>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 cs-scroll">
        {sections.map((section) => (
          <SidebarNavSection
            key={section.label}
            label={section.label}
            items={section.items}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
        {!collapsed && isStaff && visibleCount <= 1 && (
          <p className="px-3 py-3 text-xs leading-relaxed text-white/40">
            No areas granted yet. A super-admin can grant you access from Internal Team.
          </p>
        )}
      </nav>

      <div className={cn("cs-sidebar-profile-block mt-auto border-t", collapsed ? "p-2" : "p-3")}>
        <PortalSidebarProfile user={user} variant="dark" collapsed={collapsed} />
      </div>
    </div>
  );
}

export const AdminShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isStaff = user?.role === "staff";
  const { collapsed, toggle: toggleSidebar } = useCollapsibleSidebar("cs-admin-sidebar-collapsed");

  const { startTour } = useProductTour({
    surface: "admin",
    user,
    impersonation: null,
    onOpenMobileNav: () => setOpen(true),
  });

  const handleLogout = async () => {
    await logout();
    window.location.replace("/admin/login");
  };

  const goApp = () => navigate("/dashboard");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
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

  return (
    <div className="min-h-screen bg-[var(--c-portal-bg)]">
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation menu"
            className="cs-portal-sidebar absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto shadow-xl cs-scroll"
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 text-[var(--c-muted-fg)]"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              data-testid="admin-mobile-menu-close"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} goApp={goApp} onNavigate={() => setOpen(false)} collapsed={false} />
          </div>
        </div>
      )}

      <div className={portalSidebarShellClass(collapsed)}>
        <PortalSidebarAside collapsed={collapsed} onToggle={toggleSidebar}>
          {({ collapsed: displayCollapsed }) => (
            <SidebarContent
              user={user}
              goApp={goApp}
              collapsed={displayCollapsed}
              onToggle={toggleSidebar}
              showToggle
            />
          )}
        </PortalSidebarAside>

        <div className="cs-portal-main-panel relative min-h-screen min-w-0 overflow-x-clip">
          <header className="cs-portal-topbar sticky top-0 z-30 border-b border-[var(--c-border)]">
            <div className="flex h-14 min-w-0 items-center gap-3 overflow-hidden px-4 sm:gap-4 sm:px-6">
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--c-muted-fg)] transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)] lg:hidden"
                onClick={() => setOpen(true)}
                data-testid="admin-mobile-menu-button"
                aria-label="Open navigation menu"
                aria-expanded={open}
              >
                <Menu className="h-5 w-5" />
              </button>

              <TopbarSidebarToggle collapsed={collapsed} onToggle={toggleSidebar} />

              <span className="inline-flex min-w-0 items-center gap-2 truncate rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
                {isStaff ? "Staff member" : "Internal team only"}
              </span>
              <p className="hidden truncate text-xs text-[var(--c-muted-fg)] md:block">
                Monitored session · Audit-logged actions
              </p>

              <div className="min-w-0 flex-1" aria-hidden />

              <PortalHeaderActions
                onLogout={handleLogout}
                onReplayTour={() => startTour(true)}
                logoutTestId="admin-logout-button"
                settingsTestId="admin-nav-settings"
                tourReplayTestId="admin-tour-replay-button"
              />
            </div>
          </header>

          <main className="relative z-[1] min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};