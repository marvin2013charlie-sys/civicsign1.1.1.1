import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { ALL_SOLUTIONS, solutionTestId } from "@/lib/solutionsNav";
import { FooterLink } from "@/components/FooterLink";
import { getMarketingHeaderCta } from "@/lib/authPortal";

const PRODUCT_LINKS = [
  { label: "E-signatures", to: { pathname: "/", hash: "#features" } },
  { label: "Manage PDF", to: "/product/manage-pdf" },
];

const LINKS = [
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
];

/** Desktop flyout — always mounted; shown via CSS group-hover (avoids mount/unmount flicker). */
const DESKTOP_PANEL =
  "pointer-events-none absolute top-full z-50 opacity-0 invisible translate-y-1 transition-all duration-150 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0";

const DEFAULT_HEADER_HEIGHT = 64;

export const SiteHeader = () => {
  const topBarRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const location = useLocation();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user && user !== false);
  const headerCta = getMarketingHeaderCta(user);

  // Measure only the top bar — mobile menu is a fixed overlay so opening it
  // must not change --site-header-height (that caused resize feedback / blink).
  useEffect(() => {
    let observer;
    let rafId;

    const syncHeight = () => {
      const bar = topBarRef.current;
      if (!bar) return false;
      const h = Math.ceil(bar.getBoundingClientRect().height);
      setSpacerHeight((prev) => (prev === h ? prev : h));
      document.documentElement.style.setProperty("--site-header-height", `${h}px`);
      return true;
    };

    const attach = () => {
      if (!syncHeight()) {
        rafId = requestAnimationFrame(attach);
        return;
      }
      observer = new ResizeObserver(syncHeight);
      observer.observe(topBarRef.current);
    };

    attach();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const solActive = location.pathname.startsWith("/solutions");
  const productActive =
    location.pathname === "/product/manage-pdf" ||
    (location.pathname === "/" &&
      (location.hash === "#features" || location.hash === "#manage-pdf"));

  const navTriggerClass = (active) =>
    `flex items-center gap-1 text-sm font-medium transition-colors group-hover:text-[var(--c-ink)] ${
      active ? "text-[var(--c-ink)]" : "text-[var(--c-muted-fg)]"
    }`;

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header
        data-testid="site-header"
        className="site-header-fixed fixed inset-x-0 top-0 isolate z-[200] w-full border-b border-[var(--c-border)] bg-[var(--c-paper)]"
      >
        <div
          ref={topBarRef}
          className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-3.5"
        >
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <div className="group relative" data-testid="nav-product-menu">
              <button
                type="button"
                aria-haspopup="true"
                data-testid="nav-product-trigger"
                className={navTriggerClass(productActive)}
              >
                Product
                <span className="ml-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--c-accent)]">
                  2-in-1
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180" />
              </button>
              <div className={`${DESKTOP_PANEL} left-0 w-[min(280px,92vw)] pt-2`} data-testid="nav-product-panel-wrap">
                <div
                  className="overflow-hidden rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] p-2 shadow-[0_20px_50px_rgba(18,33,32,.14)]"
                  data-testid="nav-product-panel"
                >
                  <p className="border-b border-[var(--c-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--c-muted-fg)]">
                    E-signatures + Manage PDF · all paid plans
                  </p>
                  {PRODUCT_LINKS.map((p) => (
                    <FooterLink
                      key={p.label}
                      link={p}
                      className="flex rounded-[14px] px-3 py-2.5 text-sm font-semibold text-[var(--c-ink)] transition-all hover:bg-[var(--c-paper)]"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="group relative" data-testid="nav-solutions-menu">
              <button
                type="button"
                aria-haspopup="true"
                data-testid="nav-solutions-trigger"
                className={navTriggerClass(solActive)}
              >
                Solutions
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180" />
              </button>
              <div className={`${DESKTOP_PANEL} left-1/2 w-[min(640px,92vw)] -translate-x-1/2 pt-2`} data-testid="nav-solutions-panel-wrap">
                <div
                  className="overflow-hidden rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] shadow-[0_20px_50px_rgba(18,33,32,.14)]"
                  data-testid="nav-solutions-panel"
                >
                  <div className="flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-paper)] px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">By industry</p>
                    <Link
                      to="/solutions"
                      className="text-xs font-semibold text-[var(--c-primary)] hover:underline"
                      data-testid="nav-solutions-all"
                    >
                      View all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2">
                    {ALL_SOLUTIONS.map((s) => (
                      <Link
                        key={s.to}
                        to={s.to}
                        data-testid={solutionTestId(s.label)}
                        className="flex items-center gap-3 rounded-[14px] border border-transparent px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:bg-[var(--c-paper)] hover:shadow-md"
                      >
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                          style={{ background: "var(--badge-teal-bg)" }}
                        >
                          <s.icon className="h-4 w-4" style={{ color: "var(--badge-teal-fg)" }} />
                        </span>
                        <span className="text-sm font-semibold text-[var(--c-ink)]">{s.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {LINKS.map((l) => (
              <FooterLink
                key={l.label}
                link={l}
                className="text-sm font-medium text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]"
              />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <Link to="/login" className="hidden sm:block">
                <Button
                  variant="ghost"
                  data-testid="nav-signin-button"
                  className="font-medium text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
                >
                  Sign in
                </Button>
              </Link>
            )}
            <Link to={headerCta.to} className="shrink-0">
              <Button
                data-testid={headerCta.testId}
                className="h-9 px-3 text-sm sm:h-10 sm:px-4"
                style={{ background: "var(--c-ink-solid)", color: "#fff" }}
              >
                <span className="sm:hidden">{headerCta.shortLabel}</span>
                <span className="hidden sm:inline">{headerCta.label}</span>
              </Button>
            </Link>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--c-ink)] transition-colors hover:bg-[var(--c-paper-2)] md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="site-mobile-nav"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[199] bg-[var(--c-ink-solid)]/20 md:hidden"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            id="site-mobile-nav"
            data-testid="site-mobile-nav"
            className="site-header-mobile-nav fixed inset-x-0 z-[200] border-b border-[var(--c-border)] bg-[var(--c-paper)] shadow-[0_20px_48px_rgba(18,33,32,.12)] md:hidden"
            style={{ top: "var(--site-header-height, 64px)" }}
          >
            <nav className="mx-auto flex max-h-[calc(100dvh-var(--site-header-height,64px)-env(safe-area-inset-top,0px))] max-w-6xl flex-col gap-1 overflow-y-auto overscroll-contain cs-scroll px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">Product</p>
              <FooterLink
                link={{ label: "E-signatures", to: { pathname: "/", hash: "#features" } }}
                className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-[var(--c-ink)]"
                onNavigate={closeMenu}
              />
              <FooterLink
                link={{ label: "Manage PDF", to: "/product/manage-pdf" }}
                className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-[var(--c-ink)]"
                onNavigate={closeMenu}
              />
              <div className="my-2 border-t border-[var(--c-border)]" />
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">Solutions</p>
              <Link
                to="/solutions"
                className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-semibold text-[var(--c-primary)]"
                onClick={closeMenu}
              >
                All industries
              </Link>
              {ALL_SOLUTIONS.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-paper-2)]"
                  onClick={closeMenu}
                >
                  <s.icon className="h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                  {s.label}
                </Link>
              ))}
              <div className="my-2 border-t border-[var(--c-border)]" />
              {LINKS.map((l) => (
                <FooterLink
                  key={l.label}
                  link={l}
                  className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-[var(--c-ink)]"
                  onNavigate={closeMenu}
                />
              ))}
              {isLoggedIn ? (
                <Link
                  to={headerCta.to}
                  className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-[var(--c-ink)]"
                  onClick={closeMenu}
                >
                  {headerCta.label}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-[var(--c-ink)]"
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
      <div
        aria-hidden="true"
        data-testid="site-header-spacer"
        style={{ height: spacerHeight }}
      />
    </>
  );
};