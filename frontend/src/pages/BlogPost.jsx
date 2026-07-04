import React, { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Calendar, Clock, ArrowLeft, ArrowRight, Tag,
  User, Lightbulb,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";
import { getPost, getRelatedPosts, fetchPost } from "@/lib/blogPosts";

const Block = ({ block }) => {
  if (block.type === "h2") {
    return <h2 className="mt-10 font-heading text-2xl font-bold leading-tight text-[var(--c-ink)] sm:text-3xl">{block.content}</h2>;
  }
  if (block.type === "h3") {
    return <h3 className="mt-7 font-heading text-xl font-semibold text-[var(--c-ink)]">{block.content}</h3>;
  }
  if (block.type === "p") {
    return <p className="mt-4 text-[17px] leading-relaxed text-[var(--c-ink)]/85">{block.content}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="mt-4 space-y-2 text-[17px] leading-relaxed text-[var(--c-ink)]/85">
        {block.content.map((item, i) => (
          <li key={i} className="flex gap-3 pl-1">
            <span className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--c-primary)" }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "callout") {
    return (
      <div className="mt-6 rounded-xl border-l-4 px-5 py-4" style={{ borderColor: "var(--c-primary)", background: "var(--c-primary)15" }}>
        <p className="flex items-start gap-2.5 text-[15px] font-medium leading-relaxed text-[var(--c-ink)]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
          <span>{block.content}</span>
        </p>
      </div>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="mt-6 border-l-4 pl-5 italic text-[var(--c-ink)]/75" style={{ borderColor: "var(--c-accent)" }}>
        &ldquo;{block.content}&rdquo;
      </blockquote>
    );
  }
  return null;
};

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = React.useState(getPost(slug));
  const [loaded, setLoaded] = React.useState(!!post);

  useEffect(() => {
    let cancelled = false;
    setPost(getPost(slug));
    setLoaded(false);
    fetchPost(slug).then((p) => {
      if (cancelled) return;
      if (p) setPost(p);
      setLoaded(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (loaded && !post) return <Navigate to="/blog" replace />;
  if (!post) return null;

  const related = getRelatedPosts(slug, 2);

  return (
    <div className="min-h-screen bg-[var(--c-paper)] text-[var(--c-ink)]">
      <SiteHeader />

      {/* Hero */}
      <article>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #FFF7F0 0%, var(--c-paper) 65%)" }} />
          <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
            <Link to="/blog" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--c-ink)]" data-testid="blogpost-back-link">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to all articles
            </Link>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)]" data-testid="blogpost-category">
                <Tag className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /> {post.category}
              </span>
              <h1 className="mt-4 font-heading text-3xl font-bold leading-[1.1] tracking-tight text-[var(--c-ink)] sm:text-5xl" data-testid="blogpost-title">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-[var(--muted-foreground)]">{post.excerpt}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {post.author}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {post.date}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {post.readTime}</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Cover image */}
        <section className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)]">
            <img src={post.image} alt={post.title} loading="lazy" className="aspect-[16/8] w-full object-cover" />
          </div>
        </section>

        {/* Body */}
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6" data-testid="blogpost-body">
          {post.body.map((block, i) => <Block key={i} block={block} />)}
        </section>
      </article>

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink-solid)] p-10 text-center text-white sm:p-12">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Ready to put this into practice?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Send your first document in minutes. Free for 5 documents a month — no card required, UK GDPR by default.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" data-testid="blogpost-cta-register" style={{ background: "var(--c-primary)", color: "#fff" }}>
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-[var(--c-ink)]">
            <BookOpen className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> Keep reading
          </h3>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                data-testid="blogpost-related-card"
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
                  <h4 className="mt-3 font-heading text-lg font-bold leading-snug text-[var(--c-ink)]">{p.title}</h4>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--muted-foreground)]">{p.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
                    Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
      <FloatingAssistant />
      <CookieBanner />
    </div>
  );
}
