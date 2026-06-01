import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, CheckCircle2, RotateCcw, Inbox } from "lucide-react";

export default function AdminContacts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/contact-messages");
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id, handled) => {
    try {
      await api.patch(`/admin/contact-messages/${id}`, { handled });
      setItems((prev) => prev.map((c) => (c.contact_id === id ? { ...c, handled } : c)));
      toast.success(handled ? "Marked as handled" : "Reopened");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "\u2014");

  return (
    <div data-testid="admin-contacts">
      <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Contact inbox</h1>
      <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Messages submitted through the public contact form.</p>

      {loading ? (
        <div className="mt-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-6 py-20 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}><Inbox className="h-7 w-7" style={{ color: "var(--c-primary)" }} /></span>
          <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Inbox zero</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">No contact messages yet.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((c) => (
            <div key={c.contact_id} data-testid="admin-contact-card"
              className="rounded-xl border bg-[var(--card)] p-5"
              style={{ borderColor: c.handled ? "var(--c-border)" : "var(--c-primary)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--c-ink)]">{c.name}</p>
                    {!c.handled && <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--status-sent-bg)", color: "var(--c-ink)" }}>New</span>}
                  </div>
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--c-primary)" }}><Mail className="h-3.5 w-3.5" /> {c.email}</a>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{fmt(c.created_at)}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--c-ink)]">{c.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{c.message}</p>
              <div className="mt-4 flex justify-end">
                {c.handled ? (
                  <Button variant="outline" size="sm" onClick={() => toggle(c.contact_id, false)} data-testid="admin-contact-reopen"><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen</Button>
                ) : (
                  <Button size="sm" onClick={() => toggle(c.contact_id, true)} data-testid="admin-contact-handle" style={{ background: "var(--c-primary)", color: "#fff" }}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark handled</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
