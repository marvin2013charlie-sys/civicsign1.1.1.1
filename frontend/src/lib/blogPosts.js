// Centralised blog post data + helpers. Used as a "static fallback" when the
// /api/blog endpoint hasn't been seeded yet; admin-created posts via the
// internal team panel are merged in on top (API wins on slug conflicts).

import api from "@/lib/api";

import { POSTS } from "./blogPostData";
export { POSTS } from "./blogPostData";

export const CATEGORIES = [
  "All", "UK Law", "Real Estate", "Charities", "HR & People", "Compliance", "Product Updates", "Customer Stories",
];

function estimateReadTime(body) {
  let words = 0;
  for (const block of body) {
    if (typeof block?.content === "string") {
      words += block.content.split(/\s+/).filter(Boolean).length;
    } else if (Array.isArray(block?.content)) {
      words += block.content.join(" ").split(/\s+/).filter(Boolean).length;
    }
  }
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

function parseBlogDate(dateStr) {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

/** Normalise any post (static or API) so public components always receive the same shape. */
export function normalizeBlogPost(raw) {
  if (!raw) return null;
  const body = Array.isArray(raw.body) ? raw.body : [];
  return {
    ...raw,
    slug: String(raw.slug || "").trim(),
    title: String(raw.title || "").trim(),
    excerpt: String(raw.excerpt || "").trim(),
    category: String(raw.category || "UK Law").trim(),
    image: String(raw.image || "").trim(),
    author: String(raw.author || "CivicSign Editorial").trim(),
    date: raw.date || "",
    readTime: raw.readTime || raw.read_time || estimateReadTime(body),
    body,
  };
}

export function sortPostsByDateDesc(posts) {
  return [...posts].sort((a, b) => parseBlogDate(b.date) - parseBlogDate(a.date));
}

export const getPost = (slug) => normalizeBlogPost(POSTS.find((p) => p.slug === slug));

/** Merge API payload over static fallback so new bundled posts work before DB seed. */
export function mergeStaticPost(slug, apiPost) {
  const fallback = getPost(slug);
  if (!apiPost) return fallback ?? null;
  if (!fallback) return normalizeBlogPost(apiPost);
  const body = Array.isArray(apiPost.body) && apiPost.body.length > 0 ? apiPost.body : fallback.body;
  return normalizeBlogPost({
    ...fallback,
    ...apiPost,
    slug: apiPost.slug || fallback.slug,
    title: apiPost.title || fallback.title,
    excerpt: apiPost.excerpt || fallback.excerpt,
    category: apiPost.category || fallback.category,
    image: apiPost.image || fallback.image,
    author: apiPost.author || fallback.author,
    date: apiPost.date || fallback.date,
    readTime: apiPost.readTime || apiPost.read_time || fallback.readTime,
    body,
  });
}

export const getRelatedPosts = (slug, limit = 2, posts = POSTS) => {
  const current = posts.find((p) => p.slug === slug);
  if (!current) return [];
  return sortPostsByDateDesc(
    posts.filter((p) => p.slug !== slug),
  )
    .sort((a, b) => {
      const aMatch = a.category === current.category ? 1 : 0;
      const bMatch = b.category === current.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, limit);
};

// API-merged list: static fallbacks + staff-published posts, newest first.
export async function fetchAllPosts() {
  try {
    const { data } = await api.get("/blog/posts");
    const apiBySlug = new Map(data.map((p) => [p.slug, p]));
    const seen = new Set();
    const merged = [];

    for (const p of data) {
      const post = normalizeBlogPost(mergeStaticPost(p.slug, p) || p);
      if (post?.slug && !seen.has(post.slug)) {
        seen.add(post.slug);
        merged.push(post);
      }
    }
    for (const p of POSTS) {
      if (seen.has(p.slug)) continue;
      const post = normalizeBlogPost(mergeStaticPost(p.slug, apiBySlug.get(p.slug)) || p);
      if (post?.slug) {
        seen.add(post.slug);
        merged.push(post);
      }
    }
    return sortPostsByDateDesc(merged);
  } catch {
    return sortPostsByDateDesc(POSTS.map((p) => normalizeBlogPost(p)));
  }
}

export async function fetchPost(slug) {
  const fallback = getPost(slug);
  try {
    const { data } = await api.get(`/blog/posts/${slug}`);
    return normalizeBlogPost(mergeStaticPost(slug, data) || fallback) || null;
  } catch {
    return fallback ?? null;
  }
}
