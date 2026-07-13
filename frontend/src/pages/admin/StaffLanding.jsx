import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PortalDashboardGreeting } from "@/components/portal/PortalPrimitives";
import { AdminSurfaceCard } from "@/components/portal/AdminPrimitives";
import { BookOpen, Users, Inbox, ArrowRight, Briefcase } from "lucide-react";

const PERM_CARDS = {
  blog: {
    label: "Manage blog posts",
    desc: "Create, edit, publish and delete posts.",
    icon: BookOpen,
    href: "/admin/blog",
  },
  careers: {
    label: "Careers & applications",
    desc: "Publish job openings and review candidate applications.",
    icon: Briefcase,
    href: "/admin/careers",
  },
  "users-read": {
    label: "Browse users",
    desc: "View user accounts (read-only, no edits).",
    icon: Users,
    href: "/admin/users",
  },
  contacts: {
    label: "Contact inbox",
    desc: "Read and triage customer enquiries.",
    icon: Inbox,
    href: "/admin/contacts",
  },
};

/** Landing page rendered at /admin for staff users (super-admins see Overview). */
export default function StaffLanding() {
  const { user } = useAuth();
  const perms = user?.permissions || [];
  return (
    <div data-testid="staff-landing">
      <PortalDashboardGreeting
        user={user}
        fallback="team member"
        subtitle="Access the areas a super-admin has granted to you."
        testId="staff-landing-greeting"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {perms.length === 0 ? (
          <AdminSurfaceCard className="col-span-full border border-dashed text-center text-sm text-[var(--c-muted-fg)]">
            No permissions granted yet. Ask a super-admin to grant access from <span className="font-mono">/admin/team</span>.
          </AdminSurfaceCard>
        ) : (
          perms.map((p) => {
            const card = PERM_CARDS[p];
            if (!card) return null;
            const Icon = card.icon;
            return (
              <Link
                key={p}
                to={card.href}
                data-testid={`staff-card-${p}`}
                className="cs-portal-surface-card group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: "var(--badge-teal-bg)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--c-ink)]">{card.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">{card.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--c-muted-fg)] transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      <p className="mt-6 text-xs text-[var(--c-muted-fg)]">
        Staff cannot access billing, refunds, audit logs, user impersonation or the Internal Team list. Only super-admins can.
      </p>
    </div>
  );
}