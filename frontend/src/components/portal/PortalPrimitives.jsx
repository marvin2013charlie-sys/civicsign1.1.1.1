import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAT_ACCENTS = {
  teal: "var(--c-primary)",
  info: "var(--c-info)",
  success: "var(--c-success)",
  accent: "var(--c-accent)",
};

export function PortalCard({
  children,
  className,
  testId,
  accent = false,
  padding = "default",
  style,
}) {
  return (
    <div
      className={cn(
        "cs-portal-card",
        accent && "cs-portal-card-accent",
        padding === "none" && "cs-portal-card-flush",
        className,
      )}
      data-testid={testId}
      style={style}
    >
      {children}
    </div>
  );
}

export function PortalStatCard({ icon: Icon, label, value, tone = "teal", testId }) {
  const accent = STAT_ACCENTS[tone] || STAT_ACCENTS.teal;
  return (
    <PortalCard className="p-5" testId={testId}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
          {label}
        </span>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </span>
      </div>
      <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-[var(--c-ink)]">{value}</p>
    </PortalCard>
  );
}

export function portalGreetingDate(now = new Date()) {
  return now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function portalGreetingWord(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Morning";
  if (h < 16) return "Afternoon";
  return "Evening";
}

export function portalGreetingSnapshot(now = new Date()) {
  return {
    dateLabel: portalGreetingDate(now),
    greetingWord: portalGreetingWord(now),
  };
}

export function portalGreetingFirstName(user, fallback = "there") {
  return (user?.name || fallback).split(" ")[0];
}

/** Keeps date + Morning/Afternoon/Evening in sync with the clock while the page is open. */
export function usePortalGreetingClock() {
  const [snapshot, setSnapshot] = useState(() => portalGreetingSnapshot());

  const refresh = useCallback(() => {
    setSnapshot(portalGreetingSnapshot());
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return snapshot;
}

/** Dashboard-style greeting row: Caveat date + "Morning, Name." */
export function PortalDashboardGreeting({ user, fallback = "there", subtitle, actions, testId, className }) {
  const { dateLabel, greetingWord } = usePortalGreetingClock();

  return (
    <div
      className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}
      data-testid={testId}
    >
      <div>
        <div
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--c-primary-hover)",
          }}
        >
          {dateLabel}
        </div>
        <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
          {greetingWord}, {portalGreetingFirstName(user, fallback)}
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-[var(--c-muted-fg)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PortalPageIntro({ title, subtitle, badge, className }) {
  if (!title && !subtitle) return null;
  return (
    <div className={cn("cs-portal-page-intro", className)}>
      {badge ? <span className="cs-badge cs-badge-teal mb-2 w-fit">{badge}</span> : null}
      {title ? (
        <h2 className="font-heading text-xl font-bold tracking-tight text-[var(--c-ink)] sm:text-2xl">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--c-muted-fg)] sm:text-[15px]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function PortalPrimaryButton({ className, children, ...props }) {
  return (
    <Button className={cn("cs-portal-primary-btn", className)} {...props}>
      {children}
    </Button>
  );
}

export function PortalEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--status-sent-bg)" }}
      >
        <Icon className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
      </span>
      <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-[var(--c-muted-fg)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}