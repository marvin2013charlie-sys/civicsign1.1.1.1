import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus2, FileText, LogOut, Menu, X, LayoutTemplate, Settings, ShieldCheck, Eye, Loader2, BarChart3, Gauge, PenTool } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { API_ORIGIN } from "@/lib/api";

// Avatars uploaded internally are returned as a relative "/api/auth/avatar/.."
// path. Prefix with the backend origin so the <img> tag resolves correctly even
// when the SPA is served from a different host than the API.
function resolvePicture(picture) {
  if (!picture) return undefined;
  if (picture.startsWith("/")) return `${API_ORIGIN}${picture}`;
  return picture;
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/new", label: "New Envelope", icon: FilePlus2, testid: "nav-new" },
  { to: "/documents", label: "Documents", icon: FileText, testid: "nav-documents" },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, testid: "nav-templates" },
  { to: "/manage-pdf", label: "Manage PDF", icon: PenTool, testid: "nav-manage-pdf" },
  { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
  { to: "/usage", label: "Usage", icon: Gauge, testid: "nav-usage" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

function SidebarContent({ user, onLogout, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo to="/dashboard" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={n.testid}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--c-paper-2)] text-[var(--c-ink)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
              }`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              `mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-[var(--c-ink)] text-white"
                  : "text-[var(--c-ink)] hover:bg-[var(--c-paper-2)]"
              }`
            }
            style={({ isActive }) => (isActive ? {} : { border: "1px dashed var(--c-border)" })}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
            Admin Console
          </NavLink>
        )}
      </nav>
      <div className="border-t border-[var(--c-border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-9 w-9">
            {user?.picture && <AvatarImage src={resolvePicture(user.picture)} alt={user?.name} />}
            <AvatarFallback className="bg-[var(--c-primary)] text-white text-xs">
              {(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--c-ink)]">{user?.name || "User"}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          data-testid="logout-button"
          onClick={onLogout}
          className="mt-1 w-full justify-start text-[var(--muted-foreground)] hover:text-[var(--c-ink)]"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export const AppShell = ({ children, title, actions }) => {
  const { user, logout, impersonation, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleLogout = async () => {
    await logout();
    // Hard reload so the auth-cookie clear hits the browser before any route
    // guard re-evaluates. Avoids the “refresh after sign out bounces me back
    // to the dashboard / stale page” bug caused by lingering session state.
    window.location.replace("/login");
  };

  const handleExitImpersonation = () => {
    setExiting(true);
    // Restore the admin session, then hard-reload into the admin console so the
    // route guards re-evaluate against the admin identity cleanly.
    stopImpersonation();
    window.location.href = "/admin/users";
  };

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--c-border)] bg-[var(--card)] lg:block">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-[var(--card)] shadow-xl">
            <button className="absolute right-3 top-3 text-[var(--muted-foreground)]" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} onLogout={handleLogout} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Impersonation banner */}
        {impersonation && (
          <div
            data-testid="impersonation-banner"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm font-medium text-[var(--c-ink)]"
            style={{ background: "var(--status-viewed-bg)", borderBottom: "1px solid var(--c-border)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              Viewing as <b data-testid="impersonation-target">{impersonation.name || impersonation.email}</b>
              <span className="hidden text-[var(--muted-foreground)] sm:inline">({impersonation.email})</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExitImpersonation}
              disabled={exiting}
              data-testid="exit-impersonation-button"
              className="h-7 border-[var(--c-ink)]/20 bg-[var(--card)]"
            >
              {exiting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <LogOut className="mr-1.5 h-3.5 w-3.5" />}
              Exit impersonation
            </Button>
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper)]/90 px-4 backdrop-blur sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="mobile-menu-button">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h1>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
