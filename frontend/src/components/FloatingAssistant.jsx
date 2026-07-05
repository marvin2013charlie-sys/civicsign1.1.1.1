import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, HelpCircle, LifeBuoy, FileSignature, CreditCard, ScrollText, ArrowRight, Mail } from "lucide-react";

// A lightweight help launcher for public pages. It surfaces the most common
// questions as quick answers plus links to the right pages — no AI, no chat.
const HELP_ITEMS = [
  {
    icon: FileSignature,
    title: "Send a document",
    body: "Dashboard → New Envelope → upload a PDF or Word file, drag your fields in the Prepare Studio, add recipients and hit Send.",
    to: "/register",
    cta: "Start free",
  },
  {
    icon: CreditCard,
    title: "Plans & pricing",
    body: "Free £0 · Pro £15/mo · Business is tailored to your team. Manage plans under Settings → Subscription.",
    to: "/",
    cta: "See plans",
  },
  {
    icon: ScrollText,
    title: "Is it legal in the UK?",
    body: "Yes — e-signatures are generally valid under the Electronic Communications Act 2000 and UK eIDAS, with a tamper-evident audit trail on every document.",
    to: "/about",
    cta: "Learn more",
  },
];

export const FloatingAssistant = () => {
  const [open, setOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(
    () => !localStorage.getItem("cs_cookie_consent")
  );

  useEffect(() => {
    const onConsent = () => setBannerVisible(false);
    window.addEventListener("cs-cookie-consent", onConsent);
    return () => window.removeEventListener("cs-cookie-consent", onConsent);
  }, []);

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help"}
        data-testid="floating-assistant-toggle"
        className={`fixed ${bannerVisible ? "bottom-[190px] sm:bottom-28" : "bottom-5"} right-5 z-[300] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-[bottom,transform] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
        style={{ background: "var(--c-primary)", boxShadow: "0 10px 30px rgba(20,184,166,0.4)" }}
      >
        {open ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
      </button>

      {/* Help panel */}
      {open && (
        <div
          data-testid="floating-assistant-panel"
          className={`fixed ${bannerVisible ? "bottom-[270px] sm:bottom-[184px] h-[min(560px,calc(100vh-290px))] sm:h-[min(560px,calc(100vh-204px))]" : "bottom-24 h-[min(560px,75vh)]"} right-5 z-[300] flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] shadow-2xl`}
          style={{ animation: "cs-pop 200ms ease-out" }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-4 py-3" style={{ background: "var(--c-ink-solid)" }}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)" }}>
              <LifeBuoy className="h-4 w-4 text-white" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Help &amp; resources</p>
              <p className="text-xs text-white/60">Quick answers · UK e-signatures</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" data-testid="floating-assistant-close"
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 cs-scroll" data-testid="floating-assistant-messages">
            {HELP_ITEMS.map(({ icon: Icon, title, body, to, cta }) => (
              <div key={title} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-3.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                  <p className="text-sm font-semibold text-[var(--c-ink)]">{title}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted-foreground)]">{body}</p>
                <Link to={to} onClick={() => setOpen(false)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--c-primary)] transition-opacity hover:opacity-80">
                  {cta} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--c-border)] p-3">
            <Link to="/contact" onClick={() => setOpen(false)} data-testid="floating-assistant-contact"
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--c-primary)" }}>
              <Mail className="h-4 w-4" /> Contact our team
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
