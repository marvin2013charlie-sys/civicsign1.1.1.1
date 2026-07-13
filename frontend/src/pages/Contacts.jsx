import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Trash2, Download, Loader2, Pencil, Mail, Building2, BookUser, History } from "lucide-react";

function contactInitials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const StatChip = ({ emoji, bg, label, value }) => (
  <div className="cs-portal-surface-card rounded-2xl p-4">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{label}</span>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-sm" style={{ background: bg }}>{emoji}</span>
    </div>
    <p className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{value}</p>
  </div>
);

export default function Contacts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/contacts", { params: { q } });
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const withCompany = useMemo(() => items.filter((c) => c.company?.trim()).length, [items]);

  const openNew = () => {
    setForm({ name: "", email: "", company: "", phone: "", notes: "" });
    setDialog("new");
  };

  const openEdit = (c) => {
    setForm({ name: c.name, email: c.email, company: c.company || "", phone: c.phone || "", notes: c.notes || "" });
    setDialog(c.contact_id);
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      if (dialog === "new") {
        await api.post("/contacts", form);
        toast.success("Contact added");
      } else {
        await api.patch(`/contacts/${dialog}`, form);
        toast.success("Contact updated");
      }
      setDialog(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this contact?")) return;
    try {
      await api.delete(`/contacts/${id}`);
      setItems((p) => p.filter((c) => c.contact_id !== id));
      toast.success("Contact deleted");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const importHistory = async () => {
    setImporting(true);
    try {
      const { data } = await api.post("/contacts/import-from-history");
      toast.success(`Imported ${data.imported} contact(s) from your send history`);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell
      headerSearch={{
        value: q,
        onChange: setQ,
        placeholder: "Search contacts…",
        testId: "contacts-search-input",
      }}
      actions={(
        <button
          type="button"
          onClick={openNew}
          data-testid="contact-add"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add contact</span>
        </button>
      )}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            Address book
          </div>
          <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
            Contacts
            <span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Add signers once and reuse them on every envelope — no more retyping emails.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={importHistory}
          disabled={importing}
          data-testid="contact-import"
          className="rounded-xl"
        >
          {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          Import from history
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatChip emoji="👥" bg="var(--badge-teal-bg)" label="Total contacts" value={items.length} />
            <StatChip emoji="🏢" bg="var(--badge-info-bg)" label="With company" value={withCompany} />
            <StatChip emoji="⚡" bg="var(--badge-coral-bg)" label="Ready to reuse" value={items.length} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="cs-portal-surface-card overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">All contacts</h3>
            <span className="rounded-full bg-[var(--c-portal-card)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
              {loading ? "…" : `${items.length} saved`}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
                <Users className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
              </span>
              <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No contacts yet</h3>
              <p className="mt-1 max-w-sm text-sm text-[var(--c-muted-fg)]">
                {q ? "No contacts match your search." : "Add manually or import signers from past envelopes."}
              </p>
              {!q && (
                <button
                  type="button"
                  onClick={openNew}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
                  style={{ background: "var(--c-primary)" }}
                >
                  <Plus className="h-4 w-4" /> Add your first contact
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--c-border)]">
              {items.map((c) => (
                <div key={c.contact_id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)]" data-testid="contact-row">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                    style={{ background: "var(--badge-teal-bg)", color: "var(--c-primary)" }}
                  >
                    {contactInitials(c.name, c.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{c.name}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-[var(--c-muted-fg)]">
                      <Mail className="h-3 w-3 shrink-0" /> {c.email}
                    </p>
                    {c.company && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--c-muted-fg)]">
                        <Building2 className="h-3 w-3 shrink-0" /> {c.company}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(c)} aria-label="Edit contact">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700" onClick={() => remove(c.contact_id)} aria-label="Delete contact">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">
              <BookUser className="h-3.5 w-3.5" /> Why use contacts
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm text-[var(--c-ink)]">
              {[
                "Autocomplete recipients in Prepare Studio",
                "Keep company and phone details on file",
                "Import past signers in one click",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--c-primary)" }} />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="cs-portal-surface-card rounded-2xl border-l-4 px-4 py-3.5"
            style={{ borderLeftColor: "var(--c-primary)" }}
          >
            <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--c-ink)]">
              <History className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
              <span>
                <strong>Import from history</strong> pulls names and emails from envelopes you&apos;ve already sent — great for building your book quickly.
              </span>
            </p>
          </div>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">{dialog === "new" ? "New contact" : "Edit contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input className="mt-1 rounded-xl" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1 rounded-xl" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Company</Label>
              <Input className="mt-1 rounded-xl" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1 rounded-xl" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}