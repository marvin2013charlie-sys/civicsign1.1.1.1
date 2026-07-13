import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Landmark,
  Lightbulb,
  List,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { MarketingDarkSection, MarketingInkSurface } from "@/components/MarketingDarkBand";
import { H_FONT } from "@/lib/marketingUi";
import { slugifyHeading } from "@/lib/blogVerifiedContent";
import { isSafeExternalHref } from "@/lib/safeUrl";

export const BLOG_CAVEAT_STYLE = {
  fontFamily: "'Caveat', cursive",
  fontSize: "24px",
  fontWeight: 600,
  color: "var(--c-primary-hover)",
};

export const BLOG_SURFACE_CARD = "cs-portal-surface-card rounded-2xl";
export const BLOG_SURFACE_INTERACTIVE = `${BLOG_SURFACE_CARD} transition-all hover:-translate-y-0.5 hover:shadow-lg`;

const CATEGORY_STYLE = {
  "UK Law": { bg: "var(--badge-teal-bg)", fg: "var(--badge-teal-fg)" },
  "Real Estate": { bg: "var(--badge-coral-bg)", fg: "var(--badge-coral-fg)" },
  Charities: { bg: "var(--badge-warning-bg)", fg: "var(--badge-warning-fg)" },
  "HR & People": { bg: "var(--badge-coral-bg)", fg: "var(--badge-coral-fg)" },
  Compliance: { bg: "var(--badge-teal-bg)", fg: "var(--badge-teal-fg)" },
  "Product Updates": { bg: "var(--badge-warning-bg)", fg: "var(--badge-warning-fg)" },
  "Customer Stories": { bg: "var(--badge-coral-bg)", fg: "var(--badge-coral-fg)" },
};

export function blogCategoryStyle(category) {
  return CATEGORY_STYLE[category] || { bg: "var(--badge-teal-bg)", fg: "var(--badge-teal-fg)" };
}

export function BlogInlineHeader({ eyebrow, title, sub }) {
  return (
    <div>
      <p style={BLOG_CAVEAT_STYLE}>{eyebrow}</p>
      <h2 className="mt-0.5 font-heading text-2xl font-bold tracking-[-0.03em] text-[var(--c-ink)] sm:text-3xl" style={H_FONT}>
        {title}<span style={{ color: "var(--c-accent)" }}>.</span>
      </h2>
      {sub ? <p className="mt-2 text-sm text-[var(--c-muted-fg)]">{sub}</p> : null}
    </div>
  );
}

export function BlogBackLink() {
  return (
    <Link
      to="/blog"
      className="group mb-6 inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)]/80 px-3 py-1.5 text-[12px] font-semibold text-[var(--c-muted-fg)] shadow-sm backdrop-blur transition-all hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
      data-testid="blogpost-back-link"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
      All articles
    </Link>
  );
}

export function BlogCategoryPill({ category, size = "sm" }) {
  const { bg, fg } = blogCategoryStyle(category);
  const cls = size === "lg"
    ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1.5px]"
    : "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider";
  return (
    <span className={cls} style={{ background: bg, color: fg }}>
      {size === "lg" && <Tag className="h-3 w-3" aria-hidden />}
      {category}
    </span>
  );
}

