import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPageIntro({ caveat, title, subtitle, actions, testId, className }) {
  return (
    <div
      className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}
      data-testid={testId}
    >
      <div>
        {caveat ? (
          <div
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--c-primary-hover)",
            }}
          >
            {caveat}
          </div>
        ) : null}
        <h1 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
          {title}
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-[var(--c-muted-fg)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminStatCard({
  icon: Icon,
  emoji,
  label,
  value,
  sub,
  subColor,
  tone = "teal",
  onClick,
  active,
  testId,
  hint,
}) {
  const accents = {
    teal: "var(--c-primary)",
    info: "var(--c-info)",
    success: "var(--c-success)",
    accent: "var(--c-accent)",
    warning: "#B45309",
  };
  const accent = accents[tone] || accents.teal;
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      aria-pressed={onClick ? !!active : undefined}
      aria-label={onClick ? hint || label : undefined}
      title={onClick ? hint || label : undefined}
      className={cn(
        "cs-portal-surface-card rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg",
        onClick && "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink-solid)]",
      )}
      style={active ? { boxShadow: "0 0 0 2px var(--c-ink-solid)" } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">
          {label}
        </span>
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-sm"
          style={{ background: emoji ? `var(--badge-${tone === "accent" ? "coral" : tone === "warning" ? "coral" : tone}-bg)` : `color-mix(in srgb, ${accent} 14%, transparent)` }}
        >
          {emoji ? emoji : Icon ? <Icon className="h-4 w-4" style={{ color: accent }} /> : null}
        </span>
      </div>
      <p className="mt-2 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{value}</p>
      {sub ? (
        <p className="mt-1 text-[11.5px] font-medium" style={{ color: subColor || "var(--c-muted-fg)" }}>
          {sub}
        </p>
      ) : null}
    </Tag>
  );
}

export function AdminSurfaceCard({ children, className, testId, flush }) {
  return (
    <div
      className={cn(
        "cs-portal-surface-card rounded-2xl",
        !flush && "p-5",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function AdminSectionHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
      <div>
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-[var(--c-ink)]">
          {Icon ? <Icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> : null}
          {title}
        </h3>
        {subtitle ? <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminPillTabs({ tabs, value, onChange, testId }) {
  return (
    <div
      className="flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px] w-fit gap-0.5"
      data-testid={testId}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            data-testid={tab.testId}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all sm:px-4"
            style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 ? (
              <span className={active ? "opacity-80" : "opacity-60"}>{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function AdminEmptyState({ icon: Icon, title, description, action, testId }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center" data-testid={testId}>
      {Icon ? (
        <span
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--status-sent-bg)" }}
        >
          <Icon className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
        </span>
      ) : null}
      <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h3>
      {description ? <p className="mt-1 max-w-xs text-sm text-[var(--c-muted-fg)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AdminStaffBadge({ label = "Internal team" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-paper-2)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--c-ink)]">
      <ShieldCheck className="h-3 w-3" style={{ color: "var(--c-primary)" }} />
      {label}
    </span>
  );
}

export function AdminCallout({ children, testId, tone = "primary" }) {
  const borderColor = tone === "warning" ? "#F59E0B" : "var(--c-primary)";
  return (
    <div
      className="cs-portal-surface-card rounded-2xl border-l-4 px-5 py-4 text-sm"
      style={{ borderLeftColor: borderColor, background: tone === "warning" ? "var(--badge-coral-bg)" : undefined }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function slugAdminTestId(label) {
  return String(label || "").toLowerCase().replace(/\s+/g, "-");
}