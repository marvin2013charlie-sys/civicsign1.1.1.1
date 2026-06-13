import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/**
 * Compact theme toggle suitable for both site headers and app shells.
 * Persists the user's choice in localStorage and respects system preference on
 * first visit.
 */
export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      data-testid="theme-toggle"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--card)] text-[var(--c-ink)] transition-colors hover:bg-[var(--c-paper-2)] ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default ThemeToggle;
