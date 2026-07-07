import React from "react";
import { ShieldCheck } from "lucide-react";
import { BrandAccent } from "@/components/BrandText";
import { cn } from "@/lib/utils";

const UK_FLAG = "\u{1F1EC}\u{1F1E7}";

const VARIANT_CLASS = {
  hero: "",
  compact: "cs-uk-trust-badge--compact",
  footer: "cs-uk-trust-badge--footer",
  auth: "cs-uk-trust-badge--auth",
};

/**
 * Hero trust strip: UK positioning + GDPR approval.
 * variant="hero"    — two-line card for landing heroes
 * variant="compact" — centred pill for about / secondary pages
 * variant="footer"  — scaled card for site footer
 * variant="auth"    — glass card on dark auth panel
 */
export function UkTrustBadge({ variant = "hero", className }) {
  if (variant === "compact") {
    return (
      <span className={cn("cs-uk-trust-badge", VARIANT_CLASS.compact, className)} data-testid="uk-trust-badge">
        <span className="cs-uk-trust-badge__flag cs-uk-trust-badge__flag--sm" aria-hidden="true">
          {UK_FLAG}
        </span>
        <span className="cs-uk-trust-badge__compact-text">
          British-built · <BrandAccent>UK GDPR approved</BrandAccent>
        </span>
      </span>
    );
  }

  const isAuth = variant === "auth";
  const isFooter = variant === "footer";

  return (
    <div
      className={cn("cs-uk-trust-badge", VARIANT_CLASS[variant], className)}
      data-testid="uk-trust-badge"
    >
      <span
        className={cn(
          "cs-uk-trust-badge__flag",
          (isFooter || isAuth) && "cs-uk-trust-badge__flag--sm",
        )}
        aria-hidden="true"
      >
        {UK_FLAG}
      </span>
      <div className="cs-uk-trust-badge__copy">
        <p className="cs-uk-trust-badge__headline">
          The UK&rsquo;s first homegrown, <BrandAccent>UK GDPR-approved</BrandAccent> e-signature platform
        </p>
        <p className="cs-uk-trust-badge__sub">
          <ShieldCheck className="cs-uk-trust-badge__icon" aria-hidden="true" />
          <span>Built &amp; hosted in Britain</span>
          <span className="cs-uk-trust-badge__dot" aria-hidden="true">·</span>
          <span>UK eIDAS aligned</span>
        </p>
      </div>
    </div>
  );
}