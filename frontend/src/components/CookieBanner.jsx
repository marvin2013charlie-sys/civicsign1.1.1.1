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
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4" data-testid="cookie-banner">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink-solid)] p-4 text-white shadow-2xl sm:flex-row">
        <Cookie className="h-6 w-6 shrink-0" style={{ color: "#7fe9dd" }} />
        <p className="flex-1 text-sm text-white/85">
          We use cookies to keep you signed in and to improve CivicSign. See our{" "}
          <Link to="/cookies" className="underline" style={{ color: "#7fe9dd" }}>Cookie Policy</Link>.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => accept("essential")} data-testid="cookie-essential-button">Essential only</Button>
          <Button onClick={() => accept("all")} data-testid="cookie-accept-button" style={{ background: "var(--c-primary)", color: "#fff" }}>Accept all</Button>
        </div>
      </div>
    </div>
  );
};
