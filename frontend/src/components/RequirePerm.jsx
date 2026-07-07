import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Permission map for admin sub-routes.
 *   - "admin"  -> only super-admin can access
 *   - "blog" | "contacts" | "users-read" -> admin OR staff with that grant
 */
export const ADMIN_ROUTE_PERMS = {
  "": "admin",          // /admin (Overview)
  "users": "users-read",

  "blog": "blog",
  "careers": "careers",
  "team": "admin",
  "organizations": "admin",
  "billing": "admin",
  "audit": "admin",
  "contacts": "contacts",
};

export function hasAdminAccess(user, perm) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "staff") {
    if (perm === "admin") return false;
    return (user.permissions || []).includes(perm);
  }
  return false;
}

/**
 * Route guard. Renders children if the current user has the required perm;
 * otherwise shows an inline "Access denied" panel that points back to /admin.
 */
export default function RequirePerm({ perm, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/admin/login" state={{ from: loc }} replace />;
  if (hasAdminAccess(user, perm)) return children;
  return <AccessDenied perm={perm} />;
}

function AccessDenied({ perm }) {
  const label =
    perm === "admin"
      ? "super-admin"
      : perm === "users-read"
      ? "Read user list"
      : perm === "blog"
      ? "Manage blog posts"
      : perm === "careers"
      ? "Manage careers & applications"
      : perm === "contacts"
      ? "Contact inbox"
      : perm;
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 text-center" data-testid="admin-access-denied">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <ShieldAlert className="h-6 w-6 text-red-600" />
      </span>
      <h2 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">Access denied</h2>
      <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
        You don&apos;t have the <span className="font-semibold">{label}</span> permission. Ask a super-admin to grant it from <span className="font-mono">/admin/team</span>.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Go back
        </Button>
        <Button onClick={() => (window.location.href = "/admin")} style={{ background: "var(--c-primary)", color: "#fff" }}>
          <Lock className="mr-1.5 h-4 w-4" /> Admin home
        </Button>
      </div>
    </div>
  );
}
