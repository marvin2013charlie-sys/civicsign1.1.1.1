import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { handleQuotaApiError } from "@/lib/quota";
import { AppShell } from "@/components/AppShell";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Input } from "@/components/ui/input";
import { LayoutTemplate, Loader2, Trash2, FileText, Users, Send, Play, Sparkles, Link2 } from "lucide-react";

function parseBulkRows(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, email] = line.split(/[,;\t]/).map((s) => s.trim());
    return name && email ? { name, email } : null;
  }).filter(Boolean);
}

export default function Templates() {
  const navigate = useNavigate();
  const { features, shouldOfferUpgrade } = usePlan();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState("");
  const [bulkTpl, setBulkTpl] = useState(null);
  const [bulkRows, setBulkRows] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [useTpl, setUseTpl] = useState(null);
  const [useRoles, setUseRoles] = useState([]);
  const [useBusy, setUseBusy] = useState(false);
  const [samples, setSamples] = useState([]);
  const [cloning, setCloning] = useState("");
  const [quotaModal, setQuotaModal] = useState(false);
  const [quotaDetail, setQuotaDetail] = useState(null);

  useEffect(() => {
    api.get("/templates/samples")
      .then(({ data }) => setSamples(data || []))
      .catch((err) => toast.error(formatApiError(err) || "Could not load sample templates"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/templates");
        if (!cancelled) setItems(data || []);
      } catch (err) {
        if (!cancelled) toast.error(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const remove = async (templateId) => {
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    try {
      await api.delete(`/templates/${templateId}`);
      setItems((prev) => prev.filter((t) => t.template_id !== templateId));
      toast.success("Template deleted");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const toggleShare = async (templateId, currentlyShared) => {
    if (!features.team_templates) {
      toast.error("Shared team templates require a Pro plan");
      return;
    }
    setSharing(templateId);
    try {
      const { data } = await api.patch(`/templates/${templateId}/share`, {
        shared_with_team: !currentlyShared,
      });
      setItems((prev) => prev.map((t) => (t.template_id === templateId ? data : t)));
      toast.success(data.shared_with_team ? "Template shared with your team" : "Template is private again");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSharing("");
    }
  };

  const runBulkSend = async () => {
    const rows = parseBulkRows(bulkRows);
    if (!rows.length) { toast.error("Add at least one recipient (name, email per line)"); return; }
    setBulkSending(true);
    try {
      const { data } = await api.post(`/templates/${bulkTpl.template_id}/bulk-send`, {
        base_url: window.location.origin,
        message: bulkMsg,
        rows,
      });
      toast.success(`Bulk send complete, ${data.created} envelope(s) created`);
      setBulkTpl(null);
      setBulkRows("");
      setBulkMsg("");
    } catch (err) {
      if (!handleQuotaApiError(err, {
        setDetail: setQuotaDetail,
        setOpen: setQuotaModal,
      })) {
        toast.error(formatApiError(err));
      }
    } finally {
      setBulkSending(false);
    }
  };

  const canBulk = (t) => (t.roles || []).length === 1;

  const openUse = (t) => {
    setUseTpl(t);
    setUseRoles((t.roles || []).map((r) => ({
      role_id: r.role_id,
      role_name: r.name || r.role_id,
      name: "",
      email: "",
    })));
  };

  const cloneSample = async (sampleId) => {
    setCloning(sampleId);
    try {
      const { data } = await api.post(`/templates/samples/${sampleId}/clone`);
      setItems((p) => [data, ...p]);
      toast.success("Starter template added to your library");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCloning("");
    }
  };

  const togglePublicLink = async (t) => {
    if (!features.public_links) {
      toast.error("Public signing links require Pro");
      return;
    }
    if (!canBulk(t)) {
      toast.error("Public links work with single-signer templates");
      return;
    }
    try {
      const enabled = !t.public_form?.enabled;
      const { data } = await api.patch(`/templates/${t.template_id}/public-form`, { enabled });
      setItems((p) => p.map((x) => (x.template_id === t.template_id ? { ...x, public_form: data.public_form } : x)));
      if (enabled) {
        const url = `${window.location.origin}/form/${data.public_form.slug}`;
        const copied = await copyToClipboard(url);
        toast.success(copied ? "Public link enabled and copied" : "Public link enabled, copy the URL from the card");
      } else {
        toast.success("Public link disabled");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const runUseTemplate = async () => {
    if (!useTpl) return;
    for (const r of useRoles) {
      if (!r.name.trim() || !r.email.trim()) {
        toast.error(`Enter name and email for ${r.role_name}`);
        return;
      }
    }
    setUseBusy(true);
    try {
      const { data } = await api.post(`/templates/${useTpl.template_id}/use`, {
        recipients: useRoles.map((r) => ({
          role_id: r.role_id,
          name: r.name.trim(),
          email: r.email.trim().toLowerCase(),
        })),
      });
      toast.success("Envelope created from template");
      setUseTpl(null);
      navigate(`/prepare/${data.envelope_id}`);
    } catch (err) {
      if (!handleQuotaApiError(err, {
        setDetail: setQuotaDetail,
        setOpen: setQuotaModal,
      })) {
        toast.error(formatApiError(err));
      }
    } finally {
      setUseBusy(false);
    }
  };

  return (
    <AppShell title="Templates">
      {shouldOfferUpgrade("public_links") && (
        <div className="mb-5">
          <UpgradePrompt
            feature="public_links"
            title="Public signing links on Pro"
            description="Share a URL anyone can use to sign, DocuSign calls this PowerForms and locks it to Business Pro (~£45/user). We include it on Pro at £15."
          />
        </div>
      )}
      {samples.length > 0 && (
        <div className="mb-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--c-ink)]">
            <Sparkles className="h-4 w-4 text-[var(--c-primary)]" /> Starter library
          </h2>
          <p className="mt-1 text-sm text-[var(--c-muted-fg)]">UK-ready templates, one click to add to your account.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {samples.map((s) => (
              <div key={s.sample_id} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--c-muted-fg)]">{s.category}</p>
                <p className="mt-1 font-semibold text-[var(--c-ink)]">{s.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--c-muted-fg)]">{s.description}</p>
                <Button size="sm" variant="outline" className="mt-3 w-full" disabled={cloning === s.sample_id}
                  onClick={() => cloneSample(s.sample_id)}>
                  {cloning === s.sample_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add to my templates"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {shouldOfferUpgrade("team_templates") && (
        <div className="mb-5">
          <UpgradePrompt
            feature="team_templates"
            title="Share templates with your team on Pro"
            description="Standardise agreements across your organisation. Pro users can share templates so every team member sends the same version."
          />
        </div>
      )}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div>
      ) : items.length === 0 ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--card)] p-10 text-center" data-testid="templates-empty">
          <LayoutTemplate className="mx-auto h-10 w-10 text-[var(--c-primary)]" />
          <h2 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">No templates yet</h2>
          <p className="mt-2 text-sm text-[var(--c-muted-fg)]">
            Open a draft envelope in Prepare Studio and choose &ldquo;Save as template&rdquo;.
          </p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")} style={{ background: "var(--c-primary)", color: "#fff" }}>
            Go to dashboard
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="templates-list">
          {items.map((t) => (
            <div key={t.template_id} className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
                  <FileText className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-heading font-semibold text-[var(--c-ink)]">{t.name}</h3>
                  <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
                    {t.document?.page_count || 0} page(s) · used {t.use_count || 0}×
                    {t.shared_with_team ? " · shared with team" : ""}
                    {canBulk(t) ? " · bulk-ready" : ""}
                  </p>
                  {t.description ? <p className="mt-2 line-clamp-2 text-sm text-[var(--c-muted-fg)]">{t.description}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openUse(t)} data-testid={`template-use-${t.template_id}`}
                  style={{ background: "var(--c-primary)", color: "#fff" }}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Use template
                </Button>
                {features.public_links && canBulk(t) && (
                  <Button size="sm" variant={t.public_form?.enabled ? "default" : "outline"}
                    onClick={() => togglePublicLink(t)}
                    style={t.public_form?.enabled ? { background: "var(--c-primary)", color: "#fff" } : {}}
                    data-testid={`template-public-${t.template_id}`}>
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    {t.public_form?.enabled ? "Public link on" : "Public link"}
                  </Button>
                )}
                {features.bulk_send && canBulk(t) && (
                  <Button size="sm" variant="outline" onClick={() => setBulkTpl(t)} data-testid={`template-bulk-${t.template_id}`}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Bulk send
                  </Button>
                )}
                {features.team_templates && (
                  <Button
                    size="sm"
                    variant={t.shared_with_team ? "default" : "outline"}
                    disabled={sharing === t.template_id}
                    onClick={() => toggleShare(t.template_id, t.shared_with_team)}
                    data-testid={`template-share-${t.template_id}`}
                    style={t.shared_with_team ? { background: "var(--c-primary)", color: "#fff" } : {}}
                  >
                    {sharing === t.template_id
                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <Users className="mr-1.5 h-3.5 w-3.5" />}
                    {t.shared_with_team ? "Shared" : "Share with team"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => remove(t.template_id)}
                  data-testid={`template-delete-${t.template_id}`}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!useTpl} onOpenChange={(o) => !o && setUseTpl(null)}>
        <DialogContent data-testid="use-template-dialog">
          <DialogHeader>
            <DialogTitle>Use template, {useTpl?.name}</DialogTitle>
            <DialogDescription>
              Creates a new draft envelope with fields pre-placed. Assign each role to a real person.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {useRoles.map((r, i) => (
              <div key={r.role_id} className="rounded-lg border border-[var(--c-border)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{r.role_name}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Full name" value={r.name}
                    onChange={(e) => setUseRoles((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    data-testid={`use-template-name-${i}`} />
                  <Input placeholder="email@company.com" value={r.email}
                    onChange={(e) => setUseRoles((prev) => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                    data-testid={`use-template-email-${i}`} />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseTpl(null)}>Cancel</Button>
            <Button onClick={runUseTemplate} disabled={useBusy} data-testid="use-template-submit"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {useBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
              Create envelope
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bulkTpl} onOpenChange={(o) => !o && setBulkTpl(null)}>
        <DialogContent data-testid="bulk-send-dialog">
          <DialogHeader>
            <DialogTitle>Bulk send, {bulkTpl?.name}</DialogTitle>
            <DialogDescription>
              One envelope per row. Format: <span className="font-mono">Name, email@company.com</span> (one per line).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="bulk-rows">Recipients</Label>
              <Textarea id="bulk-rows" className="mt-1 font-mono text-sm" rows={8}
                placeholder={"Jane Smith, jane@example.com\nJohn Doe, john@example.com"}
                value={bulkRows} onChange={(e) => setBulkRows(e.target.value)} data-testid="bulk-rows-input" />
            </div>
            <div>
              <Label htmlFor="bulk-msg">Message (optional)</Label>
              <Textarea id="bulk-msg" className="mt-1" rows={2} value={bulkMsg}
                onChange={(e) => setBulkMsg(e.target.value)} placeholder="Note included in signing emails…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTpl(null)}>Cancel</Button>
            <Button onClick={runBulkSend} disabled={bulkSending} data-testid="bulk-send-submit"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {bulkSending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Send to all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuotaLimitModal open={quotaModal} onOpenChange={setQuotaModal} detail={quotaDetail} />
    </AppShell>
  );
}