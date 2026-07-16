import React from "react";
import { SidebarNavLink } from "@/components/portal/SidebarNavLink";

export function SidebarNavSection({ label, items, collapsed, onNavigate }) {
  if (!items.length) return null;

  return (
    <div className="cs-sidebar-nav-section">
      {collapsed ? (
        <div className="cs-sidebar-section-divider" aria-hidden />
      ) : (
        <p className="cs-sidebar-section-label">{label}</p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarNavLink
            key={item.to}
            to={item.to}
            end={item.end}
            label={item.label}
            icon={item.icon}
            testid={item.testid}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}