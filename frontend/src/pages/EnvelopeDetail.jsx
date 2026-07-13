import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { PDF_OPTIONS } from "@/lib/pdf";
import api, { formatApiError, fetchPdfBlobUrl, downloadFile } from "@/lib/api";

import { copyToClipboard } from "@/lib/clipboard";
import { getAppOrigin } from "@/lib/appOrigin";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VerifySealDialog, POST_SIGN_EDIT_WARNING } from "@/components/VerifySealDialog";
import {
  Download, Copy, Loader2, Fingerprint, Ban, FileText, ExternalLink,
  Clock, Eye, PenLine, CheckCircle2, XCircle, Send, Bell, CalendarClock,
  MessageSquare, SendHorizonal, ShieldCheck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { formatProMonthlyShort } from "@/lib/pricing";

const ACTION_ICON = (action) => {
  const a = (action || "").toLowerCase();
  if (a.includes("sign")) return PenLine;
  if (a.includes("view")) return Eye;
  if (a.includes("sent")) return Send;
  if (a.includes("complete")) return CheckCircle2;
  if (a.includes("declin") || a.includes("void")) return XCircle;
  return Clock;
};

function EnvelopeComments({ envelopeId }) {
  const { features } = usePlan();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!features.comments) { setLoading(false); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/envelopes/${envelopeId}/comments`);
        if (!cancelled) setComments(data || []);
      } catch (err) {
        if (!cancelled) toast.error(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [envelopeId, features.comments]);

  useEffect(() => {
    if (!features.comments) return undefined;
    const es = new EventSource(`/api/envelopes/${envelopeId}/comments/stream`, { withCredentials: true });
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "comments" && msg.comments?.length) {
          setComments((prev) => {
            const ids = new Set(prev.map((c) => c.comment_id));
            const merged = [...prev];
            msg.comments.forEach((c) => { if (!ids.has(c.comment_id)) merged.push(c); });
            return merged;
          });
        }
      } catch { /* ignore malformed events */ }
    };
    es.onerror = () => {
      es.close();
      toast.error("Live comment updates disconnected. New comments still save. Refresh to catch up.", {
        id: "comments-sse-error",
      });
    };
    return () => es.close();
  }, [envelopeId, features.comments]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  if (!features.comments) {
    return (
      <UpgradePrompt
        feature="comments"
        title="Real-time comments are a Pro feature"
        description={`Collaborate on envelopes with your team. Leave comments that update live for everyone with access. Included on Pro (${formatProMonthlyShort()}).`}
      />
    );
  }

  const post = async () => {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/envelopes/${envelopeId}/comments`, { body: text });
      setComments((prev) => [...prev, data]);
      setBody("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" /></div>;
  }

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="envelope-comments">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Comments & collaboration</p>
      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto cs-scroll">
        {comments.length === 0 && (
          <p className="text-sm text-[var(--c-muted-fg)]">No comments yet. Start the conversation.</p>
        )}
        {comments.map((c) => (
          <div key={c.comment_id} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-2">
            <p className="text-xs font-semibold text-[var(--c-ink)]">{c.author_name}</p>
            <p className="mt-1 text-sm text-[var(--c-ink)]">{c.body}</p>
            <p className="mt-1 text-[10px] text-[var(--c-muted-fg)]">{c.created_at}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-4 flex gap-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" rows={2} data-testid="comment-input" />
        <Button onClick={post} disabled={posting || !body.trim()} data-testid="comment-post" style={{ background: "var(--c-primary)", color: "#fff" }}>
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function EnvelopeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { features } = usePlan();
  const [env, setEnv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  const [pageWidth, setPageWidth] = useState(680);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const load = useCallback(async (isStale = () => false) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/envelopes/${id}`);
      if (isStale()) return;
      setEnv(data);
      const path = data.completed_file_id ? `/envelopes/${id}/completed` : `/envelopes/${id}/file`;
      const url = await fetchPdfBlobUrl(path);
      if (isStale()) { URL.revokeObjectURL(url); return; }
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch (err) {
      if (isStale()) return;
      toast.error(formatApiError(err));
      navigate("/dashboard");
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => { cancelled = true; };
  }, [load]);
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);
  useEffect(() => {
    const onResize = () => setPageWidth(Math.max(300, Math.min(680, window.innerWidth - 80)));
    onResize(); window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const download = async () => {
    const completed = env.status === "completed" && env.completed_file_id;
    const path = completed ? `/envelopes/${id}/completed` : `/envelopes/${id}/file`;
    const filename = `${env.title || "document"}${completed ? "-completed" : ""}.pdf`;
    try {
      await downloadFile(path, filename);
    } catch { toast.error("Could not download this document"); }
  };

  const voidEnvelope = async () => {
    try { await api.post(`/envelopes/${id}/void`); toast.success("Envelope voided"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const sendReminder = async () => {
    try {
      const { data } = await api.post(`/envelopes/${id}/remind`, { base_url: getAppOrigin() });
      if (data.email_configured === false) {
        toast.success(`Reminder recorded for ${data.reminded} recipient(s) — email not configured. Copy their signing links below.`);
      } else {
        toast.success(`Reminder sent to ${data.reminded} recipient(s)`);
      }
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const copy = async (t) => {
    const ok = await copyToClipboard(t);
    if (ok) toast.success("Link copied");
    else toast.error("Couldn't copy. Select and copy manually.");
  };
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
          {env.status === "completed" ? (
            <>
              {features.seal_verification && (
                <Button variant="outline" onClick={() => setVerifyOpen(true)} data-testid="verify-seal-button">
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Verify seal
                </Button>
              )}
              <Button onClick={download} data-testid="download-completed-pdf-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
                <Download className="mr-1.5 h-4 w-4" /> Download signed
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={download} data-testid="download-pdf-button">
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
          )}
          {env.status !== "completed" && env.status !== "declined" && env.status !== "voided" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600" data-testid="void-button"><Ban className="mr-1.5 h-4 w-4" /> Void</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Void this envelope?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Signers will no longer be able to complete this document. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={voidEnvelope}>Void envelope</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
              <p className="text-xs text-[var(--c-muted-fg)]">Created {fmt(env.created_at)} · {env.document?.page_count} page(s)</p>
              {env.expires_at && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium" style={{ color: env.status === "expired" ? "#B45309" : "var(--c-muted-fg)" }}>
                  <CalendarClock className="h-3.5 w-3.5" /> {env.status === "expired" ? "Expired" : "Expires"} {fmt(env.expires_at)}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={env.status} />
        </div>
        {env.doc_hash && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--c-ink-solid)] px-3 py-2 font-mono text-xs text-white/80">
              <Fingerprint className="h-3.5 w-3.5 shrink-0" style={{ color: "#7fe9dd" }} />
              <span className="min-w-0 flex-1 truncate">SHA-256 · {env.doc_hash}</span>
              {features.seal_verification && (
                <button
                  type="button"
                  onClick={() => setVerifyOpen(true)}
                  className="shrink-0 rounded px-2 py-0.5 text-[10px] font-sans font-semibold text-[#7fe9dd] underline-offset-2 hover:underline"
                  data-testid="verify-seal-inline-link"
                >
                  Verify
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--c-muted-fg)]" data-testid="post-sign-edit-warning">
              {POST_SIGN_EDIT_WARNING}
            </p>
          </div>
        )}
      </div>

      {features.seal_verification && env.doc_hash && (
        <VerifySealDialog
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          envelopeId={id}
          docHash={env.doc_hash}
          onSealUpdated={() => load()}
        />
      )}

      <Tabs defaultValue="activity" className="mt-5">
        <TabsList>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity & Audit</TabsTrigger>
          {features.comments && (
            <TabsTrigger value="comments" data-testid="tab-comments">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Comments
            </TabsTrigger>
          )}
          <TabsTrigger value="document" data-testid="tab-document">Document</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Recipients */}
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Recipients · {env.signing_order}</p>
              <div className="mt-3 space-y-3">
                {(env.recipients || []).sort((a, b) => a.order - b.order).map((r) => {
                  const signUrl = `${getAppOrigin()}/sign/${r.access_token}`;
                  return (
                    <div key={r.recipient_id} className="rounded-lg border border-[var(--c-border)] bg-[var(--card)] p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: r.color }}>{r.order}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--c-ink)]">{r.name}</p><p className="truncate text-xs text-[var(--c-muted-fg)]">{r.email}</p></div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.signed_at && <p className="mt-2 text-xs text-[var(--c-muted-fg)]">Signed {fmt(r.signed_at)}</p>}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Audit trail</p>
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
                        <p className="text-xs text-[var(--c-muted-fg)]">{ev.actor} · {ev.timestamp} · IP {ev.ip}</p>
                        {ev.detail && <p className="text-xs text-[var(--c-muted-fg)] opacity-80">{ev.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {features.comments && (
          <TabsContent value="comments" className="mt-4">
            <EnvelopeComments envelopeId={id} />
          </TabsContent>
        )}

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
                  <p className="max-w-xl text-center text-xs text-[var(--c-muted-fg)]">
                    Includes Certificate of Completion. Do not edit this file outside CivicSign after signing.
                  </p>
                )}
              </Document>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
