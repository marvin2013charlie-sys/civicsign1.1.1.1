import React from "react";

/**
 * Teal headline accent with coral scribble underline.
 * SVG height is fixed (not proportional to text width) so long phrases stay aligned.
 */
export function MarketingHeadlineAccent({ children, className = "" }) {
  return (
    <span
      className={`relative inline-block whitespace-nowrap pb-[0.14em] ${className}`.trim()}
      style={{ color: "var(--c-primary-hover)" }}
    >
      {children}
      <svg
        viewBox="0 0 200 8"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-[0.05em] h-[0.2em] min-h-[5px] max-h-[9px] w-[calc(100%-0.1em)]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 6 C 66 3, 134 3, 198 6"
          stroke="#FF7A5C"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}