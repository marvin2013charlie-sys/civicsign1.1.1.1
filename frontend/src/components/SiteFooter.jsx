import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";


const COLS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how" },
      { label: "Security", href: "/#security" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Contact us", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
      { label: "Cookie Policy", to: "/cookies" },
    ],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="border-t border-[var(--c-border)] bg-[var(--card)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted-foreground)]">
            The UK&rsquo;s first homegrown e-signature platform. Built in Britain, UK GDPR compliant, with legally binding signatures and a tamper-evident audit trail on every document.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <span aria-hidden="true">&#127468;&#127463;</span> UK-owned · UK GDPR · UK eIDAS &amp; ECA 2000 aligned
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted-foreground)]">
            CIVICSIGN Technologies Ltd · 71-75 Shelton Street, Covent Garden, London WC2H 9JQ, United Kingdom
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{c.title}</h4>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className="text-sm text-[var(--c-ink)] hover:text-[var(--c-primary)]" data-testid={`footer-link-${l.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{l.label}</Link>
                  ) : (
                    <a href={l.href} className="text-sm text-[var(--c-ink)] hover:text-[var(--c-primary)]">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--c-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-[var(--muted-foreground)] sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} CIVICSIGN Technologies Ltd · Registered in England &amp; Wales. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-[var(--c-ink)]">Privacy</Link>
            <Link to="/terms" className="hover:text-[var(--c-ink)]">Terms</Link>
            <Link to="/cookies" className="hover:text-[var(--c-ink)]">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