export function BlogMeta({ date, readTime, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--c-muted-fg)] ${className}`.trim()}>
      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden /> {date}</span>
      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {readTime}</span>
    </div>
  );
}

export function BlogFeaturedCard({ post, testId = "blog-featured-card" }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group block overflow-hidden ${BLOG_SURFACE_INTERACTIVE}`}
      style={{ borderLeft: "3px solid var(--c-primary)" }}
      data-testid={testId}
    >
      <div className="grid items-stretch lg:grid-cols-5">
        <div className="relative overflow-hidden lg:col-span-3">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] lg:h-full lg:min-h-[320px]"
          />
          <span className="absolute left-4 top-4 rounded-full bg-[var(--card)]/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--badge-teal-fg)] shadow-sm backdrop-blur">
            Featured
          </span>
        </div>
        <div className="flex flex-col justify-center p-7 lg:col-span-2 lg:p-9">
          <BlogCategoryPill category={post.category} size="lg" />
          <h2 className="mt-4 font-heading text-2xl font-bold leading-tight tracking-[-0.02em] text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-primary-hover)] sm:text-3xl" style={H_FONT}>
            {post.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted-fg)]">{post.excerpt}</p>
          <BlogMeta date={post.date} readTime={post.readTime} className="mt-5" />
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-primary)]">
            Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BlogPostCard({ post, testId = "blog-card" }) {
  return (
    <Link to={`/blog/${post.slug}`} className={`group flex h-full flex-col overflow-hidden ${BLOG_SURFACE_INTERACTIVE}`} data-testid={testId}>
      <div className="overflow-hidden">
        <img
          src={post.image}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <BlogCategoryPill category={post.category} />
        <h3 className="mt-3 font-heading text-lg font-bold leading-snug tracking-[-0.02em] text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-primary-hover)]" style={H_FONT}>
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{post.excerpt}</p>
        <BlogMeta date={post.date} readTime={post.readTime} className="mt-4" />
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-primary)]">
          Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function BlogArticleBlock({ block }) {
  if (block.type === "h2") {
    const id = slugifyHeading(block.content);
    return (
      <h2
        id={id}
        className="scroll-mt-28 mt-12 font-heading text-2xl font-bold leading-tight tracking-[-0.03em] text-[var(--c-ink)] first:mt-0 sm:text-3xl"
        style={H_FONT}
      >
        {block.content}
      </h2>
    );
  }
  if (block.type === "h3") {
    const id = slugifyHeading(block.content);
    return (
      <h3
        id={id}
        className="scroll-mt-28 mt-8 font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--c-ink)]"
        style={H_FONT}
      >
        {block.content}
      </h3>
    );
  }
  if (block.type === "p") {
    return <p className="mt-4 text-[17px] leading-[1.75] text-[var(--c-muted-fg)]">{block.content}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="mt-5 space-y-3">
        {block.content.map((item, i) => {
          const label = typeof item === "string" ? item : item?.text;
          const href = typeof item === "object" && item?.href ? item.href : null;
          return (
            <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-[var(--c-muted-fg)]">
              <span className="mt-2.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--c-primary)" }} aria-hidden />
              <span>
                {href && isSafeExternalHref(href) ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--c-primary)] underline decoration-[var(--c-primary)]/30 underline-offset-2 hover:decoration-[var(--c-primary)]"
                  >
                    {label}
                  </a>
                ) : (
                  label
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  if (block.type === "callout") {
    return (
      <div
        className={`mt-6 border-l-4 p-5 sm:p-6 ${BLOG_SURFACE_CARD}`}
        style={{ borderLeftColor: "var(--c-primary)" }}
      >
        <p className="flex items-start gap-3 text-[15px] font-medium leading-relaxed text-[var(--c-ink)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--badge-teal-bg)" }}>
            <Lightbulb className="h-4 w-4" style={{ color: "var(--badge-teal-fg)" }} aria-hidden />
          </span>
          <span>{block.content}</span>
        </p>
      </div>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote
        className="mt-6 rounded-2xl border-l-4 bg-[var(--c-paper-2)] px-6 py-5 italic leading-relaxed text-[var(--c-ink)]"
        style={{ borderLeftColor: "var(--c-accent)" }}
      >
        &ldquo;{block.content}&rdquo;
      </blockquote>
    );
  }
  return null;
}

export function BlogMarquee({ items }) {
  return (
    <section className="overflow-hidden border-y border-[var(--c-border)] bg-[var(--card)] py-4" aria-hidden="true">
      <div
        className="blog-anim flex w-max gap-[72px] whitespace-nowrap text-[14px] font-semibold text-[var(--c-muted-fg)]/60"
        style={{ ...H_FONT, animation: "blog-marquee 32s linear infinite" }}
      >
        {[...items, ...items].map((t, i) => (
          <span key={`${t}-${i}`}>{t}</span>
        ))}
      </div>
    </section>
  );
}

export function BlogSectionHeader({ eyebrow, title, sub, align = "center" }) {
  const alignCls = align === "left" ? "text-left" : "text-center";
  const subCls = align === "left"
    ? "mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]"
    : "mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--c-muted-fg)]";
  return (
    <div className={alignCls}>
      <p style={BLOG_CAVEAT_STYLE}>{eyebrow}</p>
      <h2 className="mt-0.5 font-heading text-2xl font-bold leading-[1.1] tracking-[-0.03em] text-[var(--c-ink)] sm:text-3xl lg:text-4xl" style={H_FONT}>
        {title}<span style={{ color: "var(--c-accent)" }}>.</span>
      </h2>
      {sub && <p className={subCls}>{sub}</p>}
    </div>
  );
}

