import React from "react";
import { CTA_BANNER, INK, PAPER_TEXT, SITE_HEADER_DARK_CLASS, SITE_HEADER_DARK_ZONE } from "@/lib/marketingUi";

/** Full-bleed dark section — header inverts logo/nav when scrolled over this band. */
export function MarketingDarkSection({ children, className = "", id, as: Tag = "section", style, ...props }) {
  return (
    <Tag
      id={id}
      className={[SITE_HEADER_DARK_CLASS, className].filter(Boolean).join(" ")}
      style={{ background: INK, color: PAPER_TEXT, ...style }}
      {...SITE_HEADER_DARK_ZONE}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Bottom CTA card on ink background — does not flip the sticky header (sits on light page). */
export function MarketingCtaBanner({ children, className = "" }) {
  return (
    <div className={[CTA_BANNER, className].filter(Boolean).join(" ")} style={{ background: INK }}>
      {children}
    </div>
  );
}

/** Inline ink card — styling only; does not flip the sticky header. */
export function MarketingInkSurface({ children, className = "", as: Tag = "div", style, ...props }) {
  return (
    <Tag className={className} style={{ background: INK, ...style }} {...props}>
      {children}
    </Tag>
  );
}