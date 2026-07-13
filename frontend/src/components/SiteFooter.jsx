import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { FOOTER_COLS } from "@/lib/footerNav";
import { FooterLink } from "@/components/FooterLink";
import { UkTrustBadge } from "@/components/UkTrustBadge";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-[var(--c-border)] bg-[var(--card)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14 xl:gap-20">
          {/* Left: logo + brand text */}
          <div className="shrink-0 lg:max-w-[280px]" data-testid="footer-brand">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              The UK&rsquo;s first homegrown e-signature platform. Built in Britain, UK GDPR compliant, with legally binding signatures and a tamper-evident audit trail on every document.
            </p>
          <div className="mt-4">
            <UkTrustBadge variant="footer" />
          </div>
        </div>

          {/* Right: nav columns, start immediately after logo block */}
          <div
            className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-8 min-[400px]:grid-cols-2 md:grid-cols-4 md:gap-x-8 lg:gap-x-10"
            data-testid="footer-nav-columns"
          >
            {FOOTER_COLS.map((c) => (
              <div key={c.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{c.title}</h4>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <FooterLink
                        link={l}
                        className="inline-flex min-h-[44px] items-center py-1 sm:min-h-0"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--c-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-[var(--c-muted-fg)] sm:flex-row sm:px-6">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} CivicBot LTD · Registered in England and Wales. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex min-h-[44px] items-center hover:text-[var(--c-ink)] active:text-[var(--c-ink)] sm:min-h-0"
                data-testid={`footer-bar-${item.testid}`}
              >
                {item.shortLabel}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};