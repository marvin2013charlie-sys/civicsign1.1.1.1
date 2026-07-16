import React from "react";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarCollapseToggle({ collapsed, onToggle, className, variant = "edge" }) {
  const isHeader = variant === "header" || variant === "header-rail";
  const isFooter = variant === "footer";
  const isHeaderRail = variant === "header-rail";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "cs-sidebar-collapse-toggle",
        isHeader && "cs-sidebar-collapse-toggle-header",
        isHeaderRail && "cs-sidebar-collapse-toggle-header-rail",
        isFooter && "cs-sidebar-collapse-toggle-footer",
        variant === "edge" && "cs-sidebar-collapse-toggle-edge",
        className,
      )}
      data-testid="sidebar-collapse-toggle"
      aria-label={collapsed ? "Use full sidebar" : "Use compact sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Full sidebar" : "Compact sidebar"}
    >
      {isHeader || isFooter ? (
        collapsed ? (
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        ) : (
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        )
      ) : collapsed ? (
        <ChevronRight className="h-4 w-4" aria-hidden />
      ) : (
        <ChevronLeft className="h-4 w-4" aria-hidden />
      )}
      {isFooter ? (
        <span className="cs-sidebar-collapse-toggle-label">
          {collapsed ? "Full sidebar" : "Compact sidebar"}
        </span>
      ) : null}
    </button>
  );
}

/** Desktop topbar control — same collapse state as the portal sidebar. */
export function TopbarSidebarToggle({ collapsed, onToggle, className }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--c-muted-fg)] transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)] lg:inline-flex",
        className,
      )}
      data-testid="topbar-sidebar-toggle"
      aria-label={collapsed ? "Use full sidebar" : "Use compact sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Full sidebar" : "Compact sidebar"}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" aria-hidden />
      ) : (
        <PanelLeftClose className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}