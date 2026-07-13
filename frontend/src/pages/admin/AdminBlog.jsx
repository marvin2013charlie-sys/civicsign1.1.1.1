import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminPageIntro, AdminStatCard, AdminSurfaceCard, AdminEmptyState, AdminStaffBadge,
  AdminPillTabs, AdminSectionHeader,
} from "@/components/portal/AdminPrimitives";
import {
  Plus, Trash2, Edit3, ExternalLink, FilePlus2, Search, X, EyeOff, Eye, FileText,
} from "lucide-react";

const CATEGORIES = ["UK Law", "Real Estate", "Charities", "HR & People", "Compliance", "Product Updates", "Customer Stories"];
const BLOCK_TYPES = [
  { value: "h2", label: "Section heading" },
  { value: "h3", label: "Subheading" },
  { value: "p", label: "Paragraph" },
  { value: "ul", label: "Bulleted list" },
  { value: "callout", label: "Callout / tip" },
  { value: "quote", label: "Quote" },
];

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "drafts", label: "Drafts" },
];

const EMPTY_FORM = () => ({
  slug: "",
  title: "",
  excerpt: "",
  category: "UK Law",
  image: "",
  author: "",
  read_time: "",
  published: true,
  body: [{ type: "p", content: "" }],
});

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/blog/posts");
      setPosts(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: posts.length,
    published: posts.filter((p) => p.published).length,
    drafts: posts.filter((p) => !p.published).length,
  }), [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (filter === "published") list = list.filter((p) => p.published);
    if (filter === "drafts") list = list.filter((p) => !p.published);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [posts, search, filter]);

  const filterTabs = FILTER_TABS.map((tab) => ({
    ...tab,
    count: counts[tab.id],
    testId: `admin-blog-filter-${tab.id}`,
  }));

  const openCreate = () => {
    setEditingSlug(null);
    setForm(EMPTY_FORM());
    setEditorOpen(true);
  };

  const openEdit = async (slug) => {
    try {
      const { data } = await api.get(`/admin/blog/posts/${slug}`);
      setEditingSlug(slug);
      setForm({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        category: data.category,
        image: data.image,
        author: data.author || "",
        read_time: data.readTime || "",
        published: !!data.published,
        body: data.body && data.body.length ? data.body : [{ type: "p", content: "" }],
      });
      setEditorOpen(true);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.image.trim()) {
      toast.error("Title, excerpt and cover image are required");
      return;
    }
    const body = form.body.map((b) => {
      if (b.type === "ul") {
        const items = typeof b.content === "string"
          ? b.content.split("\n").map((s) => s.trim()).filter(Boolean)
          : b.content;
        return { type: "ul", content: items };
      }
      return { type: b.type, content: typeof b.content === "string" ? b.content : String(b.content || "") };
    });
    const payload = { ...form, body };
    setSaving(true);
    try {
      if (editingSlug) {
        await api.put(`/admin/blog/posts/${editingSlug}`, payload);
        toast.success("Post updated");
      } else {
        await api.post("/admin/blog/posts", payload);
        toast.success("Post published");
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slug) => {
    try {
      await api.delete(`/admin/blog/posts/${slug}`);
      toast.success("Post deleted");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const addBlock = (type) => setForm((f) => ({ ...f, body: [...f.body, { type, content: type === "ul" ? "" : "" }] }));
  const removeBlock = (idx) => setForm((f) => ({ ...f, body: f.body.filter((_, i) => i !== idx) }));
  const updateBlock = (idx, patch) => setForm((f) => ({
    ...f,
    body: f.body.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
  }));

  const listSubtitle = loading
    ? "Loading posts…"
    : `${filtered.length} ${filtered.length === 1 ? "post" : "posts"}${filter !== "all" ? ` · ${filter === "published" ? "live on site" : "not published"}` : ""}${search.trim() ? " · filtered by search" : ""}`;

  return (
    <div data-testid="admin-blog">
      <AdminPageIntro
        caveat="Public content"
        title="Blog"
        subtitle="Write, edit and publish posts that appear on the public /blog page."
        actions={(
          <>
            <AdminStaffBadge />
            <Button
              onClick={openCreate}
              className="rounded-xl"
              data-testid="admin-blog-create-button"
              style={{ background: "var(--c-ink-solid)", color: "#fff" }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New post
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminStatCard
          icon={FilePlus2}
          label="Total posts"
          value={loading ? "…" : posts.length}
          tone="teal"
          testId="admin-blog-stat-total"
        />
        <AdminStatCard
          icon={Eye}
          label="Published"
          value={loading ? "…" : counts.published}
          tone="success"
          sub={!loading && counts.drafts > 0 ? `${counts.drafts} draft${counts.drafts === 1 ? "" : "s"}` : undefined}
          testId="admin-blog-stat-published"
        />
        <AdminStatCard
          icon={EyeOff}
          label="Drafts"
          value={loading ? "…" : counts.drafts}
          tone="warning"
          testId="admin-blog-stat-drafts"
        />
      </div>

      <div className="mt-5">
        <AdminPillTabs
          tabs={filterTabs}
          value={filter}
          onChange={setFilter}
          testId="admin-blog-filter-tabs"
        />
      </div>

      <AdminSurfaceCard className="mt-4 overflow-hidden p-0" flush testId="admin-blog-table">
        <AdminSectionHeader
          icon={FileText}
          title="Posts"
          subtitle={listSubtitle}
          action={(
            <div className="relative w-full max-w-xs sm:w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="h-9 rounded-xl pl-9"
                data-testid="admin-blog-search"
              />
            </div>
          )}
        />

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              icon={FilePlus2}
              title="No posts yet"
              description="Create your first post. It will appear on the public /blog page immediately if published."
              action={(
                <Button onClick={openCreate} className="rounded-xl" data-testid="admin-blog-empty-create" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                  <Plus className="mr-1.5 h-4 w-4" /> New post
                </Button>
              )}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              icon={FileText}
              title={filter === "drafts" ? "No drafts" : filter === "published" ? "No published posts" : "No matching posts"}
              description={search.trim()
                ? "Try a different search term or clear the filter."
                : filter === "drafts"
                  ? "All posts are currently published."
                  : "Publish a post or switch to another filter."}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {filtered.map((p) => (
              <article
                key={p.slug}
                data-testid="admin-blog-row"
                className="px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)]"
                style={!p.published ? { borderLeft: "3px solid #F59E0B" } : { borderLeft: "3px solid var(--c-primary)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">{p.title}</p>
                      {p.published ? (
                        <span className="cs-badge cs-badge-success">
                          <Eye className="mr-1 inline h-3 w-3" /> Published
                        </span>
                      ) : (
                        <span className="cs-badge cs-badge-warning">
                          <EyeOff className="mr-1 inline h-3 w-3" /> Draft
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--c-muted-fg)]">/{p.slug}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>
                      {p.category}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--c-muted-fg)]">{p.date}</span>
                </div>

                <div className="mt-4 flex justify-end gap-1">
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" data-testid="admin-blog-preview">
                    <Button variant="ghost" size="icon" className="rounded-xl" title="Preview"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                  <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => openEdit(p.slug)} title="Edit" data-testid="admin-blog-edit"><Edit3 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setConfirmDelete(p)} title="Delete" data-testid="admin-blog-delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminSurfaceCard>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="admin-blog-editor">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit post" : "New blog post"}</DialogTitle>
            <DialogDescription>Write a UK-grounded post. Published posts appear on /blog instantly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="blog-title">Title *</Label>
                <Input id="blog-title" className="rounded-xl" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="admin-blog-title-input" />
              </div>
              <div>
                <Label htmlFor="blog-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="blog-category" className="rounded-xl" data-testid="admin-blog-category-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="blog-excerpt">Excerpt *</Label>
              <Textarea id="blog-excerpt" className="rounded-xl" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} data-testid="admin-blog-excerpt-input" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="blog-image">Cover image URL *</Label>
                <Input id="blog-image" className="rounded-xl" placeholder="https://images.unsplash.com/..." value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} data-testid="admin-blog-image-input" />
              </div>
              <div>
                <Label htmlFor="blog-author">Author</Label>
                <Input id="blog-author" className="rounded-xl" placeholder="CivicSign Editorial" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} data-testid="admin-blog-author-input" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-ink)]">Publish immediately</p>
                <p className="text-xs text-[var(--c-muted-fg)]">Off = save as draft (not visible on the public site)</p>
              </div>
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} data-testid="admin-blog-published-toggle" />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label>Body</Label>
                <div className="flex flex-wrap gap-1">
                  {BLOCK_TYPES.map((t) => (
                    <Button key={t.value} variant="outline" size="sm" className="rounded-xl" onClick={() => addBlock(t.value)} data-testid={`admin-blog-add-${t.value}`}>
                      + {t.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {form.body.map((b, idx) => {
                  const meta = BLOCK_TYPES.find((t) => t.value === b.type);
                  const value = b.type === "ul" && Array.isArray(b.content) ? b.content.join("\n") : (b.content || "");
                  return (
                    <div key={idx} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">{meta?.label || b.type}</span>
                        <button type="button" onClick={() => removeBlock(idx)} className="rounded p-1 text-[var(--c-muted-fg)] hover:bg-[var(--c-paper)] hover:text-red-600" data-testid="admin-blog-block-remove">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Textarea
                        rows={b.type === "h2" || b.type === "h3" ? 1 : 4}
                        placeholder={b.type === "ul" ? "One list item per line" : b.type === "callout" ? "Bottom line tip…" : "Write here…"}
                        value={value}
                        onChange={(e) => updateBlock(idx, { content: e.target.value })}
                        className="rounded-xl bg-[var(--c-paper)]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl" data-testid="admin-blog-save" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
              {saving ? "Saving…" : editingSlug ? "Save changes" : "Publish post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              &ldquo;{confirmDelete?.title}&rdquo; will be permanently removed from /blog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button onClick={() => remove(confirmDelete.slug)} className="rounded-xl" data-testid="admin-blog-confirm-delete" style={{ background: "#DC2626", color: "#fff" }}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}