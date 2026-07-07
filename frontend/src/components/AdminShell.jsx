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

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard, testid: "admin-nav-overview", perm: "admin" },
  { to: "/admin/users", label: "Users", icon: Users, testid: "admin-nav-users", perm: "users-read" },

  { to: "/admin/blog", label: "Blog", icon: BookOpen, testid: "admin-nav-blog", perm: "blog" },
  { to: "/admin/careers", label: "Careers", icon: Briefcase, testid: "admin-nav-careers", perm: "careers" },
  { to: "/admin/team", label: "Internal Team", icon: UserCog, testid: "admin-nav-team", perm: "admin" },
  { to: "/admin/organizations", label: "Organisations", icon: Building2, testid: "admin-nav-orgs", perm: "admin" },
  { to: "/admin/billing", label: "Billing & Refunds", icon: CreditCard, testid: "admin-nav-billing", perm: "billing" },
  { to: "/admin/audit", label: "Audit Log", icon: History, testid: "admin-nav-audit", perm: "audit" },
  { to: "/admin/contacts", label: "Contact Inbox", icon: Inbox, testid: "admin-nav-contacts", perm: "contacts" },
];

function NavList({ user, onNavigate, goApp }) {
  const isStaff = user?.role === "staff";
  const items = NAV.filter((n) => hasAdminAccess(user, n.perm));

  return (
    <div className="flex h-full flex-col text-white">
      <div className="cs-admin-sidebar-brand px-5 py-5">
        <Logo dark to="/dashboard" />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          {isStaff ? "Staff Console" : "Admin Console"}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            data-testid={n.testid}
            onClick={onNavigate}
            className={({ isActive }) =>
              `cs-admin-nav-link ${isActive ? "cs-admin-nav-link-active" : ""}`
            }
          >
            <span className="cs-admin-nav-icon" aria-hidden>
              <n.icon className="h-4 w-4" />
            </span>
            <span className="cs-admin-nav-label">{n.label}</span>
          </NavLink>
        ))}
        {isStaff && items.length <= 1 && (
          <p className="px-3 py-3 text-xs leading-relaxed text-white/40">
            No areas granted yet. A super-admin can grant you access from Internal Team.
          </p>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={goApp}
          data-testid="admin-back-to-app"
          className="cs-admin-nav-link cs-admin-nav-link-secondary mb-2 w-full"
        >
          <span className="cs-admin-nav-icon" aria-hidden>
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="cs-admin-nav-label">Back to app</span>
        </button>
        <PortalSidebarProfile
          user={user}
          variant="dark"
        />
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
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <aside className="cs-admin-sidebar fixed inset-y-0 left-0 hidden w-64 lg:block">
        <NavList user={user} goApp={goApp} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation menu"
            className="cs-admin-sidebar absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col overflow-y-auto shadow-xl cs-scroll"
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              data-testid="admin-mobile-menu-close"
            >
              <X className="h-5 w-5" />
            </button>
            <NavList
              user={user}
              goApp={goApp}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="cs-admin-header sticky top-0 z-30 flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--card)] text-[var(--c-ink)] lg:hidden"
            onClick={() => setOpen(true)}
            data-testid="admin-mobile-menu-button"
            aria-label="Open navigation menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="cs-admin-header-badge min-w-0 truncate">
            {isStaff ? "Staff member" : "Internal team only"}
          </span>
          <p className="hidden text-xs text-[var(--c-muted-fg)] md:block">
            Monitored session · Audit-logged actions
          </p>
          <PortalHeaderActions
            className="ml-auto"
            onLogout={handleLogout}
            onReplayTour={() => startTour(true)}
            logoutTestId="admin-logout-button"
            settingsTestId="admin-nav-settings"
            tourReplayTestId="admin-tour-replay-button"
          />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};