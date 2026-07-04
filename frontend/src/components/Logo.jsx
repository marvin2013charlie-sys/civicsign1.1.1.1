import React from "react";
import { Link } from "react-router-dom";

/**
 * Brand logo: "CivicSign" wordmark over a teal rule with a detached dot,
 * matching the final brand lockup.
 */
export const Logo = ({ className = "", dark = false, to = "/" }) => {
  const inkColor = dark ? "#ffffff" : "var(--c-ink)";
  return (
    <Link to={to} className={`inline-flex items-center ${className}`} data-testid="brand-logo">
      <span className="flex flex-col" style={{ lineHeight: 1 }}>
        <span
          className="font-heading text-xl font-bold tracking-tight"
          style={{ color: inkColor, letterSpacing: "-0.02em" }}
        >
          CivicSign
        </span>
        <span className="mt-1 flex items-center" aria-hidden="true">
          <span
            style={{
              height: "3px",
              flex: 1,
              borderRadius: "9999px",
              background: "var(--c-primary)",
            }}
          />
          <span
            style={{
              width: "7px",
              height: "7px",
              marginLeft: "5px",
              borderRadius: "9999px",
              background: "var(--c-logo-dot)",
            }}
          />
        </span>
      </span>
    </Link>
  );
};
