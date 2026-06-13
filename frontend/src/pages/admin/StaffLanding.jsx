import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Users, Inbox, ShieldCheck, ArrowRight } from "lucide-react";

const PERM_CARDS = {
  blog: {
    label: "Manage blog posts",
    desc: "Create, edit, publish and delete posts.",
    icon: BookOpen,
    href: "/admin/blog",
  },
  "users-read": {
    label: "Browse users",
    desc: "View user accounts (read-only — no edits).",
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
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">
            Welcome, {user?.name || "team member"}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Staff console — you can access the areas a super-admin has granted to you.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {perms.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No permissions granted yet. Ask a super-admin to grant access from <span className="font-mono">/admin/team</span>.
          </div>
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
                className="group rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--c-primary)]/40"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                    <Icon className="h-5 w-5 text-[var(--c-primary)]" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--c-ink)]">{card.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{card.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      <p className="mt-6 text-xs text-[var(--muted-foreground)]">
        Staff cannot access billing, refunds, audit logs, user impersonation or the Internal Team list. Only super-admins can.
      </p>
    </div>
  );
}
