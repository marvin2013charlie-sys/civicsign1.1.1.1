import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Send, Loader2, FileText, Copy, CheckCircle2, ExternalLink, Mail,
} from "lucide-react";

export default function SendReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [env, setEnv] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // {links}
  const [expiresIn, setExpiresIn] = useState("none");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/envelopes/${id}`);
      setEnv(data);
      setMessage(data.message || "");
      if (data.status !== "draft") {
        // already sent: build links and show success
        const links = (data.recipients || []).map((r) => ({
          name: r.name, email: r.email, token: r.access_token,
          sign_url: `${window.location.origin}/sign/${r.access_token}`,
        }));
        setSent({ links });
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const doSend = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/envelopes/${id}/send`, {
        base_url: window.location.origin, message,
        expires_in_days: expiresIn === "none" ? null : Number(expiresIn),
      });
      setSent({ links: data.links });
      toast.success("Sent for signature!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSending(false);
    }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Link copied"); };

  if (loading) return <AppShell title="Send"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div></AppShell>;

  if (sent) {
    return (
      <AppShell title="Sent">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 text-center">
            <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-completed-bg)" }}>
              <CheckCircle2 className="h-7 w-7" style={{ color: "#16A34A" }} />
            </span>
            <h2 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Your document is on its way</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Recipients receive a secure email link. You can also share the links below directly.</p>
          </div>

          <div className="mt-5 space-y-3">
            {sent.links.map((l) => (
              <div key={l.token} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--c-ink)]">{l.name}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]"><Mail className="mr-1 inline h-3 w-3" />{l.email}</p>
                  </div>
                  <div className="flex gap-2">
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
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]"><FileText className="h-5 w-5" style={{ color: "var(--c-primary)" }} /></span>
              <div><p className="font-semibold text-[var(--c-ink)]">{env.title}</p><p className="text-xs text-[var(--muted-foreground)]">{env.document?.page_count} page(s) · {env.fields?.length} field(s)</p></div>
            </div>
            <div className="mt-5">
              <Label htmlFor="msg">Message to recipients (optional)</Label>
              <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" rows={4}
                placeholder="Add a short note that will appear in the signing request email…" data-testid="send-message-input" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Recipients · {env.signing_order}</p>
            <div className="mt-3 space-y-2">
              {(env.recipients || []).sort((a, b) => a.order - b.order).map((r) => (
                <div key={r.recipient_id} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-white p-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: r.color }}>{r.order}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--c-ink)]">{r.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{r.email}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Expiration</Label>
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
