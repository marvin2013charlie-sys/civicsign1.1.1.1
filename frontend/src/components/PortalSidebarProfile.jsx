import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_ORIGIN } from "@/lib/api";
import { cn } from "@/lib/utils";

function resolvePicture(picture) {
  if (!picture) return undefined;
  if (picture.startsWith("/")) return `${API_ORIGIN}${picture}`;
  return picture;
}

export function PortalSidebarProfile({ user, variant = "light", className, collapsed = false }) {
  if (!user) return null;

  const isDark = variant === "dark";
  const initials = (user.name || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "cs-portal-sidebar-user",
        isDark && "cs-portal-sidebar-user-dark",
        collapsed && "cs-portal-sidebar-user-collapsed",
        className,
      )}
      data-testid="portal-sidebar-user"
      title={collapsed ? `${user.name || "User"} · ${user.email}` : undefined}
    >
      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-[var(--c-primary)]/20">
        {user.picture && (
          <AvatarImage src={resolvePicture(user.picture)} alt={user.name || user.email} />
        )}
        <AvatarFallback className="bg-[var(--c-primary)] text-xs font-semibold text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {user.name || "User"}
          </p>
          <p className="mt-0.5 truncate text-xs leading-tight opacity-70">
            {user.email}
          </p>
        </div>
      )}
    </div>
  );
}