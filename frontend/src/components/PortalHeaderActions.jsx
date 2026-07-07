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
    <div className={cn("cs-portal-header-actions flex items-center gap-0.5", className)}>
      {onReplayTour ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReplayTour}
          data-testid={tourReplayTestId}
          title="Product tour"
          className="h-10 w-10 rounded-xl text-[var(--c-muted-fg)] hover:border hover:border-[var(--c-border)] hover:bg-[var(--card)] hover:text-[var(--c-ink)]"
        >
          <Compass className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      ) : null}
      <NavLink
        to={settingsTo}
        data-testid={settingsTestId}
        title="Settings"
        className={({ isActive }) =>
          cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            isActive
              ? "border-[var(--c-primary)] bg-[var(--badge-teal-bg)] text-[var(--c-primary)]"
              : "border-transparent text-[var(--c-muted-fg)] hover:border-[var(--c-border)] hover:bg-[var(--card)] hover:text-[var(--c-ink)]",
          )
        }
      >
        <Settings className="h-[1.15rem] w-[1.15rem]" />
      </NavLink>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onLogout}
        data-testid={logoutTestId}
        title="Sign out"
        className="h-10 w-10 rounded-xl text-[var(--c-muted-fg)] hover:border hover:border-[var(--c-border)] hover:bg-[var(--card)] hover:text-[var(--c-ink)]"
      >
        <LogOut className="h-[1.15rem] w-[1.15rem]" />
      </Button>
    </div>
  );
}