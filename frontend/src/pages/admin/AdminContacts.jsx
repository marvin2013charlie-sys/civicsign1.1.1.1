import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError, downloadCsv } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, CheckCircle2, RotateCcw, Inbox, Download, MessageSquare } from "lucide-react";
import {
  AdminPageIntro,
  AdminSurfaceCard,
  AdminPillTabs,
  AdminEmptyState,
  AdminStatCard,
  AdminSectionHeader,
  AdminStaffBadge,
} from "@/components/portal/AdminPrimitives";

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "handled", label: "Handled" },
];

export default function AdminContacts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/contact-messages");
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: items.length,
    new: items.filter((c) => !c.handled).length,
    handled: items.filter((c) => c.handled).length,
  }), [items]);

  const filtered = useMemo(() => {
    if (filter === "new") return items.filter((c) => !c.handled);
    if (filter === "handled") return items.filter((c) => c.handled);
    return items;
  }, [items, filter]);

  const toggle = async (id, handled) => {
    try {
      await api.patch(`/admin/contact-messages/${id}`, { handled });
      setItems((prev) => prev.map((c) => (c.contact_id === id ? { ...c, handled } : c)));
      toast.success(handled ? "Marked as handled" : "Reopened");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "\u2014");

  const filterTabs = FILTER_TABS.map((tab) => ({
    ...tab,
    count: counts[tab.id],
    testId: `admin-contacts-filter-${tab.id}`,
  }));

  return (
    <div data-testid="admin-contacts">
      <AdminPageIntro
        caveat="Public inbox"
        title="Contact inbox"
        subtitle="Triage enquiries submitted from the public contact page."
        actions={(
          <>
            <AdminStaffBadge />
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => downloadCsv("/admin/export/contacts.csv", "civicsign_contacts.csv")}
              data-testid="admin-export-contacts"
            >
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminStatCard
          icon={Inbox}
          label="Total messages"
          value={loading ? "…" : counts.all}
          tone="teal"
          testId="admin-contacts-stat-total"
        />
        <AdminStatCard
          icon={Mail}
          label="New"
          value={loading ? "…" : counts.new}
          tone="accent"
          testId="admin-contacts-stat-new"
        />
        <AdminStatCard
          icon={CheckCircle2}
          label="Handled"
          value={loading ? "…" : counts.handled}
          tone="success"
          testId="admin-contacts-stat-handled"
        />
      </div>

      <div className="mt-5">
        <AdminPillTabs
          tabs={filterTabs}
          value={filter}
          onChange={setFilter}
          testId="contacts-status-filter"
        />
      </div>

      <AdminSurfaceCard className="mt-4 overflow-hidden p-0" flush>
        <AdminSectionHeader
          icon={MessageSquare}
          title="Messages"
          subtitle={
            loading
              ? "Loading inbox…"
              : `${filtered.length} ${filtered.length === 1 ? "message" : "messages"}${filter !== "all" ? ` · ${filter === "new" ? "awaiting triage" : "handled"}` : ""}`
          }
        />

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              icon={Inbox}
              title="Inbox zero"
              description="No contact messages yet. Enquiries from /contact will appear here."
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              icon={Inbox}
              title={filter === "new" ? "No new messages" : "No handled messages"}
              description={filter === "new"
                ? "All contact messages have been triaged."
                : "Mark messages as handled once you have responded."}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {filtered.map((c) => (
              <article
                key={c.contact_id}
                data-testid="admin-contact-card"
                className="px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)]"
                style={!c.handled ? { borderLeft: "3px solid var(--c-primary)" } : undefined}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">{c.name}</p>
                      {!c.handled ? (
                        <span className="cs-badge cs-badge-teal">New</span>
                      ) : (
                        <span className="cs-badge cs-badge-success">Handled</span>
                      )}
                    </div>
                    <a
                      href={`mailto:${c.email}`}
                      className="mt-0.5 inline-flex items-center gap-1 text-sm hover:underline"
                      style={{ color: "var(--c-primary)" }}
                    >
                      <Mail className="h-3.5 w-3.5" /> {c.email}
                    </a>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--c-muted-fg)]">{fmt(c.created_at)}</span>
                </div>

                <p className="mt-3 text-sm font-semibold text-[var(--c-ink)]">{c.subject}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--c-muted-fg)]">{c.message}</p>

                <div className="mt-4 flex justify-end">
                  {c.handled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => toggle(c.contact_id, false)}
                      data-testid="admin-contact-reopen"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => toggle(c.contact_id, true)}
                      data-testid="admin-contact-handle"
                      style={{ background: "var(--c-ink-solid)", color: "#fff" }}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark handled
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminSurfaceCard>
    </div>
  );
}