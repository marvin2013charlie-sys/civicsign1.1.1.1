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
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Edit3, ExternalLink, FilePlus2, Search, X, EyeOff, Eye, BookOpen,
} from "lucide-react";

const CATEGORIES = ["UK Law", "Real Estate", "Charities", "HR & People", "Compliance", "Product Updates", "Customer Stories"];
const BLOCK_TYPES = [
  { value: "h2", label: "Heading" },
  { value: "p", label: "Paragraph" },
  { value: "ul", label: "Bulleted list" },
  { value: "callout", label: "Callout / tip" },
  { value: "quote", label: "Quote" },
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

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [posts, search]);

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
    // Normalise body: split textarea-entered lists by newline
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

  // Block helpers
  const addBlock = (type) => setForm((f) => ({ ...f, body: [...f.body, { type, content: type === "ul" ? "" : "" }] }));
  const removeBlock = (idx) => setForm((f) => ({ ...f, body: f.body.filter((_, i) => i !== idx) }));
  const updateBlock = (idx, patch) => setForm((f) => ({
    ...f,
    body: f.body.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
  }));

  return (
    <div data-testid="admin-blog">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Blog</h1>
          <p className="mt-0.5 text-sm text-[var(--c-muted-fg)]">Write, edit and publish posts that appear on the public /blog page.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-[var(--c-primary)]/30 bg-[var(--c-primary)]/5 text-[var(--c-primary)]">
            <BookOpen className="h-3.5 w-3.5" /> Internal team
          </Badge>
          <Button onClick={openCreate} data-testid="admin-blog-create-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
            <Plus className="mr-1.5 h-4 w-4" /> New post
          </Button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="pl-9" data-testid="admin-blog-search" />
        </div>
        <p className="text-sm text-[var(--c-muted-fg)]">{loading ? "…" : `${filtered.length} post${filtered.length === 1 ? "" : "s"}`}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]" data-testid="admin-blog-table">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--c-primary)22" }}>
              <FilePlus2 className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
            </span>
            <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No posts yet</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--c-muted-fg)]">
              Create your first post. It will appear on the public /blog page immediately if published.
            </p>
            <Button onClick={openCreate} className="mt-5" data-testid="admin-blog-empty-create" style={{ background: "var(--c-primary)", color: "#fff" }}>
              <Plus className="mr-1.5 h-4 w-4" /> New post
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            <div className="hidden grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)] sm:grid">
              <div className="col-span-5">Title</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1" />
            </div>
            {filtered.map((p) => (
              <div key={p.slug} data-testid="admin-blog-row"
                className="grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-12">
                <div className="col-span-5 min-w-0">
                  <p className="truncate font-semibold text-[var(--c-ink)]">{p.title}</p>
                  <p className="truncate text-xs text-[var(--c-muted-fg)]">/{p.slug}</p>
                </div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{p.category}</div>
                <div className="col-span-2">
                  {p.published ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <Eye className="h-3 w-3" /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      <EyeOff className="h-3 w-3" /> Draft
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-[var(--c-muted-fg)]">{p.date}</div>
                <div className="col-span-1 flex justify-end gap-1">
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" data-testid="admin-blog-preview">
                    <Button variant="ghost" size="icon" title="Preview"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p.slug)} title="Edit" data-testid="admin-blog-edit"><Edit3 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(p)} title="Delete" data-testid="admin-blog-delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor dialog */}
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
                <Input id="blog-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="admin-blog-title-input" />
              </div>
              <div>
                <Label htmlFor="blog-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="blog-category" data-testid="admin-blog-category-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="blog-excerpt">Excerpt *</Label>
              <Textarea id="blog-excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} data-testid="admin-blog-excerpt-input" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="blog-image">Cover image URL *</Label>
                <Input id="blog-image" placeholder="https://images.unsplash.com/..." value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} data-testid="admin-blog-image-input" />
              </div>
              <div>
                <Label htmlFor="blog-author">Author</Label>
                <Input id="blog-author" placeholder="CivicSign Editorial" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} data-testid="admin-blog-author-input" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-ink)]">Publish immediately</p>
                <p className="text-xs text-[var(--c-muted-fg)]">Off = save as draft (not visible on the public site)</p>
              </div>
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} data-testid="admin-blog-published-toggle" />
            </div>

            {/* Body blocks */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Body</Label>
                <div className="flex gap-1">
                  {BLOCK_TYPES.map((t) => (
                    <Button key={t.value} variant="outline" size="sm" onClick={() => addBlock(t.value)} data-testid={`admin-blog-add-${t.value}`}>
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
                    <div key={idx} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-2.5">
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
                        className="bg-[var(--c-paper)]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="admin-blog-save" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? "Saving…" : editingSlug ? "Save changes" : "Publish post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              &ldquo;{confirmDelete?.title}&rdquo; will be permanently removed from /blog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button onClick={() => remove(confirmDelete.slug)} data-testid="admin-blog-confirm-delete" style={{ background: "#DC2626", color: "#fff" }}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
