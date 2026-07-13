import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Search, X as XIcon } from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import {
  BlogEditorialStandards,
  BlogFeaturedCard,
  BlogHeroVisual,
  BlogInlineHeader,
  BlogMarquee,
  BlogPostCard,
  BlogSectionHeader,
  BlogStartHere,
  BlogTopicCollection,
  BlogVerifiedPillars,
  BLOG_CAVEAT_STYLE,
  BLOG_SURFACE_CARD,
} from "@/components/BlogShared";
import { POSTS as STATIC_POSTS, CATEGORIES, fetchAllPosts, sortPostsByDateDesc, normalizeBlogPost } from "@/lib/blogPosts";
import {
  CIVICSIGN_PRODUCT_FACTS,
  EDITORIAL_STANDARDS,
  START_HERE,
  TOPIC_COLLECTIONS,
  VERIFIED_PILLARS,
} from "@/lib/blogVerifiedContent";
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
  PAPER_TEXT,
  PRIMARY_CTA,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA,
  TRUST_BULLETS,
} from "@/lib/marketingUi";

const MARQUEE_TOPICS = [
  "Electronic Communications Act 2000", "UK eIDAS", "Law Commission 2019", "HM Land Registry PG 82",
  "HMRC Gift Aid", "Home Office RTW", "ICO UK GDPR", "AST agreements", "Audit trails",
  "SES · AES · QES", "Employment contracts", "Settlement agreements",
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [posts, setPosts] = useState(() => sortPostsByDateDesc(STATIC_POSTS.map((p) => normalizeBlogPost(p))));
  const [query, setQuery] = useState("");
  const [showCollections, setShowCollections] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;
    fetchAllPosts().then((data) => { if (!cancelled) setPosts(data); });
    return () => { cancelled = true; };
  }, []);

  const byCategory = activeCategory === "All" ? posts : posts.filter((p) => p.category === activeCategory);
  const q = query.trim().toLowerCase();
  const isFiltering = q.length > 0 || activeCategory !== "All";

  const visible = useMemo(() => {
    if (!q) return byCategory;
    return byCategory.filter((p) => {
      const hay = `${p.title} ${p.excerpt} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [byCategory, q]);

  useEffect(() => {
    setShowCollections(!isFiltering);
  }, [isFiltering]);

  const [featured, ...rest] = visible;

  const resultLabel = visible.length === 0
    ? "No matching articles"
    : `${visible.length} ${visible.length === 1 ? "article" : "articles"}${q ? " match your search" : activeCategory !== "All" ? ` in ${activeCategory}` : ""}`;

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]" data-testid="blog-page">
      <style>{`
        @keyframes blog-fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes blog-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion: reduce){.blog-anim{animation:none !important}}
      `}</style>
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <MarketingGradient />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="blog-anim" style={{ animation: "blog-fadeUp .7s ease both" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} aria-hidden />
              Resources · Blog
            </span>
            <div className="mt-4" style={{ ...BLOG_CAVEAT_STYLE, fontSize: "28px" }}>
              Verified at source
            </div>
            <h1 className="mt-1 font-heading text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl lg:text-5xl" style={H_FONT}>
              UK e-signature insights<span style={{ color: "var(--c-accent)" }}>.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--c-muted-fg)]">
              Honest, UK-grounded writing on electronic signatures, sector compliance and the back-office paperwork we&apos;re here to fix — every major claim linked to legislation or official guidance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={PRIMARY_CTA} style={PRIMARY_CTA_STYLE}>
                Start free <ArrowRight className="h-4 w-4" style={{ color: "#2DD4BF" }} />
              </Link>
              <Link to="/solutions" className={SECONDARY_CTA}>
                Industry solutions
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--c-muted-fg)]">
              {TRUST_BULLETS.map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>✓</span>{t}
                </span>
              ))}
            </div>
          </div>
          <BlogHeroVisual facts={CIVICSIGN_PRODUCT_FACTS} />
        </div>
      </section>

      <BlogMarquee items={MARQUEE_TOPICS} />
      <BlogVerifiedPillars pillars={VERIFIED_PILLARS} />
      <BlogStartHere items={START_HERE} posts={posts} />

      {showCollections && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20" data-testid="blog-topic-collections">
          <BlogSectionHeader
            eyebrow="Collections"
            title="Browse by topic"
            sub="Curated reading paths for UK law, property, HR, compliance and charities — with links to matching CivicSign solutions."
          />
          <div className="mt-12 space-y-14">
            {TOPIC_COLLECTIONS.map((collection) => (
              <BlogTopicCollection key={collection.category} collection={collection} posts={posts} />
            ))}
          </div>
        </section>
      )}

      <BlogEditorialStandards standards={EDITORIAL_STANDARDS} />

      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
        <BlogSectionHeader
          eyebrow="Archive"
          title="All articles"
          sub="Search the full library or filter by category."
        />

        <div className={`relative mt-8 rounded-2xl p-1.5 ${BLOG_SURFACE_CARD}`}>
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted-fg)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles by title, topic or category…"
            className="h-11 w-full rounded-xl border-0 bg-transparent py-3 pl-10 pr-10 text-sm text-[var(--c-ink)] outline-none placeholder:text-[var(--c-muted-fg)] focus:ring-0"
            data-testid="blog-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              data-testid="blog-search-clear"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px] w-fit" data-testid="blog-categories">
          {CATEGORIES.map((c) => {
            const active = activeCategory === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                data-testid={`blog-category-${c.toLowerCase().replace(/\s|&/g, "-")}`}
                className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all sm:px-4"
                style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        {visible.length === 0 ? (
          <div className={`rounded-2xl border border-dashed py-16 text-center ${BLOG_SURFACE_CARD}`} data-testid="blog-empty-state">
            <span
              className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "var(--badge-teal-bg)" }}
            >
              <BookOpen className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-[var(--c-muted-fg)]">
              {q
                ? <>No articles match &ldquo;<b className="text-[var(--c-ink)]">{query}</b>&rdquo; — try another keyword.</>
                : "No posts in this category yet — try another filter."}
            </p>
          </div>
        ) : (
          <>
            {featured && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <BlogInlineHeader
                    eyebrow={isFiltering ? "Results" : "Latest"}
                    title={activeCategory === "All" && !q ? "Featured article" : activeCategory}
                    sub={q ? resultLabel : undefined}
                  />
                </div>
                <div className="mt-8">
                  <BlogFeaturedCard post={featured} />
                </div>
              </>
            )}
            {rest.length > 0 && (
              <>
                <div className="mt-16 flex flex-wrap items-end justify-between gap-4">
                  <BlogInlineHeader eyebrow="More" title="Keep reading" />
                  <p className="text-sm text-[var(--c-muted-fg)]">{rest.length} article{rest.length === 1 ? "" : "s"}</p>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <BlogPostCard key={p.slug} post={p} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Stay in the loop</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              UK e-signature insights, monthly<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              No spam, no fluff — clear takes on UK law, product updates and tips for paperless British businesses.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/contact" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE} data-testid="blog-newsletter-cta">
                Subscribe via Contact →
              </Link>
              <Link
                to="/register"
                className={CTA_SECONDARY_BTN}
                style={{ borderColor: "rgba(248,247,242,.28)", color: PAPER_TEXT }}
              >
                Start free
              </Link>
            </div>
          </div>
        </MarketingCtaBanner>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}