import React from "react";
import { Link } from "react-router-dom";

export const Logo = ({ className = "", dark = false, to = "/" }) => {
  const inkColor = dark ? "#ffffff" : "var(--c-ink)";
  return (
    <Link to={to} className={`inline-flex items-center gap-2 ${className}`} data-testid="brand-logo">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: "var(--c-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17c3-1 4-6 7-6s3 4 6 3 4-5 5-5" />
        </svg>
      </span>
      <span
        className="font-heading text-xl font-bold tracking-tight"
        style={{ color: inkColor, letterSpacing: "-0.02em" }}
      >
        CIVIC<span style={{ color: "var(--c-primary)" }}>SIGN</span>
      </span>
    </Link>
  );
};
