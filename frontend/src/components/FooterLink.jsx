import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { parseLinkTarget, scrollToSection } from "@/lib/scrollToSection";

/**
 * Footer / mobile nav link, routes to pages or scrolls to homepage sections (FAQ, pricing, etc.).
 */
export function FooterLink({ link, className = "", onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const testId = `footer-link-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const baseClass = "text-sm text-[var(--c-ink)] transition-colors hover:text-[var(--c-primary)] active:text-[var(--c-primary)]";
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
      className={`${baseClass} ${className}`.trim()}
      data-testid={testId}
    >
      {link.label}
    </Link>
  );
}