export function BlogVerifiedPillars({ pillars }) {
  return (
    <MarketingDarkSection
      className="relative overflow-hidden border-b border-[var(--c-border)]"
      data-testid="blog-verified-pillars"
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 300px at 50% 0%, rgba(45,212,191,.1), transparent)" }} />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold" style={{ borderColor: "rgba(248,247,242,.2)", color: "#2DD4BF" }}>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Verified against primary UK sources
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed" style={{ color: "rgba(248,247,242,.6)" }}>
            Every pillar below links to legislation or official regulator guidance — not marketing copy.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <a
              key={p.label}
              href={isSafeExternalHref(p.source.href) ? p.source.href : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:border-[#2DD4BF]/40 hover:shadow-lg"
              style={{ borderColor: "rgba(248,247,242,.12)", background: "rgba(248,247,242,.04)" }}
              {...(!isSafeExternalHref(p.source.href) ? { "aria-disabled": true, onClick: (e) => e.preventDefault() } : {})}
            >
              <div className="text-[28px] font-bold" style={{ ...H_FONT, color: p.color }}>{p.value}</div>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(248,247,242,.72)" }}>{p.label}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2DD4BF] group-hover:underline">
                {p.source.label} <ExternalLink className="h-3 w-3" aria-hidden />
              </span>
            </a>
          ))}
        </div>
      </div>
    </MarketingDarkSection>
  );
}

export function BlogHeroVisual({ facts }) {
  return (
    <div className="blog-anim relative" style={{ animation: "blog-fadeUp .7s .12s ease both" }}>
      <div
        className="absolute rounded-3xl opacity-[.14]"
        style={{ inset: "28px -24px -24px 28px", background: "linear-gradient(135deg,#14B8A6,#0D9488)", transform: "rotate(2deg)" }}
      />
      <div className={`relative p-7 ${BLOG_SURFACE_CARD}`} style={{ boxShadow: "0 30px 70px rgba(18,33,32,.12)" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--badge-teal-bg)" }}>
            <BookMarked className="h-6 w-6" style={{ color: "var(--badge-teal-fg)" }} aria-hidden />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-[var(--c-ink)]" style={H_FONT}>CivicSign Editorial</div>
            <div className="text-[12px] text-[var(--c-muted-fg)]">UK law · Sector guides · Product updates</div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{f.label}</div>
              <div className="mt-0.5 text-[13.5px] font-semibold text-[var(--c-ink)]">{f.value}</div>
              <div className="mt-0.5 text-[11px] text-[var(--c-muted-fg)]">{f.detail}</div>
            </div>
          ))}
        </div>
        <MarketingInkSurface className="mt-5 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#2DD4BF" }}>
            <Landmark className="h-4 w-4" aria-hidden /> Sources we cite
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/70">
            legislation.gov.uk · gov.uk practice guides · HMRC · ICO · Home Office employer guidance
          </p>
        </MarketingInkSurface>
      </div>
    </div>
  );
}

