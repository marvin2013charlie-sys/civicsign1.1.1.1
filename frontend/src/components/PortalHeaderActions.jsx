import React from "react";
import { NavLink } from "react-router-dom";
import { Settings, LogOut, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PortalHeaderActions({
  onLogout,
  onReplayTour,
  settingsTo = "/settings",
  logoutTestId = "logout-button",
  settingsTestId = "nav-settings",
  tourReplayTestId = "tour-replay-button",
  className,
}) {
  return (
    <div
      className={cn(
        "cs-portal-header-actions inline-flex items-center rounded-xl border border-[var(--c-border)] bg-[var(--c-portal-card)] p-0.5 shadow-sm",
        className,
      )}
    >
      {onReplayTour ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReplayTour}
          data-testid={tourReplayTestId}
          title="Product tour"
          className="h-8 w-8 rounded-lg text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
        >
          <Compass className="h-4 w-4" />
        </Button>
      ) : null}
      {onReplayTour ? <span className="mx-0.5 h-4 w-px bg-[var(--c-border)]" aria-hidden /> : null}
      <NavLink
        to={settingsTo}
        data-testid={settingsTestId}
        title="Settings"
        className={({ isActive }) =>
          cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            isActive
              ? "bg-[var(--badge-teal-bg)] text-[var(--c-primary)]"
              : "text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]",
          )
        }
      >
        <Settings className="h-4 w-4" />
      </NavLink>
      <span className="mx-0.5 h-4 w-px bg-[var(--c-border)]" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onLogout}
        data-testid={logoutTestId}
        title="Sign out"
        className="h-8 w-8 rounded-lg text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}