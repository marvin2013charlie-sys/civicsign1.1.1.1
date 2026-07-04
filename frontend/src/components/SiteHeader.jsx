import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, Home, Users, Scale, UsersRound, PoundSterling, HeartPulse, Heart, HardHat, GraduationCap, BookOpen } from "lucide-react";

const SOLUTIONS = [
  { to: "/solutions/real-estate",       label: "Real Estate",         icon: Home,          blurb: "ASTs, sales memos & notices" },
  { to: "/solutions/staffing-agency",   label: "Staffing Agency",     icon: Users,         blurb: "Contracts, RTW & terms of business" },
  { to: "/solutions/legal",             label: "Legal & Solicitors",  icon: Scale,         blurb: "Engagement letters & witnessed deeds" },
  { to: "/solutions/hr",                label: "HR & People Ops",     icon: UsersRound,    blurb: "Offer letters, contracts & leavers" },
  { to: "/solutions/financial-services",label: "Financial Services",  icon: PoundSterling, blurb: "Engagement letters & AML declarations" },
  { to: "/solutions/healthcare",        label: "Healthcare",          icon: HeartPulse,    blurb: "Patient consent & care plans" },
  { to: "/solutions/charities",         label: "Charities",           icon: Heart,         blurb: "Gift Aid, trustees & volunteers" },
  { to: "/solutions/construction",      label: "Construction & Trades", icon: HardHat,     blurb: "Quotes, JCT contracts & RAMS" },
  { to: "/solutions/education",         label: "Education",           icon: GraduationCap, blurb: "Parental consent & staff onboarding" },
];

const RESOURCES = [
  { to: "/blog", label: "Blog", icon: BookOpen, blurb: "UK e-signature law, product updates & customer stories" },
];

const LINKS = [
  { label: "Product", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  const [solOpen, setSolOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const dropdownRef = useRef(null);
  const resourcesRef = useRef(null);
  const location = useLocation();
  const solActive = location.pathname.startsWith("/solutions");
  const resActive = location.pathname.startsWith("/blog") || location.pathname.startsWith("/resources");

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSolOpen(false);
      if (resourcesRef.current && !resourcesRef.current.contains(e.target)) setResOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    const t = setTimeout(() => { setSolOpen(false); setResOpen(false); setOpen(false); }, 0);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[var(--c-paper)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {/* Solutions dropdown */}
          <div ref={dropdownRef} className="relative" data-testid="nav-solutions-menu">
            <button
              type="button"
              onClick={() => setSolOpen((o) => !o)}
              aria-expanded={solOpen}
              data-testid="nav-solutions-trigger"
              className={`flex items-center gap-1 text-sm font-medium ${solActive || solOpen ? "text-[var(--c-ink)]" : "text-[var(--muted-foreground)]"} hover:text-[var(--c-ink)]`}
            >
              Solutions
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${solOpen ? "rotate-180" : ""}`} />
            </button>
            {solOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-[min(640px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] shadow-lg" data-testid="nav-solutions-panel">
                <p className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  By industry
                </p>
                <div className="grid grid-cols-1 gap-1 p-1.5 sm:grid-cols-2">
                  {SOLUTIONS.map((s) => (
                    <Link
                      key={s.to}
                      to={s.to}
                      data-testid={`nav-solution-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--c-paper-2)]"
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                        <s.icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--c-ink)]">{s.label}</span>
                        <span className="block truncate text-xs text-[var(--muted-foreground)]">{s.blurb}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resources dropdown */}
          <div ref={resourcesRef} className="relative" data-testid="nav-resources-menu">
            <button
              type="button"
              onClick={() => setResOpen((o) => !o)}
              aria-expanded={resOpen}
              data-testid="nav-resources-trigger"
              className={`flex items-center gap-1 text-sm font-medium ${resActive || resOpen ? "text-[var(--c-ink)]" : "text-[var(--muted-foreground)]"} hover:text-[var(--c-ink)]`}
            >
              Resources
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${resOpen ? "rotate-180" : ""}`} />
            </button>
            {resOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] shadow-lg" data-testid="nav-resources-panel">
                <p className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Learn
                </p>
                <div className="p-1.5">
                  {RESOURCES.map((r) => (
                    <Link
                      key={r.to}
                      to={r.to}
                      data-testid={`nav-resource-${r.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--c-paper-2)]"
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                        <r.icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--c-ink)]">{r.label}</span>
                        <span className="block text-xs text-[var(--muted-foreground)]">{r.blurb}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

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
          <Link to="/register"><Button data-testid="nav-getstarted-button" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>Start free</Button></Link>
          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2">
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Solutions</p>
            {SOLUTIONS.map((s) => (
              <Link key={s.to} to={s.to} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-[var(--c-ink)]">
                <s.icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> {s.label}
              </Link>
            ))}
            <div className="my-2 border-t border-[var(--c-border)]" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Resources</p>
            {RESOURCES.map((r) => (
              <Link key={r.to} to={r.to} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-[var(--c-ink)]">
                <r.icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> {r.label}
              </Link>
            ))}
            <div className="my-2 border-t border-[var(--c-border)]" />
            {LINKS.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} className="py-1 text-sm font-medium text-[var(--c-ink)]">{l.label}</Link>
              ) : (
                <a key={l.label} href={l.href} className="py-1 text-sm font-medium text-[var(--c-ink)]">{l.label}</a>
              )
            )}
            <Link to="/login" className="py-1 text-sm font-medium text-[var(--c-ink)]">Sign in</Link>
          </nav>
        </div>
      )}
    </header>
  );
};
