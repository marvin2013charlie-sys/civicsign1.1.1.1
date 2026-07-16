import React from "react";
import { Logo } from "@/components/Logo";
import { SidebarCollapseToggle } from "@/components/SidebarCollapseToggle";
import { cn } from "@/lib/utils";

export function SidebarHeader({ collapsed, onToggle, showToggle = true }) {
  return (
    <div className={cn("cs-sidebar-header", collapsed && "cs-sidebar-header-collapsed")}>
      <Logo dark compact={collapsed} className={cn(collapsed && "mx-auto")} />
      {showToggle && !collapsed ? (
        <SidebarCollapseToggle collapsed={collapsed} onToggle={onToggle} variant="header" />
      ) : null}
    </div>
  );
}