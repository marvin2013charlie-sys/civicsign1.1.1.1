import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Inbox, LogOut, ArrowLeft, ShieldCheck, Menu, X, CreditCard, History, BookOpen, UserCog,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { hasAdminAccess } from "@/components/RequirePerm";

// Each entry declares the permission it requires (see RequirePerm.jsx).
// "admin" entries are super-admin only and are hidden from staff sidebars.
const NAV = [
  { to: "/admin",          end: true, label: "Overview",          icon: LayoutDashboard, testid: "admin-nav-overview", perm: "admin" },
  { to: "/admin/users",                label: "Users",             icon: Users,           testid: "admin-nav-users",     perm: "users-read" },
  { to: "/admin/envelopes",            label: "Envelopes",         icon: FileText,        testid: "admin-nav-envelopes", perm: "admin" },
  { to: "/admin/blog",                 label: "Blog",              icon: BookOpen,        testid: "admin-nav-blog",      perm: "blog" },
  { to: "/admin/team",                 label: "Internal Team",     icon: UserCog,         testid: "admin-nav-team",      perm: "admin" },
  { to: "/admin/billing",              label: "Billing & Refunds", icon: CreditCard,      testid: "admin-nav-billing",   perm: "admin" },
  { to: "/admin/audit",                label: "Audit Log",         icon: History,         testid: "admin-nav-audit",     perm: "admin" },
  { to: "/admin/contacts",             label: "Contact Inbox",     icon: Inbox,           testid: "admin-nav-contacts",  perm: "contacts" },
];

function NavList({ user, onLogout, onNavigate, goApp }) {
  const isStaff = user?.role === "staff";
  const items = NAV.filter((n) => hasAdminAccess(user, n.perm));
  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)" }}>
          <ShieldCheck className="h-4 w-4 text-white" />
        </span>
        <div className="leading-tight">
          <p className="font-heading text-base font-bold tracking-tight">CIVIC<span style={{ color: "var(--c-primary)" }}>SIGN</span></p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            {isStaff ? "Staff Console" : "Admin Console"}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} data-testid={n.testid} onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}>
            <n.icon className="h-4 w-4" /> {n.label}
          </NavLink>
        ))}
        {isStaff && items.length <= 1 && (
          <p className="px-3 py-3 text-xs leading-relaxed text-white/40">
            No areas granted yet. A super-admin can grant you access from Internal Team.
          </p>
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button onClick={goApp} data-testid="admin-back-to-app"
          className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </button>
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-9 w-9"><AvatarFallback className="bg-[var(--c-primary)] text-white text-xs">{(user?.name || user?.email || "A").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name || (isStaff ? "Staff" : "Admin")}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" data-testid="admin-logout-button" onClick={onLogout}
          className="mt-1 w-full justify-start text-white/70 hover:bg-white/5 hover:text-white">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export const AdminShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const handleLogout = async () => { await logout(); navigate("/admin/login"); };
  const goApp = () => navigate("/dashboard");
  const isStaff = user?.role === "staff";

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[var(--c-ink)] lg:block">
        <NavList user={user} onLogout={handleLogout} goApp={goApp} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-[var(--c-ink)] shadow-xl">
            <button className="absolute right-3 top-3 text-white/70" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            <NavList user={user} onLogout={handleLogout} goApp={goApp} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper)]/90 px-4 backdrop-blur sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="admin-mobile-menu-button"><Menu className="h-5 w-5" /></button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
            {isStaff ? "Staff member" : "Internal team only"}
          </span>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
};
