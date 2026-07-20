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

/** Breadcrumb: Blog / Category — matches article design. */
export function BlogBreadcrumb({ category }) {
  return (
    <nav
      className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[var(--c-muted-fg)]"
      aria-label="Breadcrumb"
      data-testid="blogpost-breadcrumb"
    >
      <Link to="/blog" className="transition-colors hover:text-[var(--c-primary)]">
        Blog
      </Link>
      <span aria-hidden className="text-[var(--c-border)]">/</span>
      <span style={{ color: "var(--c-primary)" }}>{category}</span>
    </nav>
  );
}

export function authorInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

/**
 * Dark gradient cover with floating certificate card — from Blog Article design.
 */
export function BlogArticleCover({ post }) {
  const tags = [
    post.category,
    ...(Array.isArray(post.tags) ? post.tags.slice(0, 1) : []),
  ].filter(Boolean).slice(0, 2);

  const certRows = [
    { k: "Status", v: "Completed" },
    { k: "Parties", v: "3 of 3" },
    { k: "Seal", v: "SHA-256" },
  ];

  return (
    <div
      className="overflow-hidden rounded-[24px]"
      style={{
        background: "linear-gradient(160deg, var(--c-ink-solid) 0%, #0d3d31 100%)",
        boxShadow: "0 24px 60px -20px rgba(18,33,32,.35)",
      }}
      data-testid="blogpost-cover"
    >
      <div className="flex flex-col items-stretch gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-12">
        <div className="min-w-0 flex-1">
          <p
            className="text-[12px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "#5FCBA6" }}
          >
            {post.category || "CivicSign Insights"}
          </p>
          {/* Single page title (h1) — lives in the cover so it is not repeated above */}
          <h1
            className="mt-3.5 max-w-xl font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[34px] lg:text-[38px]"
            style={H_FONT}
            data-testid="blogpost-title"
          >
            {post.coverHeadline || post.title}
          </h1>
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-[9px] px-3 py-2 text-[13px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.14)",
                    color: "#D6E5DE",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Floating certificate preview */}
        <div
          className="w-full max-w-[230px] shrink-0 self-center rounded-[14px] p-[18px] lg:self-auto"
          style={{
            background: "#FBFAF6",
            transform: "rotate(2deg)",
            boxShadow: "0 24px 50px -18px rgba(0,0,0,.4)",
          }}
          aria-hidden
        >
          <div className="text-[12px] font-bold text-[var(--c-ink-solid)]">Agreement.pdf</div>
          <div className="my-3 h-px" style={{ background: "#E7E4DA" }} />
          {certRows.map((r) => (
            <div key={r.k} className="flex justify-between py-1.5 text-[11px]">
              <span style={{ color: "#8A968F" }}>{r.k}</span>
              <span className="font-semibold text-[var(--c-ink-solid)]">{r.v}</span>
            </div>
          ))}
          <div
            className="mt-2.5 rounded-lg py-1.5 text-center text-[11px] font-bold"
            style={{ background: "#DCEFE7", color: "#0b7d61" }}
          >
            3 of 3 signed ✓
          </div>
        </div>
      </div>
    </div>
  );
}

