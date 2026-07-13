import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowRight, User } from "lucide-react";
import { MarketingGradient } from "@/components/MarketingGradient";
import { MarketingCtaBanner } from "@/components/MarketingDarkBand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import {
  BlogArticleContent,
  BlogBackLink,
  BlogCategoryPill,
  BlogMeta,
  BlogPostCard,
  BlogSectionHeader,
  BlogTableOfContents,
  BLOG_CAVEAT_STYLE,
} from "@/components/BlogShared";
import { getPost, getRelatedPosts, fetchPost, fetchAllPosts, normalizeBlogPost } from "@/lib/blogPosts";
import { extractHeadings, getPostEditorial, getPostSources } from "@/lib/blogVerifiedContent";
import { formatFreePlanSignupPitch } from "@/lib/pricing";
import { buildBlogPostSeo } from "@/lib/seo";
import { usePageSeo } from "@/hooks/usePageSeo";
import {
  CTA_ACTIONS_CLASS,
  CTA_HEADLINE_CLASS,
  CTA_PRIMARY_BTN,
  CTA_PRIMARY_BTN_STYLE,
  CTA_SCRIPT_STYLE,
  CTA_SECTION,
  CTA_SUBTEXT_CLASS,
  H_FONT,
  HERO_IMAGE,
  HERO_IMAGE_FRAME,
  PAPER_TEXT,
} from "@/lib/marketingUi";

const SOLUTION_BY_CATEGORY = {
  "UK Law": { to: "/solutions/legal", label: "Legal & solicitors solutions" },
  "Real Estate": { to: "/solutions/real-estate", label: "Real estate solutions" },
  "HR & People": { to: "/solutions/hr", label: "HR & People Ops" },
  Charities: { to: "/solutions/charities", label: "Charity solutions" },
  Compliance: { to: "/solutions/healthcare", label: "Healthcare & compliance" },
};

export default function BlogPost() {
  const { slug } = useParams();
  const staticPost = getPost(slug);
  const [post, setPost] = useState(staticPost ?? null);
  const [allPosts, setAllPosts] = useState([]);
  const [loaded, setLoaded] = useState(!!staticPost);

  useEffect(() => {
    let cancelled = false;
    const local = getPost(slug);
    if (local) setPost(local);

    Promise.all([fetchPost(slug), fetchAllPosts()])
      .then(([p, posts]) => {
        if (cancelled) return;
        setPost(normalizeBlogPost(p || local) || null);
        setAllPosts(posts);
        setLoaded(true);
        window.scrollTo(0, 0);
      })
      .catch(() => {
        if (cancelled) return;
        setPost(normalizeBlogPost(local) || null);
        setLoaded(true);
        window.scrollTo(0, 0);
      });

    return () => { cancelled = true; };
  }, [slug]);

  const headings = useMemo(() => extractHeadings(post?.body), [post?.body]);
  const sources = useMemo(() => getPostSources(slug, post?.body), [slug, post?.body]);
  const editorial = useMemo(() => getPostEditorial(slug, post), [slug, post]);
  const solutionLink = post ? SOLUTION_BY_CATEGORY[post.category] : null;

  usePageSeo(post ? buildBlogPostSeo(post) : null);

  if (loaded && !post) return <Navigate to="/blog" replace />;
  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--c-paper)]">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-[var(--c-muted-fg)]">
          Loading article…
        </div>
      </div>
    );
  }

  const related = getRelatedPosts(slug, 3, allPosts.length ? allPosts : undefined);

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]" data-testid="blogpost-page">
      <SiteHeader />

      <article>
        <section className="relative overflow-hidden border-b border-[var(--c-border)]">
          <MarketingGradient />
          <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
            <BlogBackLink />
            <div>
              <BlogCategoryPill category={post.category} size="lg" />
              <p className="mt-4" style={BLOG_CAVEAT_STYLE}>
                {post.category}
              </p>
              <h1
                className="mt-0.5 font-heading text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-[var(--c-ink)] sm:text-4xl lg:text-5xl"
                style={H_FONT}
                data-testid="blogpost-title"
              >
                {post.title}<span style={{ color: "var(--c-accent)" }}>.</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-[var(--c-muted-fg)]">{post.excerpt}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--c-muted-fg)]">
                <span className="flex items-center gap-1.5 font-medium text-[var(--c-ink)]">
                  <User className="h-4 w-4" style={{ color: "var(--c-primary)" }} aria-hidden />
                  {post.author}
                </span>
                <BlogMeta date={post.date} readTime={post.readTime} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:pt-10">
          <div className={HERO_IMAGE_FRAME}>
            <img src={post.image} alt="" loading="lazy" className={HERO_IMAGE} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 lg:pt-16" data-testid="blogpost-body">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <BlogArticleContent
                post={post}
                editorial={editorial}
                sources={sources}
                solutionLink={solutionLink}
              />
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <BlogTableOfContents headings={headings} />
              </div>
            </aside>
          </div>
          <div className="mt-8 lg:hidden">
            <BlogTableOfContents headings={headings} />
          </div>
        </section>
      </article>

      <section className={CTA_SECTION}>
        <MarketingCtaBanner>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(480px 220px at 50% 110%, rgba(45,212,191,.2), transparent)" }} />
          <svg viewBox="0 0 800 60" className="pointer-events-none absolute bottom-3 left-0 right-0 w-full opacity-25" fill="none" aria-hidden="true">
            <path d="M20 45 C 120 5, 220 55, 320 30 S 520 10, 620 40 S 740 50, 790 25" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="font-semibold" style={CTA_SCRIPT_STYLE}>Ready when you are</div>
            <h2 className={CTA_HEADLINE_CLASS} style={{ ...H_FONT, color: PAPER_TEXT }}>
              Put this into practice<span style={{ color: "#FF7A5C" }}>.</span>
            </h2>
            <p className={CTA_SUBTEXT_CLASS} style={{ color: "rgba(248,247,242,.68)" }}>
              Send your first document in minutes. {formatFreePlanSignupPitch()}, UK GDPR by default.
            </p>
            <div className={CTA_ACTIONS_CLASS}>
              <Link to="/register" className={CTA_PRIMARY_BTN} style={CTA_PRIMARY_BTN_STYLE} data-testid="blogpost-cta-register">
                Start free →
              </Link>
            </div>
          </div>
        </MarketingCtaBanner>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-24">
          <BlogSectionHeader eyebrow="Keep reading" title="Related articles" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogPostCard key={p.slug} post={p} testId="blogpost-related-card" />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--c-primary)] transition-colors hover:border-[var(--c-primary)]"
            >
              View all articles <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}