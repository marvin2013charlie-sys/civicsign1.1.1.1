import React from "react";
import { AlternatingBrandColor } from "@/components/AlternatingBrandColor";
import { BRAND_ACCENT_CYCLES, BRAND_ACCENT_INTERVAL_MS } from "@/lib/brandAccent";
import { CIVICSIGN_CONTACT_EMAIL, CIVICSIGN_CONTACT_MAILTO } from "@/lib/contactEmail";
import { cn } from "@/lib/utils";

/** Hero / headline accent words (orange ↔ green). */
export function BrandAccent({ children, className, cycles = BRAND_ACCENT_CYCLES, ...props }) {
  return (
    <AlternatingBrandColor
      className={className}
      cycles={cycles}
      intervalMs={BRAND_ACCENT_INTERVAL_MS}
      {...props}
    >
      {children}
    </AlternatingBrandColor>
  );
}

/** Clickable info@civicbot.co.uk with the same colour pulse. */
export function ContactEmailLink({ className, cycles = BRAND_ACCENT_CYCLES, ...props }) {
  return (
    <AlternatingBrandColor
      as="a"
      href={CIVICSIGN_CONTACT_MAILTO}
      className={cn("font-medium hover:underline", className)}
      cycles={cycles}
      intervalMs={BRAND_ACCENT_INTERVAL_MS}
      {...props}
    >
      {CIVICSIGN_CONTACT_EMAIL}
    </AlternatingBrandColor>
  );
}

/** Plain prose with animated mailto links wherever the contact email appears. */
export function RichTextWithContactEmail({ text, emailClassName }) {
  if (!text?.includes(CIVICSIGN_CONTACT_EMAIL)) {
    return <>{text}</>;
  }

  const parts = text.split(CIVICSIGN_CONTACT_EMAIL);
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <ContactEmailLink className={emailClassName} />
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
}