import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FilePlus2, FileText, Menu, X, LayoutTemplate, Eye, Loader2, BarChart3, Gauge, PenTool, Users, UserCog, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PortalHeaderActions } from "@/components/PortalHeaderActions";
import { PortalSubscriptionActions } from "@/components/PortalSubscriptionActions";
import { PortalSidebarProfile } from "@/components/PortalSidebarProfile";
import { useProductTour } from "@/hooks/useProductTour";
import { hasPlanFeature } from "@/lib/planFeatures";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/new", label: "New Envelope", icon: FilePlus2, testid: "nav-new" },
  { to: "/documents", label: "Documents & seals", icon: FileText, testid: "nav-documents" },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, testid: "nav-templates" },
  { to: "/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
  { to: "/manage-pdf", label: "Manage PDF", icon: PenTool, testid: "nav-manage-pdf" },
  { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
  { to: "/usage", label: "Usage", icon: Gauge, testid: "nav-usage" },
];

function SidebarContent({ user, onNavigate }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--c-border)] px-5 py-5">
        <Logo to="/dashboard" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 cs-scroll">
        {NAV.filter((n) => n.to !== "/manage-pdf" || hasPlanFeature(user, "manage_pdf")).map((n) => (
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
        {user?.org_id && (
          <NavLink
            to="/organisation"
            data-testid="nav-organisation"
            onClick={onNavigate}
            className={({ isActive }) =>
              `cs-app-nav-link ${isActive ? "cs-app-nav-link-active" : "border border-dashed border-[var(--c-border)]"}`
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
              `cs-app-nav-link mt-1 ${isActive ? "cs-app-nav-link-active" : "border border-dashed border-[var(--c-border)]"}`
            }
          >
            <UserCog className="h-4 w-4" />
            Admin Console
          </NavLink>
        )}
      </nav>
      <div className="mt-auto border-t border-[var(--c-border)] p-3">
        <PortalSidebarProfile user={user} />
      </div>
    </div>
  );
}

export const AppShell = ({ children, title, actions }) => {
  const { user, logout, impersonation, stopImpersonation } = useAuth();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

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
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
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
    <div className="min-h-screen bg-[var(--c-paper)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--c-border)] bg-[var(--card)] lg:block">
        <SidebarContent user={user} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto bg-[var(--card)] shadow-xl cs-scroll">
            <button className="absolute right-3 top-3 z-10 text-[var(--c-muted-fg)]" onClick={() => setOpen(false)} data-testid="mobile-menu-close">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper)]/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="lg:hidden" onClick={() => setOpen(true)} data-testid="mobile-menu-button" aria-label="Open navigation menu" aria-expanded={open}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <PortalSubscriptionActions user={user} />
            <PortalHeaderActions
              onLogout={handleLogout}
              onReplayTour={() => startTour(true)}
            />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};