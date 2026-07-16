import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resolveLogoHomePath } from "@/lib/logoHome";

/** Brand teal + coral accent — the two colours used across the portal. */
const LOGO_DOT_COLORS = ["#2DD4BF", "#FF7A5C"];

function useAnimatedLogoDot(intervalMs = 5000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return undefined;

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % LOGO_DOT_COLORS.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return LOGO_DOT_COLORS[index];
}

/**
 * Brand logo: "CivicSign" wordmark over a teal rule with a detached dot,
 * matching the final brand lockup.
 *
 * Public marketing pages → /. Signed-in app/admin surfaces → /dashboard or /admin.
 * Pass `to` to override (e.g. tests).
 */
export const Logo = ({ className = "", dark = false, to, compact = false }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const target = to ?? resolveLogoHomePath(user, pathname);
  const ariaLabel = target === "/" ? "CivicSign home" : "CivicSign dashboard";
  const dotColor = useAnimatedLogoDot(5000);

  const inkColor = dark ? "#ffffff" : "var(--c-ink)";
  return (
    <Link to={target} className={`inline-flex items-center ${className}`} data-testid="brand-logo" aria-label={ariaLabel}>
      {compact ? (
        <span className="flex flex-col items-center gap-1" style={{ lineHeight: 1 }} aria-hidden="true">
          <span
            className="font-heading text-lg font-bold"
            style={{ color: inkColor, letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            C
          </span>
          <span className="flex items-center">
            <span
              data-testid="brand-logo-line"
              style={{
                height: "3px",
                width: "1.25rem",
                borderRadius: "9999px",
                background: dotColor,
                transition: "background-color 0.6s ease",
              }}
            />
            <span
              data-testid="brand-logo-dot"
              style={{
                width: "7px",
                height: "7px",
                marginLeft: "3px",
                flexShrink: 0,
                borderRadius: "9999px",
                background: dotColor,
                transition: "background-color 0.6s ease",
              }}
            />
          </span>
        </span>
      ) : (
        <span className="flex flex-col gap-0.5" style={{ lineHeight: 1 }}>
          <span
            className="font-heading text-xl font-bold tracking-tight transition-colors duration-200"
            style={{ color: inkColor, letterSpacing: "-0.02em", lineHeight: 1.05 }}
          >
            CivicSign
          </span>
          <span className="flex w-full min-w-[5.5rem] items-center" aria-hidden="true">
            <span
              data-testid="brand-logo-line"
              style={{
                height: "3px",
                flex: 1,
                minWidth: "2.5rem",
                borderRadius: "9999px",
                background: dotColor,
                transition: "background-color 0.6s ease",
              }}
            />
            <span
              data-testid="brand-logo-dot"
              style={{
                width: "7px",
                height: "7px",
                marginLeft: "4px",
                flexShrink: 0,
                borderRadius: "9999px",
                background: dotColor,
                transition: "background-color 0.6s ease",
              }}
            />
          </span>
        </span>
      )}
    </Link>
  );
};