import React, { useState } from "react";
import { SidebarCollapseToggle } from "@/components/SidebarCollapseToggle";
import { cn } from "@/lib/utils";

export function PortalSidebarAside({
  collapsed,
  onToggle,
  children,
  className,
}) {
  const [peek, setPeek] = useState(false);
  const isRail = collapsed && !peek;
  const content = typeof children === "function"
    ? children({ collapsed: isRail, peek })
    : children;

  return (
    <aside
      className={cn(
        "cs-portal-sidebar relative hidden border-r border-[var(--c-border)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:flex-col lg:overflow-hidden",
        isRail && "cs-portal-sidebar-collapsed",
        peek && "cs-portal-sidebar-peek",
        className,
      )}
      onMouseEnter={() => {
        if (collapsed) setPeek(true);
      }}
      onMouseLeave={() => setPeek(false)}
      onFocusCapture={() => {
        if (collapsed) setPeek(true);
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setPeek(false);
        }
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{content}</div>
      <div className={cn("cs-sidebar-footer-toggle shrink-0", isRail && "cs-sidebar-footer-toggle-rail")}>
        <SidebarCollapseToggle collapsed={collapsed} onToggle={onToggle} variant="footer" />
      </div>
    </aside>
  );
}

export function portalSidebarShellClass(collapsed) {
  return cn(
    "cs-portal-shell min-h-screen lg:grid",
    collapsed ? "cs-portal-shell-collapsed" : "cs-portal-shell-expanded",
  );
}