/** In-article CTA band matching the design mock. */
export function BlogArticleCta({
  headline = "Put this into practice",
  body = "Send your first UK-ready document in minutes. Free plan available, UK GDPR by default.",
  primaryLabel = "Start free →",
  primaryTo = "/register",
  secondaryLabel = "View pricing",
  secondaryTo = "/pricing",
}) {
  return (
    <div
      className="mt-12 overflow-hidden rounded-[20px] px-8 py-9 sm:px-10"
      style={{ background: "linear-gradient(160deg, var(--c-ink-solid) 0%, #0d3d31 100%)" }}
      data-testid="blogpost-inline-cta"
    >
      <h3 className="font-heading text-[24px] font-semibold leading-snug text-white sm:text-[26px]" style={H_FONT}>
        {headline}
      </h3>
      <p className="mt-3 max-w-md text-[15.5px] leading-relaxed" style={{ color: "#A9BDB4" }}>
        {body}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to={primaryTo}
          className="inline-flex items-center rounded-xl px-6 py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-95"
          style={{ background: "#16b088" }}
          data-testid="blogpost-cta-register"
        >
          {primaryLabel}
        </Link>
        <Link
          to={secondaryTo}
          className="inline-flex items-center rounded-xl border px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
          style={{ background: "rgba(255,255,255,.09)", borderColor: "rgba(255,255,255,.15)" }}
        >
          {secondaryLabel}
        </Link>
      </div>
    </div>
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
        className="scroll-mt-28 mt-11 font-heading text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--c-ink)] first:mt-0 sm:text-[28px]"
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
        className="scroll-mt-28 mt-8 font-heading text-[20px] font-semibold tracking-[-0.02em] text-[var(--c-ink)] sm:text-[22px]"
        style={H_FONT}
      >
        {block.content}
      </h3>
    );
  }
  if (block.type === "p") {
    return (
      <p className="mt-5 text-[17px] leading-[1.7]" style={{ color: "#4C5A54" }}>
        {block.content}
      </p>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="mt-5 space-y-3">
        {block.content.map((item, i) => {
          const label = typeof item === "string" ? item : item?.text;
          const href = typeof item === "object" && item?.href ? item.href : null;
          return (
            <li key={i} className="flex gap-3 text-[16.5px] leading-relaxed" style={{ color: "#4C5A54" }}>
              <span
                className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--c-primary)" }}
                aria-hidden
              />
              <span>
                {href && isSafeExternalHref(href) ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline decoration-[var(--c-primary)]/30 underline-offset-2 hover:decoration-[var(--c-primary)]"
                    style={{ color: "#0F9D7A" }}
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
        className="mt-7 rounded-2xl border p-5 sm:p-6"
        style={{
          background: "#FBFAF6",
          borderColor: "#E1DED3",
          borderLeft: "3px solid var(--c-primary)",
        }}
      >
        <p className="flex items-start gap-3 text-[15.5px] font-medium leading-relaxed text-[var(--c-ink)]">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--badge-teal-bg)" }}
          >
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
        className="mt-7 border-l-[3px] pl-5 font-heading text-[20px] font-medium italic leading-snug text-[var(--c-ink)] sm:text-[22px]"
        style={{ borderLeftColor: "var(--c-accent)", ...H_FONT }}
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
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Table of contents" data-testid="blogpost-toc">
      <div
        className="mb-3.5 text-[12px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "#8A968F" }}
      >
        On this page
      </div>
      <ol className="flex flex-col gap-0.5 border-l-2" style={{ borderColor: "#E1DED3" }}>
        {headings.map((h) => {
          const active = activeId === h.id;
          return (
            <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
              <a
                href={`#${h.id}`}
                className="block border-l-2 py-[7px] pl-4 text-[14px] font-semibold leading-snug transition-colors"
                style={{
                  marginLeft: -2,
                  borderLeftColor: active ? "var(--c-primary)" : "transparent",
                  color: active ? "var(--c-primary)" : "#5C6B64",
                }}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function BlogSourcesPanel({ sources }) {
  if (!sources?.length) return null;
  return (
    <div
      className="mt-8 rounded-2xl border p-6 sm:p-7"
      style={{
        background: "#FBFAF6",
        borderColor: "#E1DED3",
        borderLeft: "3px solid var(--c-primary)",
      }}
      data-testid="blogpost-sources"
    >
      <div
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px]"
        style={{ color: "#8A968F" }}
      >
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
                className="inline-flex items-start gap-2 text-sm font-medium underline decoration-[var(--c-primary)]/30 underline-offset-2 hover:decoration-[var(--c-primary)]"
                style={{ color: "#0F9D7A" }}
              >
                <span>{s.label}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              </a>
            ) : (
              <span className="text-sm" style={{ color: "#7C8983" }}>{s.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Single render path for any post body — static or staff-published via the API. */
export function BlogArticleContent({ post, editorial, sources, solutionLink, showInlineCta = true }) {
  const body = Array.isArray(post?.body) ? post.body : [];

  return (
    <div className="max-w-[680px]" data-testid="blogpost-article">
      <div>
        {body.map((block, i) => (
          <BlogArticleBlock key={`${block.type}-${i}`} block={block} />
        ))}
      </div>
      <BlogEditorialFooter editorial={editorial} />
      <BlogSourcesPanel sources={sources} />
      {solutionLink ? (
        <div
          className="mt-6 rounded-2xl border p-6 sm:p-7"
          style={{
            background: "#FBFAF6",
            borderColor: "#E1DED3",
            borderLeft: "3px solid var(--c-accent)",
          }}
          data-testid="blogpost-solution-link"
        >
          <p className="text-sm" style={{ color: "#4C5A54" }}>
            Putting this into practice for your team?
          </p>
          <Link
            to={solutionLink.to}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            style={{ color: "#0F9D7A" }}
          >
            {solutionLink.label} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
      {showInlineCta ? <BlogArticleCta /> : null}
    </div>
  );
}

export function BlogEditorialFooter({ editorial }) {
  return (
    <div
      className="mt-10 rounded-2xl border p-5 sm:p-6"
      style={{
        background: "#FBFAF6",
        borderColor: "#E1DED3",
        borderLeft: "3px solid var(--c-primary)",
      }}
      data-testid="blogpost-editorial-footer"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: "#7C8983" }}>
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--c-ink)]">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} aria-hidden />
          Last reviewed: {editorial.lastReviewed}
        </span>
        <span>{editorial.note}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#7C8983" }}>
        This article is general information, not legal advice. Consult a qualified professional for your specific documents.
      </p>
    </div>
  );
}