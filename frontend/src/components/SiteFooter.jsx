import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";

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
            The fresh, fast e-signature platform for modern teams. Upload, drag fields, send — get legally binding signatures with a tamper-evident audit trail.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> UK eIDAS & ECA 2000 aligned
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
          <p>© {new Date().getFullYear()} CIVICSIGN Technologies Inc. All rights reserved.</p>
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
