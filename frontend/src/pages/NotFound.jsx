import React from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      <SiteHeader />
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">404</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-[var(--c-ink)]">Page not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--c-muted-fg)]">
          The link may be broken or the page may have moved. Check the URL or head back home.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Go back
        </Button>
        <Link to="/">
          <Button style={{ background: "var(--c-primary)", color: "#fff" }}>
            <Home className="mr-1.5 h-4 w-4" /> Home
          </Button>
        </Link>
      </div>
      </div>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}