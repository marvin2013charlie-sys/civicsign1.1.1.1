import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  PenLine,
  PenTool,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner, MarketingDarkSection } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { MarketingFaqSection } from "@/components/MarketingFaqSection";
import {
  PDF_CATEGORIES,
  PDF_HOME_TOOLS,
  PDF_TOOL_GROUPS,
  toolMatchesSearch,
} from "@/lib/managePdfTools";
import {
  CTA_ACTIONS_CLASS,
  CTA_HEADLINE_CLASS,
  CTA_PRIMARY_BTN,
  CTA_PRIMARY_BTN_STYLE,
  CTA_SCRIPT_STYLE,
  CTA_SECONDARY_BTN,
  CTA_SECTION,
  CTA_SUBTEXT_CLASS,
  H_FONT,
  INK,
  MARKETING_CARD,
  PAPER_TEXT,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

const WORKFLOW_STEPS = [
  { icon: PenTool, text: "Pick a tool and upload your file" },
  { icon: Save, text: "Download or save to Documents" },
  { icon: PenLine, text: "Open in Prepare Studio to place fields" },
  { icon: Send, text: "Send for signature when ready" },
];

const FAQS = [
  [
    "Is Manage PDF included on every plan?",
    "Manage PDF is included with every paid plan — Pro, Business, and Organisation. It is not available on the Free plan.",
  ],
  [
    "Do saved PDFs count toward my send limit?",
    "No. Files saved from Manage PDF do not count toward your monthly envelope allowance. Only sent envelopes do.",
  ],
  [
    "Can I send for signature after editing a PDF?",
    "Yes. Save to Documents → From Manage PDF, then open the file in Prepare Studio to add signature fields and send.",
  ],
  [
    "What tools are included?",
    "Edit, merge, split, compress, watermark, protect, unlock, PDF to Word, Word to PDF, and AI metadata check — all in one workspace.",
  ],
];

function ManagePdfToolCard({ tool, groupLabel }) {
  const Icon = tool.icon;
  return (
    <div
      className={`${MARKETING_CARD} flex h-full flex-col p-6`}
      data-testid={`manage-pdf-product-tool-${tool.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]"
          style={{ background: "var(--badge-teal-bg)" }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        {groupLabel && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "var(--badge-coral-bg)", color: "var(--badge-coral-fg)" }}
          >
            {groupLabel}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--c-ink)]" style={H_FONT}>
        {tool.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{tool.description}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--c-primary)]">
        {tool.cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </div>
  );
}

export default function ManagePdfProduct() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const q = search.trim().toLowerCase();
  const byCategory = category === "all"
    ? PDF_HOME_TOOLS
    : PDF_HOME_TOOLS.filter((t) => t.category === category);
  const filtered = byCategory.filter((t) => toolMatchesSearch(t, q));

  return (
    <div className="min-h-screen bg-[var(--c-paper)]" data-testid="manage-pdf-product-page">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
                <FileText className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                2-in-1 platform
              </span>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px]"
                style={{ background: "var(--badge-coral-bg)", color: "var(--badge-coral-fg)" }}
              >
                All paid plans
              </span>
            </div>
            <div
              className="mt-5"
              style={{ fontFamily: "'Caveat', cursive", fontSize: "30px", fontWeight: 600, color: "var(--c-primary-hover)" }}
            >
              Fix the PDF. Then sign it.
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-5xl lg:text-[56px]" style={H_FONT}>
              Manage PDF<span style={{ color: "var(--c-accent)" }}>.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--c-muted-fg)]">
              Ten professional PDF tools in one UK workspace — edit, compress, watermark, protect, merge, split, convert, and scan.
              Save straight to Documents, then send for signature without switching apps.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link to="/register" className={`${PRIMARY_CTA} w-full justify-center sm:w-auto`} style={PRIMARY_CTA_STYLE} data-testid="manage-pdf-product-cta-register">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className={`${SECONDARY_CTA} w-full justify-center sm:w-auto`} data-testid="manage-pdf-product-cta-login">
                Sign in
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((b) => (
                <li key={b} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div
          className="flex flex-wrap items-center justify-center gap-3 rounded-[20px] border border-[var(--c-border)] bg-[var(--card)] px-6 py-5 text-center text-sm font-medium text-[var(--c-muted-fg)]"
          data-testid="manage-pdf-product-workflow"
        >
          <span className="font-semibold text-[var(--c-ink)]">One workflow</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>Manage PDF</span>
          <span style={{ color: "var(--c-primary)" }}>→</span>
          <span>Documents</span>
          <span style={{ color: "var(--c-primary)" }}>→</span>
          <span>Prepare Studio</span>
          <span style={{ color: "var(--c-primary)" }}>→</span>
          <span className="font-semibold text-[var(--badge-teal-fg)]">Signed &amp; sealed</span>
        </div>
      </section>

      {/* Tools */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="max-w-xl min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[2px] text-[var(--badge-teal-fg)]">Every PDF tool</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl" style={H_FONT}>
              The full toolkit<span style={{ color: "var(--c-accent)" }}>.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">
              Same tools you get inside the app — browse by category or search below.
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="h-11 w-full rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-4 text-sm text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-muted-fg)] focus:border-[var(--c-primary)] sm:max-w-xs"
            data-testid="manage-pdf-product-search"
          />
        </div>

        <div
          className="mt-6 flex w-full max-w-full flex-wrap gap-1 rounded-full border border-[var(--c-border)] bg-[var(--card)] p-1 sm:w-fit sm:gap-0 sm:p-[3px]"
          data-testid="manage-pdf-product-category-filter"
        >
          {PDF_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                data-testid={`manage-pdf-product-category-${cat.id}`}
                className="min-h-[44px] rounded-full px-3 py-2 text-xs font-semibold transition-all sm:min-h-0 sm:px-4 sm:py-1.5"
                style={active ? { background: INK, color: "#fff" } : { color: "var(--c-muted-fg)" }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-6">
          {filtered.length === 0 ? (
            <div className={`${MARKETING_CARD} px-6 py-16 text-center`}>
              <p className="font-heading text-lg font-semibold text-[var(--c-ink)]">No tools match your search</p>
              <p className="mt-2 text-sm text-[var(--c-muted-fg)]">Try &quot;compress&quot;, &quot;merge&quot;, or &quot;watermark&quot;.</p>
            </div>
          ) : category === "all" ? (
            PDF_TOOL_GROUPS.map((group) => {
              const tools = filtered.filter((t) => t.category === group.id);
              if (!tools.length) return null;
              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-[20px] border border-[var(--c-border)] bg-[var(--card)]"
                  data-testid={`manage-pdf-product-group-${group.id}`}
                >
                  <div className="flex items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-4">
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] text-base"
                      style={{ background: group.bg }}
                      aria-hidden
                    >
                      {group.emoji}
                    </span>
                    <h3 className="font-heading text-base font-semibold text-[var(--c-ink)]">{group.label}</h3>
                    <span className="ml-auto rounded-full bg-[var(--c-paper)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
                      {tools.length} tool{tools.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    {tools.map((tool) => (
                      <ManagePdfToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((tool) => {
                const group = PDF_TOOL_GROUPS.find((g) => g.id === tool.category);
                return <ManagePdfToolCard key={tool.id} tool={tool} groupLabel={group?.label} />;
              })}
            </div>
          )}
        </div>
      </section>

      {/* Why 2-in-1 */}
      <MarketingDarkSection className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div style={{ color: PAPER_TEXT }}>
            <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#2DD4BF" }}>
              Why teams choose CivicSign
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={H_FONT}>
              One platform — not two subscriptions<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "rgba(248,247,242,.7)" }}>
              Compress a tenancy pack, watermark it CONFIDENTIAL, merge appendices, then drop signature fields and send — all without exporting to another PDF editor or e-sign tool.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Saved PDFs live under Documents → From Manage PDF",
                "Open any saved file in Prepare Studio when you are ready to send",
                "Court-ready audit trail on every completed envelope",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(248,247,242,.82)" }}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#2DD4BF" }} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[20px] border p-6" style={{ borderColor: "rgba(248,247,242,.14)", background: "rgba(248,247,242,.04)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-[1.5px]" style={{ color: "rgba(248,247,242,.55)" }}>
              Typical workflow
            </h3>
            <ol className="mt-4 space-y-4">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={step.text} className="flex items-start gap-3 text-sm" style={{ color: PAPER_TEXT }}>
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "rgba(45,212,191,.18)", color: "#2DD4BF" }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex items-center gap-2 pt-1">
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "#2DD4BF" }} />
                      {step.text}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" style={{ color: "#2DD4BF" }} />
              <span className="text-xs font-medium" style={{ color: "rgba(248,247,242,.6)" }}>
                Included on Pro, Business &amp; Organisation — not on Free
              </span>
            </div>
          </div>
        </div>
      </MarketingDarkSection>

      <MarketingFaqSection
        id="manage-pdf-faq"
        eyebrow="Manage PDF"
        title="Common questions"
        faqs={FAQS}
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
      />

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <p style={CTA_SCRIPT_STYLE}>Ready to prepare and sign?</p>
          <h2 className={CTA_HEADLINE_CLASS} style={H_FONT}>
            Start with Manage PDF on any paid plan
          </h2>
          <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.72)" }}>
            Create your account, upgrade when you need the full 2-in-1 toolkit, and send your first document in minutes.
          </p>
          <div className={CTA_ACTIONS_CLASS}>
            <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE} data-testid="manage-pdf-product-bottom-cta">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={CTA_SECONDARY_BTN} style={{ borderColor: "rgba(248,247,242,.22)", color: PAPER_TEXT }}>
              View pricing
            </Link>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <CookieBanner />
      <FloatingAssistant />
    </div>
  );
}