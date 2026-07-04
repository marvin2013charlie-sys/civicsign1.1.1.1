import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Clock, ArrowRight, Tag, Search, X as XIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POSTS as STATIC_POSTS, CATEGORIES, fetchAllPosts } from "@/lib/blogPosts";

export default function Blog() {
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [posts, setPosts] = React.useState(STATIC_POSTS);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    fetchAllPosts().then((data) => { if (!cancelled) setPosts(data); });
    return () => { cancelled = true; };
  }, []);

  const byCategory = activeCategory === "All" ? posts : posts.filter((p) => p.category === activeCategory);
  const q = query.trim().toLowerCase();
  const visible = q
    ? byCategory.filter((p) => {
        const hay = `${p.title} ${p.excerpt} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
    : byCategory;
  const [featured, ...rest] = visible;

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #FFF7F0 0%, var(--c-paper) 60%)" }} />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]">
              <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> Resources · Blog
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              UK e-signature insights, <span style={{ color: "var(--c-primary)" }}>without the legalese.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-[var(--muted-foreground)]">
              Honest, UK-grounded writing on electronic signatures, GDPR, sector compliance and the boring back-office paperwork we&rsquo;re here to fix.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search + Category filter */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles by title, topic or category…"
            className="pl-9 pr-9 bg-[var(--card)]"
            data-testid="blog-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              data-testid="blog-search-clear"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--c-ink)]"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" data-testid="blog-categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              data-testid={`blog-category-${c.toLowerCase().replace(/\s|&/g, "-")}`}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c
                  ? "border-[var(--c-ink)] bg-[var(--c-ink-solid)] text-white"
                  : "border-[var(--c-border)] bg-[var(--c-paper)] text-[var(--c-ink)] hover:bg-[var(--c-paper-2)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Featured + grid */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--muted-foreground)]" data-testid="blog-empty-state">
            {q
              ? <>No articles match &ldquo;<b>{query}</b>&rdquo; — try a different keyword or clear the search.</>
              : "No posts in this category yet — try another filter."}
          </p>
        ) : (
          <>
            {/* Featured */}
            <Link
              to={`/blog/${featured.slug}`}
              className="group block overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] transition-shadow hover:shadow-xl"
              data-testid="blog-featured-card"
            >
              <div className="grid items-stretch gap-0 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <img src={featured.image} alt={featured.title} loading="lazy"
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] lg:h-full" />
                </div>
                <div className="flex flex-col justify-center p-7 lg:col-span-2 lg:p-10">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--c-primary)]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--c-primary)" }}>
                    <Tag className="h-3 w-3" /> {featured.category}
                  </span>
                  <h2 className="mt-3 font-heading text-2xl font-bold leading-tight text-[var(--c-ink)] sm:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{featured.excerpt}</p>
                  <div className="mt-5 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {featured.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {featured.readTime}</span>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
                    Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Rest */}
            {rest.length > 0 && (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    data-testid="blog-card"
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] transition-shadow hover:shadow-lg"
                  >
                    <div className="overflow-hidden">
                      <img src={p.image} alt={p.title} loading="lazy"
                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--c-ink)]">
                        {p.category}
                      </span>
                      <h3 className="mt-3 font-heading text-lg font-bold leading-snug text-[var(--c-ink)]">{p.title}</h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--muted-foreground)]">{p.excerpt}</p>
                      <div className="mt-4 flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.readTime}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink-solid)] p-10 text-center text-white sm:p-14">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Get UK e-signature insights, monthly.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">No spam, no fluff — just clear takes on UK e-signature law, product updates and tips for paperless British businesses.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact">
              <Button size="lg" data-testid="blog-newsletter-cta" style={{ background: "var(--c-primary)", color: "#fff" }}>
                Subscribe to the newsletter <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
