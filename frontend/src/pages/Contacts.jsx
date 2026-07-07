import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Search, Trash2, Download, Loader2, Pencil } from "lucide-react";

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
      title="Contacts"
      actions={
        <Button onClick={openNew} style={{ background: "var(--c-primary)", color: "#fff" }} data-testid="contact-add">
          <Plus className="mr-1.5 h-4 w-4" /> Add contact
        </Button>
      }
    >
      <p className="mb-4 text-sm text-[var(--c-muted-fg)]">
        Your address book, add signers once, reuse everywhere. Beats retyping emails on every send.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--c-muted-fg)]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="pl-9" />
        </div>
        <Button variant="outline" onClick={importHistory} disabled={importing} data-testid="contact-import">
          {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          Import from history
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--c-muted-fg)]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-[var(--c-primary)]" />
            <p className="mt-3 font-semibold text-[var(--c-ink)]">No contacts yet</p>
            <p className="mt-1 text-sm text-[var(--c-muted-fg)]">Add manually or import from past envelopes.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {items.map((c) => (
              <div key={c.contact_id} className="flex items-center gap-4 px-5 py-3" data-testid="contact-row">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--c-ink)]">{c.name}</p>
                  <p className="text-sm text-[var(--c-muted-fg)]">{c.email}</p>
                  {c.company && <p className="text-xs text-[var(--c-muted-fg)]">{c.company}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(c.contact_id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "new" ? "New contact" : "Edit contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Company</Label><Input className="mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}