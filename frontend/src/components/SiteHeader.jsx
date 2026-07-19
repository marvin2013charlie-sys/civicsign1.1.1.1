import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  NAV_MENU_SOLUTIONS,
  FEATURED_SOLUTION,
  FEATURED_TRUST,
  solutionTestId,
} from "@/lib/solutionsNav";
import { FooterLink } from "@/components/FooterLink";
import { getMarketingHeaderCta } from "@/lib/authPortal";

const PRODUCT_LINKS = [
  { label: "E-signatures", to: { pathname: "/", hash: "#features" } },
  { label: "Manage PDF", to: "/product/manage-pdf" },
  { label: "ID verification", comingSoon: true },
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
                      className={
                        p.comingSoon
                          ? "flex rounded-[14px] px-3 py-2.5 text-sm font-semibold"
                          : "flex rounded-[14px] px-3 py-2.5 text-sm font-semibold text-[var(--c-ink)] transition-all hover:bg-[var(--c-paper)]"
                      }
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
              <div
                className={`${DESKTOP_PANEL} left-1/2 w-[min(780px,94vw)] -translate-x-1/2 pt-2`}
                data-testid="nav-solutions-panel-wrap"
              >
                <div
                  className="overflow-hidden rounded-[24px] border border-[var(--c-border)] bg-[var(--card)] shadow-[0_24px_60px_rgba(18,33,32,.16)]"
                  data-testid="nav-solutions-panel"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Browse by industry */}
                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[var(--c-muted-fg)]">
                          Browse by industry
                        </p>
                        <Link
                          to="/solutions"
                          className="text-xs font-semibold text-[var(--c-primary)] hover:underline"
                          data-testid="nav-solutions-all"
                        >
                          View all →
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-0.5">
                        {NAV_MENU_SOLUTIONS.map((s) => {
                          const chip = s.chip || { bg: "var(--badge-teal-bg)", fg: "var(--badge-teal-fg)" };
                          return (
                            <Link
                              key={s.to}
                              to={s.to}
                              data-testid={solutionTestId(s.label)}
                              className="flex items-start gap-3 rounded-[14px] px-2.5 py-2.5 transition-all hover:bg-[var(--c-paper)]"
                            >
                              <span
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                                style={{ background: chip.bg }}
                              >
                                <s.icon className="h-[18px] w-[18px]" style={{ color: chip.fg }} strokeWidth={1.75} />
                              </span>
                              <span className="min-w-0 pt-0.5">
                                <span className="block text-[13.5px] font-semibold leading-tight text-[var(--c-ink)]">
                                  {s.label}
                                </span>
                                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--c-muted-fg)]">
                                  {s.shortBlurb || s.blurb}
                                </span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Most popular feature rail */}
                    {FEATURED_SOLUTION && (
                      <div
                        className="flex w-full flex-col justify-between gap-5 border-t border-[var(--c-border)] p-5 sm:p-6 lg:w-[280px] lg:shrink-0 lg:border-l lg:border-t-0"
                        style={{ background: "var(--c-ink-solid)", color: "#F8F7F2" }}
                        data-testid="nav-solutions-featured"
                      >
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[1.8px] text-[#2DD4BF]">
                            Most popular
                          </p>
                          <span
                            className="mt-4 inline-flex h-12 w-12 items-center justify-center rounded-[14px]"
                            style={{ background: "rgba(45,212,191,.18)" }}
                          >
                            <FEATURED_SOLUTION.icon
                              className="h-6 w-6"
                              style={{ color: "#2DD4BF" }}
                              strokeWidth={1.75}
                            />
                          </span>
                          <h3 className="mt-4 font-heading text-[22px] font-bold leading-tight tracking-[-0.02em]">
                            {FEATURED_SOLUTION.label}
                          </h3>
                          <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">
                            {FEATURED_SOLUTION.featuredBody || FEATURED_SOLUTION.blurb}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div
                            className="rounded-2xl border px-3.5 py-3"
                            style={{ borderColor: "rgba(248,247,242,.12)", background: "rgba(248,247,242,.06)" }}
                          >
                            <div className="flex items-start gap-2.5">
                              <FEATURED_TRUST.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD4BF]" />
                              <div>
                                <p className="text-[13px] font-semibold text-white">{FEATURED_TRUST.title}</p>
                                <p className="mt-0.5 text-[12px] text-white/55">{FEATURED_TRUST.body}</p>
                              </div>
                            </div>
                          </div>
                          <Link
                            to={FEATURED_SOLUTION.to}
                            className="inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-semibold transition-opacity hover:opacity-95"
                            style={{ background: "#2DD4BF", color: "#122120" }}
                            data-testid="nav-solutions-featured-cta"
                          >
                            Explore solutions →
                          </Link>
                        </div>
                      </div>
                    )}
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
              {PRODUCT_LINKS.map((p) => (
                <FooterLink
                  key={p.label}
                  link={p}
                  className={
                    p.comingSoon
                      ? "flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium"
                      : "flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-[var(--c-ink)]"
                  }
                  onNavigate={closeMenu}
                />
              ))}
              <div className="my-2 border-t border-[var(--c-border)]" />
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">Solutions</p>
              <Link
                to="/solutions"
                className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-semibold text-[var(--c-primary)]"
                onClick={closeMenu}
                data-testid="nav-solutions-all-mobile"
              >
                View all industries →
              </Link>
              {NAV_MENU_SOLUTIONS.map((s) => {
                const chip = s.chip || { bg: "var(--badge-teal-bg)", fg: "var(--c-primary)" };
                return (
                  <Link
                    key={s.to}
                    to={s.to}
                    className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-paper-2)]"
                    onClick={closeMenu}
                  >
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: chip.bg }}
                    >
                      <s.icon className="h-4 w-4" style={{ color: chip.fg }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{s.label}</span>
                      <span className="block text-[12px] font-normal text-[var(--c-muted-fg)]">
                        {s.shortBlurb || s.blurb}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {FEATURED_SOLUTION && (
                <Link
                  to={FEATURED_SOLUTION.to}
                  onClick={closeMenu}
                  className="mx-1 mt-1 flex flex-col gap-1 rounded-xl px-3 py-3 text-sm"
                  style={{ background: "var(--c-ink-solid)", color: "#F8F7F2" }}
                  data-testid="nav-solutions-featured-mobile"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2DD4BF]">Most popular</span>
                  <span className="font-semibold">{FEATURED_SOLUTION.label}</span>
                  <span className="text-[12px] text-white/65">Explore solutions →</span>
                </Link>
              )}
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