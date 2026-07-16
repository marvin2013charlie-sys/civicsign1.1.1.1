import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export function SidebarNavLink({
  to,
  end,
  label,
  icon: Icon,
  testid,
  onClick,
  className,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testid}
      data-label={label}
      title={label}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "cs-app-nav-link cs-sidebar-nav-link",
          isActive && "cs-app-nav-link-active",
          className,
        )
      }
    >
      <span className="cs-sidebar-nav-icon" aria-hidden>
        <Icon className="cs-sidebar-nav-icon-svg" />
      </span>
      <span className="cs-sidebar-nav-label truncate">{label}</span>
    </NavLink>
  );
}