import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarCollapseToggle({ collapsed, onToggle, className }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn("cs-sidebar-collapse-toggle", className)}
      data-testid="sidebar-collapse-toggle"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4" aria-hidden />
      ) : (
        <ChevronLeft className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}