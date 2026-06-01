import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { pdfjs, PDF_OPTIONS } from "@/lib/pdf"; // eslint-disable-line no-unused-vars
import api, { formatApiError, fetchPdfBlobUrl } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Download, Copy, Loader2, Fingerprint, Ban, FileText, ExternalLink,
  Clock, Eye, PenLine, CheckCircle2, XCircle, Send, Bell, CalendarClock,
} from "lucide-react";

const ACTION_ICON = (action) => {
  const a = (action || "").toLowerCase();
  if (a.includes("sign")) return PenLine;
  if (a.includes("view")) return Eye;
  if (a.includes("sent")) return Send;
  if (a.includes("complete")) return CheckCircle2;
  if (a.includes("declin") || a.includes("void")) return XCircle;
  return Clock;
};

export default function EnvelopeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [env, setEnv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  const [pageWidth, setPageWidth] = useState(680);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/envelopes/${id}`);
      setEnv(data);
      const path = data.completed_file_id ? `/envelopes/${id}/completed` : `/envelopes/${id}/file`;
      const url = await fetchPdfBlobUrl(path);
      setBlobUrl(url);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onResize = () => setPageWidth(Math.max(300, Math.min(680, window.innerWidth - 80)));
    onResize(); window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const download = async () => {
    try {
      const url = await fetchPdfBlobUrl(`/envelopes/${id}/completed`);
      const a = document.createElement("a"); a.href = url; a.download = `${env.title}-completed.pdf`; a.click();
    } catch { toast.error("Completed document not available"); }
  };

  const voidEnvelope = async () => {
    try { await api.post(`/envelopes/${id}/void`); toast.success("Envelope voided"); load(); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  const sendReminder = async () => {
    try {
      const { data } = await api.post(`/envelopes/${id}/remind`, { base_url: window.location.origin });
      toast.success(`Reminder sent to ${data.reminded} recipient(s)`);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Link copied"); };
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

  if (loading) return <AppShell title="Envelope"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div></AppShell>;

  const isActive = ["sent", "viewed"].includes(env.status);
  const pages = env.document?.pages || [];

  return (
    <AppShell
      title="Envelope"
      actions={
        <div className="flex gap-2">
          {["sent", "viewed"].includes(env.status) && (
            <Button variant="outline" onClick={sendReminder} data-testid="send-reminder-button"><Bell className="mr-1.5 h-4 w-4" /> Remind</Button>
          )}
          {env.status === "completed" && (
            <Button onClick={download} data-testid="download-completed-pdf-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
          )}
          {env.status !== "completed" && env.status !== "declined" && (
            <Button variant="outline" className="text-red-600" onClick={voidEnvelope} data-testid="void-button"><Ban className="mr-1.5 h-4 w-4" /> Void</Button>
          )}
        </div>
      }
    >
      {/* Summary */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--c-paper-2)]"><FileText className="h-5 w-5" style={{ color: "var(--c-primary)" }} /></span>
            <div>
              <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">{env.title}</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Created {fmt(env.created_at)} · {env.document?.page_count} page(s)</p>
              {env.expires_at && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium" style={{ color: env.status === "expired" ? "#B45309" : "var(--muted-foreground)" }}>
                  <CalendarClock className="h-3.5 w-3.5" /> {env.status === "expired" ? "Expired" : "Expires"} {fmt(env.expires_at)}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={env.status} />
        </div>
        {env.doc_hash && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--c-ink)] px-3 py-2 font-mono text-xs text-white/80">
            <Fingerprint className="h-3.5 w-3.5 shrink-0" style={{ color: "#7fe9dd" }} />
            <span className="truncate">SHA-256 · {env.doc_hash}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="activity" className="mt-5">
        <TabsList>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity & Audit</TabsTrigger>
          <TabsTrigger value="document" data-testid="tab-document">Document</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Recipients */}
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Recipients · {env.signing_order}</p>
              <div className="mt-3 space-y-3">
                {(env.recipients || []).sort((a, b) => a.order - b.order).map((r) => {
                  const signUrl = `${window.location.origin}/sign/${r.access_token}`;
                  return (
                    <div key={r.recipient_id} className="rounded-lg border border-[var(--c-border)] bg-white p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: r.color }}>{r.order}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--c-ink)]">{r.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{r.email}</p></div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.signed_at && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Signed {fmt(r.signed_at)}</p>}
                      {isActive && r.status !== "signed" && r.status !== "declined" && (
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => copy(signUrl)} data-testid="copy-recipient-link"><Copy className="mr-1.5 h-3 w-3" /> Copy link</Button>
                          <a href={signUrl} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></Button></a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit trail */}
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="audit-trail-table">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Audit trail</p>
              <div className="mt-3 space-y-3">
                {(env.audit_events || []).map((ev, i) => {
                  const Icon = ACTION_ICON(ev.action);
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-paper-2)]"><Icon className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} /></span>
                        {i < env.audit_events.length - 1 && <span className="my-1 w-px flex-1 bg-[var(--c-border)]" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-medium text-[var(--c-ink)]">{ev.action}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{ev.actor} · {ev.timestamp} · IP {ev.ip}</p>
                        {ev.detail && <p className="text-xs text-[var(--muted-foreground)] opacity-80">{ev.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="document" className="mt-4">
          <div className="flex flex-col items-center rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-4 cs-grid-paper">
            {blobUrl && (
              <Document file={blobUrl} options={PDF_OPTIONS} loading={<Loader2 className="mt-10 h-8 w-8 animate-spin text-[var(--c-primary)]" />} error={<div className="mt-10 text-sm text-red-600">Failed to load document.</div>}>
                {pages.map((dim, i) => {
                  const aspect = dim.height / dim.width; const h = pageWidth * aspect;
                  return (
                    <div key={i} className="mb-5 bg-white shadow-[0_6px_24px_rgba(15,23,32,0.12)]" style={{ width: pageWidth, height: h }}>
                      <Page pageNumber={i + 1} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false}
                        loading={<div style={{ height: h }} className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" /></div>} />
                    </div>
                  );
                })}
                {env.completed_file_id && (
                  <p className="text-xs text-[var(--muted-foreground)]">Includes Certificate of Completion (final page)</p>
                )}
              </Document>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