export function BlogStartHere({ items, posts }) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const entries = items.map((item) => ({ ...item, post: bySlug.get(item.slug) })).filter((e) => e.post);

  if (!entries.length) return null;

  return (
    <section className="border-b border-[var(--c-border)] bg-[var(--c-paper)]" data-testid="blog-start-here">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <BlogSectionHeader
          eyebrow="Start here"
          title="Cornerstone guides"
          sub="Four articles that answer the questions UK teams ask first — each anchored to a verified fact and primary source."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {entries.map(({ post, fact, source }) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className={`group flex h-full flex-col p-6 sm:p-7 ${BLOG_SURFACE_INTERACTIVE}`}
              style={{ borderLeft: "3px solid var(--c-primary)" }}
              data-testid={`blog-start-here-${post.slug}`}
            >
              <BlogCategoryPill category={post.category} />
              <h3 className="mt-3 font-heading text-lg font-bold leading-snug tracking-[-0.02em] text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-primary-hover)] sm:text-xl" style={H_FONT}>
                {post.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--c-muted-fg)]">{fact}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--c-primary)]">
                <ExternalLink className="h-3 w-3" aria-hidden />
                {source.label}
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-primary)]">
                Read guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogTopicCollection({ collection, posts }) {
  const items = collection.slugs
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter(Boolean);

  if (!items.length) return null;

  return (
    <div className="border-t border-[var(--c-border)] pt-14 first:border-t-0 first:pt-0" data-testid={`blog-collection-${collection.category.toLowerCase().replace(/\s|&/g, "-")}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <BlogSectionHeader align="left" eyebrow={collection.category} title={collection.title} sub={collection.description} />
        {collection.solutionTo && (
          <Link
            to={collection.solutionTo}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-4 py-2 text-xs font-semibold text-[var(--c-primary)] transition-colors hover:border-[var(--c-primary)]"
          >
            {collection.solutionLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <BlogPostCard key={p.slug} post={p} testId={`blog-collection-card-${p.slug}`} />
        ))}
      </div>
    </div>
  );
}

export function BlogEditorialStandards({ standards }) {
  return (
    <section className="border-y border-[var(--c-border)] bg-[var(--c-paper-2)]" data-testid="blog-editorial-standards">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <BlogSectionHeader eyebrow={standards.eyebrow} title={standards.title} sub={standards.intro} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {standards.points.map((pt) => (
            <div key={pt.title} className={`p-6 sm:p-7 ${BLOG_SURFACE_CARD}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--badge-teal-bg)" }}>
                  <CheckCircle2 className="h-4 w-4" style={{ color: "var(--badge-teal-fg)" }} aria-hidden />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-[var(--c-ink)]" style={H_FONT}>{pt.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">{pt.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-[13px] leading-relaxed text-[var(--c-muted-fg)]">
          {standards.disclaimer}
        </p>
      </div>
    </section>
  );
}

export function BlogTableOfContents({ headings }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? null);

  useEffect(() => {
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav className={`p-5 sm:p-6 ${BLOG_SURFACE_CARD}`} aria-label="Table of contents" data-testid="blogpost-toc">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--c-muted-fg)]">
        <List className="h-3.5 w-3.5" aria-hidden />
        On this page
      </div>
      <ol className="mt-4 space-y-2">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
            <a
              href={`#${h.id}`}
              className={`block rounded-lg px-2 py-1 text-sm leading-snug transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-primary)] ${
                activeId === h.id ? "font-semibold text-[var(--c-primary)]" : "text-[var(--c-muted-fg)]"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BlogSourcesPanel({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className={`mt-6 p-6 sm:p-7 ${BLOG_SURFACE_CARD}`} style={{ borderLeft: "3px solid var(--c-primary)" }} data-testid="blogpost-sources">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--c-muted-fg)]">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Sources &amp; further reading
      </div>
      <ul className="mt-4 space-y-3">
        {sources.map((s) => (
          <li key={s.href}>
            {isSafeExternalHref(s.href) ? (
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-sm font-medium text-[var(--c-primary)] underline decoration-[var(--c-primary)]/30 underline-offset-2 hover:decoration-[var(--c-primary)]"
              >
                <span>{s.label}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              </a>
            ) : (
              <span className="text-sm text-[var(--c-muted-fg)]">{s.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Single render path for any post body — static or staff-published via the API. */
export function BlogArticleContent({ post, editorial, sources, solutionLink }) {
  const body = Array.isArray(post?.body) ? post.body : [];

  return (
    <>
      <div className={`px-6 py-8 sm:px-8 sm:py-10 ${BLOG_SURFACE_CARD}`}>
        {body.map((block, i) => (
          <BlogArticleBlock key={`${block.type}-${i}`} block={block} />
        ))}
        <BlogEditorialFooter editorial={editorial} />
      </div>
      <BlogSourcesPanel sources={sources} />
      {solutionLink ? (
        <div
          className={`mt-6 p-6 sm:p-7 ${BLOG_SURFACE_CARD}`}
          style={{ borderLeft: "3px solid var(--c-accent)" }}
          data-testid="blogpost-solution-link"
        >
          <p className="text-sm text-[var(--c-muted-fg)]">
            Putting this into practice for your team?
          </p>
          <Link
            to={solutionLink.to}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-primary)] hover:underline"
          >
            {solutionLink.label} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </>
  );
}

export function BlogEditorialFooter({ editorial }) {
  return (
    <div
      className={`mt-8 border-l-4 p-5 sm:p-6 ${BLOG_SURFACE_CARD}`}
      style={{ borderLeftColor: "var(--c-primary)" }}
      data-testid="blogpost-editorial-footer"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--c-muted-fg)]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--c-ink)]">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} aria-hidden />
          Last reviewed: {editorial.lastReviewed}
        </span>
        <span>{editorial.note}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--c-muted-fg)]">
        This article is general information, not legal advice. Consult a qualified professional for your specific documents.
      </p>
    </div>
  );
}