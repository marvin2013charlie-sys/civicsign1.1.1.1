import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

export const CookieBanner = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cs_cookie_consent")) setShow(true);
  }, []);
  const accept = (val) => {
    localStorage.setItem("cs_cookie_consent", val);
    setShow(false);
    window.dispatchEvent(new Event("cs-cookie-consent"));
  };
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] safe-right sm:p-4" data-testid="cookie-banner">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-4 shadow-[0_20px_48px_rgba(18,33,32,.16)] sm:flex-row sm:items-center">
        <div className="flex items-start gap-3 sm:flex-1">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            <Cookie className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-[var(--c-muted-fg)]">
            We use essential cookies to keep you signed in and optional cookies to improve CivicSign.
            Read our{" "}
            <Link to="/legal/cookies" className="font-semibold text-[var(--c-primary)] hover:underline">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link to="/legal/privacy" className="font-semibold text-[var(--c-primary)] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
          <Button
            variant="outline"
            className="border-[var(--c-border)] text-[var(--c-ink)]"
            onClick={() => accept("essential")}
            data-testid="cookie-essential-button"
          >
            Essential only
          </Button>
          <Button
            onClick={() => accept("all")}
            data-testid="cookie-accept-button"
            style={{ background: "var(--c-primary)", color: "#fff" }}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
};