import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import {
  BlogArticleContent,
  BlogArticleCover,
  BlogBreadcrumb,
  BlogMeta,
  BlogPostCard,
  BlogSectionHeader,
  BlogTableOfContents,
  authorInitials,
} from "@/components/BlogShared";
import { getPost, getRelatedPosts, fetchPost, fetchAllPosts, normalizeBlogPost } from "@/lib/blogPosts";
import { extractHeadings, getPostEditorial, getPostSources } from "@/lib/blogVerifiedContent";
import { buildBlogPostSeo } from "@/lib/seo";
import { usePageSeo } from "@/hooks/usePageSeo";

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

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const headings = useMemo(() => extractHeadings(post?.body), [post?.body]);
  const sources = useMemo(() => getPostSources(slug, post?.body), [slug, post?.body]);
  const editorial = useMemo(() => getPostEditorial(slug, post), [slug, post]);
  const solutionLink = post ? SOLUTION_BY_CATEGORY[post.category] : null;

  usePageSeo(post ? buildBlogPostSeo(post) : null);

  if (loaded && !post) return <Navigate to="/blog" replace />;
  if (!post) {
    return (
      <div className="min-h-screen" style={{ background: "#F3F1EA" }}>
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-[var(--c-muted-fg)]">
          Loading article…
        </div>
      </div>
    );
  }

  const related = getRelatedPosts(slug, 3, allPosts.length ? allPosts : undefined);
  const initials = authorInitials(post.author);

  return (
    <div
      className="min-h-screen text-[var(--c-ink)]"
      style={{ background: "#F3F1EA" }}
      data-testid="blogpost-page"
    >
      <SiteHeader />

      <article>
        {/* Breadcrumb + cover hero only (no duplicate plain title) */}
        <header className="mx-auto max-w-[900px] px-6 pb-0 pt-10 sm:pt-12">
          <BlogBreadcrumb category={post.category} />
          <div className="mt-6">
            <BlogArticleCover post={post} />
          </div>

          {post.excerpt ? (
            <p
              className="mx-auto mt-8 max-w-[680px] text-[18px] leading-[1.55] sm:text-[19px]"
              style={{ color: "#4C5A54" }}
            >
              {post.excerpt}
            </p>
          ) : null}

          <div
            className="mx-auto mt-6 flex max-w-[680px] flex-wrap items-center gap-3.5 border-b pb-7"
            style={{ borderColor: "#E1DED3" }}
          >
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
              style={{ background: "var(--c-ink-solid)" }}
              aria-hidden
            >
              {initials}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-bold text-[var(--c-ink)]">{post.author}</span>
              <BlogMeta
                date={post.date}
                readTime={post.readTime}
                className="mt-0.5 text-[13.5px]"
              />
            </span>
          </div>
        </header>

        {/* Body + TOC */}
        <section
          className="mx-auto mt-10 max-w-[1000px] px-6 pb-16 sm:mt-12 lg:pb-20"
          data-testid="blogpost-body"
        >
          <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start lg:gap-12">
            <aside className="order-2 lg:order-1 lg:block">
              <div className="lg:sticky lg:top-28">
                <BlogTableOfContents headings={headings} />
              </div>
            </aside>
            <div className="order-1 min-w-0 lg:order-2">
              <BlogArticleContent
                post={post}
                editorial={editorial}
                sources={sources}
                solutionLink={solutionLink}
              />
            </div>
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section
          className="border-t px-6 pb-20 pt-14 sm:px-6 lg:pb-24"
          style={{ borderColor: "#E1DED3", background: "#FBFAF6" }}
        >
          <div className="mx-auto max-w-6xl">
            <BlogSectionHeader
              align="left"
              eyebrow="Keep reading"
              title="Related articles"
              sub="More UK-grounded guides from the CivicSign editorial desk."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogPostCard key={p.slug} post={p} testId="blogpost-related-card" />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/blog"
                className="inline-flex items-center gap-1 rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--c-primary)]"
                style={{ borderColor: "#E1DED3", color: "#0F9D7A" }}
              >
                View all articles <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
