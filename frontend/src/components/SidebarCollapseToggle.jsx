import React from "react";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarCollapseToggle({ collapsed, onToggle, className, variant = "edge" }) {
  const isHeader = variant === "header";
  const isFooter = variant === "footer";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "cs-sidebar-collapse-toggle",
        isHeader && "cs-sidebar-collapse-toggle-header",
        isFooter && "cs-sidebar-collapse-toggle-footer",
        variant === "edge" && "cs-sidebar-collapse-toggle-edge",
        className,
      )}
      data-testid="sidebar-collapse-toggle"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
        <span className="cs-sidebar-collapse-toggle-label">Expand</span>
      ) : null}
    </button>
  );
}