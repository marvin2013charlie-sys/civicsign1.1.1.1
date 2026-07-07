import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePlan } from "@/hooks/usePlan";
import {
  defaultSignatureLevel, signatureLevelOptions,
} from "@/lib/signatureLevels";

import {
  ArrowLeft, Send, Loader2, FileText, Copy, CheckCircle2, ExternalLink, Mail, Sparkles,
} from "lucide-react";

export default function SendReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [env, setEnv] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // { links, emailConfigured }
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [expiresIn, setExpiresIn] = useState("none");
  const [drafting, setDrafting] = useState(false);
  const { features } = usePlan();
  const [autoRemind, setAutoRemind] = useState(true);
  const [remindDays, setRemindDays] = useState("3");
  const [remindMax, setRemindMax] = useState("3");
  const [signatureLevel, setSignatureLevel] = useState("basic");
  const sigOptions = signatureLevelOptions(features);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [healthRes, envelopeRes] = await Promise.all([
          api.get("/health").catch(() => ({ data: {} })),
          api.get(`/envelopes/${id}`),
        ]);
        if (cancelled) return;
        const configured = healthRes.data?.email_configured !== false;
        setEmailConfigured(configured);
        const data = envelopeRes.data;
        setEnv(data);
        setMessage(data.message || "");
        setSignatureLevel(data.signature_level || defaultSignatureLevel(features));
        if (data.status !== "draft") {
          const links = (data.recipients || []).map((r) => ({
            name: r.name, email: r.email, token: r.access_token,
            sign_url: `${window.location.origin}/sign/${r.access_token}`,
          }));
          setSent({ links, emailConfigured: configured });
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(formatApiError(err));
        navigate("/dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate, features]);

  const emailDeliverySkipped = !emailConfigured;

  const doSend = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/envelopes/${id}/send`, {
        base_url: window.location.origin, message,
        expires_in_days: expiresIn === "none" ? null : Number(expiresIn),
        auto_remind_enabled: features.auto_reminders && autoRemind,
        auto_remind_days: Number(remindDays) || 3,
        auto_remind_max: Number(remindMax) || 3,
        signature_level: signatureLevel,
      });
      const configured = data.email_configured !== false;
      setEmailConfigured(configured);
      setSent({ links: data.links, emailConfigured: configured });
      toast.success(
        configured
          ? "Sent for signature!"
          : "Document sent — copy the signing links below to your recipients.",
      );
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSending(false);
    }
  };

  const copy = async (text) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success("Link copied");
    else toast.error("Couldn't copy, select and copy manually");
  };

  const draftMessage = async () => {
    setDrafting(true);
    try {
      const { data } = await api.post(`/envelopes/${id}/ai/draft-message`);
      setMessage(data.message || "");
      toast.success(data.source === "ai" ? "AI draft ready, edit before sending" : "Draft message added");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDrafting(false);
    }
  };

  if (loading) return <AppShell title="Send"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div></AppShell>;

  if (sent) {
    const deliverySkipped = !sent.emailConfigured;
    return (
      <AppShell title="Sent">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 text-center">
            <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-completed-bg)" }}>
              <CheckCircle2 className="h-7 w-7" style={{ color: "#16A34A" }} />
            </span>
            <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">
              {deliverySkipped ? "Document ready for signing" : "Your document is on its way"}
            </h2>
            <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
              {deliverySkipped
                ? "Email delivery is not configured in this environment. Copy each signing link below and send it to your signer (WhatsApp, SMS, or paste in a browser)."
                : "Recipients receive a secure email link. You can also share the links below directly."}
            </p>
          </div>

          {deliverySkipped && (
            <div
              className="mt-4 rounded-xl border-2 border-dashed p-4 text-sm"
              style={{ borderColor: "var(--c-primary)", background: "var(--status-sent-bg)" }}
              data-testid="send-email-skipped-notice"
            >
              <p className="font-semibold text-[var(--c-ink)]">No signing email was sent</p>
              <p className="mt-1 text-[var(--c-muted-fg)]">
                To enable real emails, set <code className="text-xs">RESEND_API_KEY</code> and <code className="text-xs">SENDER_EMAIL</code> in the backend <code className="text-xs">.env</code> file.
              </p>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {sent.links.map((l) => (
              <div key={l.token} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{l.name}</p>
                    <p className="truncate text-xs text-[var(--c-muted-fg)]"><Mail className="mr-1 inline h-3 w-3" />{l.email}</p>
                    {deliverySkipped && (
                      <p className="mt-2 break-all rounded-lg bg-[var(--c-paper)] px-2 py-1.5 font-mono text-[11px] text-[var(--c-ink)]">{l.sign_url}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => copy(l.sign_url)} data-testid="send-copy-link-button"><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link</Button>
                    <a href={l.sign_url} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button></a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
            <Button onClick={() => navigate(`/envelope/${id}`)} data-testid="goto-tracking-button" style={{ background: "var(--c-primary)", color: "#fff" }}>View tracking</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Review & Send" actions={<Button variant="ghost" onClick={() => navigate(`/prepare/${id}`)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to prepare</Button>}>
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {emailDeliverySkipped && (
            <div
              className="mb-4 rounded-xl border border-[var(--c-border)] bg-[var(--status-sent-bg)] px-4 py-3 text-sm text-[var(--c-ink)]"
              data-testid="send-email-dev-hint"
            >
              <p className="font-medium">Signing emails are not configured</p>
              <p className="mt-0.5 text-[var(--c-muted-fg)]">After you send, copy each recipient&apos;s signing link from the next screen and share it manually.</p>
            </div>
          )}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]"><FileText className="h-5 w-5" style={{ color: "var(--c-primary)" }} /></span>
              <div><p className="font-semibold text-[var(--c-ink)]">{env.title}</p><p className="text-xs text-[var(--c-muted-fg)]">{env.document?.page_count} page(s) · {env.fields?.length} field(s)</p></div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="msg">Message to recipients (optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={draftMessage} disabled={drafting}
                  data-testid="send-ai-draft-button">
                  {drafting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  AI draft
                </Button>
              </div>
              <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" rows={4}
                placeholder="Add a short note that will appear in the signing request email…" data-testid="send-message-input" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Recipients · {env.signing_order}</p>
            <div className="mt-3 space-y-2">
              {(env.recipients || []).sort((a, b) => a.order - b.order).map((r) => (
                <div key={r.recipient_id} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-white p-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: r.color }}>{r.order}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--c-ink)]">{r.name}</p><p className="truncate text-xs text-[var(--c-muted-fg)]">{r.email}</p></div>
                </div>
              ))}
            </div>
            {features.auto_reminders && (
              <div className="mt-4 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3" data-testid="auto-remind-panel">
                <div className="flex items-center justify-between">
                  <Label>Automatic reminders</Label>
                  <Switch checked={autoRemind} onCheckedChange={setAutoRemind} />
                </div>
                {autoRemind && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase text-[var(--c-muted-fg)]">Every (days)</Label>
                      <Select value={remindDays} onValueChange={setRemindDays}>
                        <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="7">7</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-[var(--c-muted-fg)]">Max reminders</Label>
                      <Select value={remindMax} onValueChange={setRemindMax}>
                        <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-[var(--c-muted-fg)]">DocuSign charges extra, we include this on all plans.</p>
              </div>
            )}
            {sigOptions.length > 1 && (
              <div className="mt-4 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3" data-testid="signature-level-panel">
                <Label className="text-xs uppercase tracking-wide text-[var(--c-muted-fg)]">Signature level (UK eIDAS)</Label>
                <Select value={signatureLevel} onValueChange={setSignatureLevel}>
                  <SelectTrigger className="mt-1" data-testid="signature-level-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sigOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} disabled={opt.disabled}>
                        {opt.short}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-[10px] leading-relaxed text-[var(--c-muted-fg)]">
                  {sigOptions.find((o) => o.id === signatureLevel)?.description}
                </p>
                {features.plan === "business" && !features.qes_available && (
                  <p className="mt-2 text-[10px] text-[var(--c-muted-fg)]">
                    Need a Qualified Electronic Signature (QES)?{" "}
                    <Link to="/contact" className="font-medium text-[var(--c-primary)] hover:underline">Contact us</Link>{" "}
                    to enable QTSP-backed QES for high-assurance transactions.
                  </p>
                )}
              </div>
            )}
            <div className="mt-4">
              <Label className="text-xs uppercase tracking-wide text-[var(--c-muted-fg)]">Expiration</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className="mt-1" data-testid="send-expiry-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No expiration</SelectItem>
                  <SelectItem value="3">Expires in 3 days</SelectItem>
                  <SelectItem value="7">Expires in 7 days</SelectItem>
                  <SelectItem value="14">Expires in 14 days</SelectItem>
                  <SelectItem value="30">Expires in 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={doSend} disabled={sending} className="mt-5 w-full" data-testid="send-submit-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {sending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-1.5 h-4 w-4" /> Send for signature</>}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
