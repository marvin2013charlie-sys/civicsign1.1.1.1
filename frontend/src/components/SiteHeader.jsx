import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "Product", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[var(--c-paper)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--c-ink)]">{l.label}</Link>
            ) : (
              <a key={l.label} href={l.href} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--c-ink)]">{l.label}</a>
            )
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:block"><Button variant="ghost" data-testid="nav-signin-button">Sign in</Button></Link>
          <Link to="/register"><Button data-testid="nav-getstarted-button" style={{ background: "var(--c-ink)", color: "#fff" }}>Start free</Button></Link>
          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2">
            {LINKS.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="py-1 text-sm font-medium text-[var(--c-ink)]">{l.label}</Link>
              ) : (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-1 text-sm font-medium text-[var(--c-ink)]">{l.label}</a>
              )
            )}
            <Link to="/login" onClick={() => setOpen(false)} className="py-1 text-sm font-medium text-[var(--c-ink)]">Sign in</Link>
          </nav>
        </div>
      )}
    </header>
  );
};
