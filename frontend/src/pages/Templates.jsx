import React from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Sparkles, ArrowLeft, Bell } from "lucide-react";

export default function Templates() {
  return (
    <AppShell title="Templates">
      <div className="mx-auto max-w-2xl" data-testid="templates-coming-soon">
        <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--card)] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--c-primary)18" }}>
            <LayoutTemplate className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
          </div>

          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--c-ink)]">
            <Sparkles className="h-3 w-3" style={{ color: "var(--c-primary)" }} /> Coming soon
          </span>

          <h2 className="mt-4 font-heading text-3xl font-bold text-[var(--c-ink)]">
            Reusable templates for your team.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
            Save any document as a template with roles and fields already placed, then send it
            again and again in seconds. We&rsquo;re putting the finishing touches on it now.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/dashboard">
              <Button variant="outline" data-testid="templates-back-btn">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to dashboard
              </Button>
            </Link>
            <Link to="/contact">
              <Button data-testid="templates-notify-btn" style={{ background: "var(--c-primary)", color: "#fff" }}>
                <Bell className="mr-1.5 h-4 w-4" /> Tell me when it&rsquo;s ready
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
