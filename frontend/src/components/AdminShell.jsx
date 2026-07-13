import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
import { Logo } from "@/components/Logo";
import { PortalHeaderActions } from "@/components/PortalHeaderActions";
import { PortalSidebarProfile } from "@/components/PortalSidebarProfile";
import { useProductTour } from "@/hooks/useProductTour";

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

function NavSection({ label, items, user, onNavigate }) {
  const visible = items.filter((item) => hasAdminAccess(user, item.perm));
  if (!visible.length) return null;

  return (
    <div className="mb-3">
      <p className="cs-sidebar-section-label">{label}</p>
      <div className="space-y-1">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={item.testid}
            onClick={onNavigate}
            className={({ isActive }) =>
              `cs-app-nav-link ${isActive ? "cs-app-nav-link-active" : ""}`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({ user, onNavigate, goApp }) {
  const isStaff = user?.role === "staff";
  const visibleItems = NAV_SECTIONS
    .flatMap((section) => section.items)
    .filter((item) => hasAdminAccess(user, item.perm));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pb-2 pt-5">
        <Logo dark />
      </div>

      <button
        type="button"
        onClick={goApp}
        data-testid="admin-back-to-app"
        className="mx-4 mb-4 mt-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[13.5px] font-semibold transition-all hover:-translate-y-px"
        style={{
          borderColor: "rgba(248, 247, 242, 0.14)",
          background: "rgba(248, 247, 242, 0.06)",
          color: "#F8F7F2",
        }}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" style={{ color: "#2DD4BF" }} />
        Back to app
      </button>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 cs-scroll">
        {NAV_SECTIONS.map((section) => (
          <NavSection
            key={section.label}
            label={section.label}
            items={section.items}
            user={user}
            onNavigate={onNavigate}
          />
        ))}
        {isStaff && visibleItems.length <= 1 && (
          <p className="px-3 py-3 text-xs leading-relaxed text-white/40">
            No areas granted yet. A super-admin can grant you access from Internal Team.
          </p>
        )}
      </nav>

      <div className="mt-auto border-t p-3" style={{ borderColor: "rgba(248,247,242,.1)" }}>
        <PortalSidebarProfile user={user} variant="dark" />
      </div>
    </div>
  );
}

export const AdminShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isStaff = user?.role === "staff";

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
            <SidebarContent user={user} goApp={goApp} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="cs-portal-shell min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="cs-portal-sidebar hidden border-r border-[var(--c-border)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:flex-col lg:overflow-hidden">
          <SidebarContent user={user} goApp={goApp} />
        </aside>

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