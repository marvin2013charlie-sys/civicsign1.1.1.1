import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { parseLinkTarget, scrollToSection } from "@/lib/scrollToSection";
import { cn } from "@/lib/utils";

/**
 * Footer / mobile nav link, routes to pages or scrolls to homepage sections (FAQ, pricing, etc.).
 * Pass `comingSoon: true` to render a non-navigable item with a Coming soon badge.
 */
export function FooterLink({ link, className = "", onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const testId = `footer-link-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const baseClass =
    "text-sm text-[var(--c-ink)] transition-colors hover:text-[var(--c-primary)] active:text-[var(--c-primary)]";

  if (link.comingSoon) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-sm text-[var(--c-muted-fg)]",
          className,
        )}
        data-testid={testId}
        aria-disabled="true"
      >
        <span>{link.label}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" }}
          data-testid={`${testId}-coming-soon`}
        >
          Coming soon
        </span>
      </span>
    );
  }

  const { pathname: targetPath, hash: targetHash } = parseLinkTarget(link.to);

  const handleNavigate = () => {
    onNavigate?.();
  };

  const onClick = (e) => {
    if (targetHash) {
      if (location.pathname === targetPath) {
        e.preventDefault();
        navigate({ pathname: targetPath, hash: targetHash }, { replace: false });
        scrollToSection(targetHash);
        handleNavigate();
        return;
      }
      handleNavigate();
      return;
    }

    if (typeof link.to === "string" && location.pathname === link.to) {
      e.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      handleNavigate();
      return;
    }

    handleNavigate();
  };

  return (
    <Link
      to={link.to}
      onClick={onClick}
      className={cn(baseClass, className, link.badge && "inline-flex items-center gap-2")}
      data-testid={testId}
    >
      <span>{link.label}</span>
      {link.badge ? (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" }}
          data-testid={`${testId}-badge`}
        >
          {link.badge}
        </span>
      ) : null}
    </Link>
  );
}