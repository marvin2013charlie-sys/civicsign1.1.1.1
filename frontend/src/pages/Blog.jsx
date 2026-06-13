import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Clock, ArrowRight, Tag } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Button } from "@/components/ui/button";

const POSTS = [
  {
    slug: "are-e-signatures-legal-in-the-uk",
    title: "Are electronic signatures legal in the UK in 2026?",
    excerpt: "The short answer is yes — and they have been since the Electronic Communications Act 2000. We walk through eIDAS, the Law Commission's 2019 report, and what actually counts as a valid e-signature on a UK contract.",
    category: "UK Law",
    date: "Feb 14, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85",
  },
  {
    slug: "hm-land-registry-electronic-signatures-2026",
    title: "HM Land Registry & electronic signatures: what conveyancers need to know",
    excerpt: "Since July 2020 HM Land Registry has accepted electronic signatures on dispositionary deeds. Here's exactly what your audit trail needs to contain, plus a worked example of an electronically signed TR1.",
    category: "Real Estate",
    date: "Feb 07, 2026",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa",
  },
  {
    slug: "gift-aid-electronic-declarations-hmrc-guide",
    title: "Gift Aid via e-signature: the HMRC-friendly playbook for UK charities",
    excerpt: "How small charities can capture HMRC-compliant Gift Aid declarations at the door, online or via email — and what fields your audit trail needs to keep your annual return clean.",
    category: "Charities",
    date: "Jan 28, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433",
  },
  {
    slug: "right-to-work-digital-checks-uk-hr",
    title: "Digital Right to Work checks: the UK HR playbook",
    excerpt: "Since 2022 UK employers can use certified Identity Service Providers for Right to Work checks. Pair that with an electronically signed declaration and your statutory excuse holds up under inspection.",
    category: "HR & People",
    date: "Jan 21, 2026",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902",
  },
  {
    slug: "uk-gdpr-vs-eu-gdpr-saas-platforms",
    title: "UK GDPR vs. EU GDPR: what it actually means for your SaaS suppliers",
    excerpt: "Brexit changed less than most vendors will admit. We unpack the practical differences for British businesses choosing a UK-hosted SaaS — and why hosting really does matter for ICO enquiries.",
    category: "Compliance",
    date: "Jan 14, 2026",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
  },
  {
    slug: "civicsign-launch-15-field-types",
    title: "Product update: 15 field types now live in the Prepare Studio",
    excerpt: "Stamp, image, dropdown, radio, attachment and auto-filled identity fields are all live. Here's what each one does and which industries asked us for them.",
    category: "Product Updates",
    date: "Feb 13, 2026",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
  },
];

const CATEGORIES = ["All", "UK Law", "Real Estate", "Charities", "HR & People", "Compliance", "Product Updates"];

export default function Blog() {
  const [activeCategory, setActiveCategory] = React.useState("All");
  const visible = activeCategory === "All" ? POSTS : POSTS.filter((p) => p.category === activeCategory);
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

      {/* Category filter */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap gap-2" data-testid="blog-categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              data-testid={`blog-category-${c.toLowerCase().replace(/\s|&/g, "-")}`}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c
                  ? "border-[var(--c-ink)] bg-[var(--c-ink)] text-white"
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
            No posts in this category yet — try another filter.
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
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-ink)] p-10 text-center text-white sm:p-14">
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
