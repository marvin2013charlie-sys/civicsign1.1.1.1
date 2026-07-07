import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { publicApi, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { FileText, Loader2 } from "lucide-react";

export default function PublicForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await publicApi.get(`/public/forms/${slug}`);
        setMeta(data);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Enter your name and email");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await publicApi.post(`/public/forms/${slug}/start`, {
        ...form,
        base_url: window.location.origin,
      });
      window.location.href = data.sign_url;
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--c-paper)] px-4">
        <p className="text-lg font-semibold text-[var(--c-ink)]">Form not found</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/")}>Go home</Button>
      </div>
    );
  }

  const accent = meta.branding?.accent_color || "var(--c-primary)";

  return (
    <div className="min-h-screen bg-[var(--c-paper)] px-4 py-10" data-testid="public-form">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center"><Logo to="/" /></div>
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}22` }}>
              <FileText className="h-5 w-5" style={{ color: accent }} />
            </span>
            <div>
              <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">{meta.title}</h1>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
                From {meta.owner_name} · {meta.page_count} page(s)
              </p>
              {meta.description && <p className="mt-2 text-sm text-[var(--c-ink)]">{meta.description}</p>}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="pf-name">Your full name</Label>
              <Input id="pf-name" className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="pf-email">Email address</Label>
              <Input id="pf-email" type="email" className="mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting} style={{ background: accent, color: "#fff" }}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Continue to sign
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--c-muted-fg)]">
            Secured by CivicSign · UK e-signatures
          </p>
        </div>
      </div>
    </div>
  );
}