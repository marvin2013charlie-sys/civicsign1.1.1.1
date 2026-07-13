import React from "react";

/** Landing v3 teal + coral radial wash for public marketing / auth form areas. */
export function MarketingGradient({ className = "" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
      style={{ background: "var(--c-marketing-gradient)" }}
      aria-hidden
    />
  );
}