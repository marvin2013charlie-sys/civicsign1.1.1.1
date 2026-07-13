import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { getAppOrigin } from "@/lib/appOrigin";
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
import { formatProMonthlyShort } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutTemplate, Loader2, Trash2, FileText, Send, Play, Sparkles, Link2,
  BookCopy, Share2, Zap,
} from "lucide-react";

const StatChip = ({ emoji, bg, label, value }) => (
  <div className="cs-portal-surface-card rounded-2xl p-4">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{label}</span>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-sm" style={{ background: bg }}>{emoji}</span>
    </div>
    <p className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">{value}</p>
  </div>
);

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
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) =>
      (t.name || "").toLowerCase().includes(q)
      || (t.description || "").toLowerCase().includes(q),
    );
  }, [items, query]);

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
        base_url: getAppOrigin(),
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
        const url = `${getAppOrigin()}/form/${data.public_form.slug}`;
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

  const sharedCount = items.filter((t) => t.shared_with_team).length;
  const bulkReadyCount = items.filter(canBulk).length;

  return (
    <AppShell
      headerSearch={{
        value: query,
        onChange: setQuery,
        placeholder: "Search templates…",
        testId: "templates-search-input",
      }}
      actions={(
        <button
          type="button"
          onClick={() => navigate("/new")}
          data-testid="templates-create-envelope"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 4px 14px rgba(18,33,32,.16)" }}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">New envelope</span>
        </button>
      )}
    >
      <div className="mb-5">
        <div
          style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
        >
          Reuse faster
        </div>
        <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
          Templates
          <span style={{ color: "var(--c-accent)" }}>.</span>
        </h2>
        <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
          Save prepared documents with fields and roles — send the same agreement in seconds.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatChip emoji="📋" bg="var(--badge-teal-bg)" label="Your templates" value={items.length} />
            <StatChip emoji="👥" bg="var(--badge-info-bg)" label="Shared with team" value={sharedCount} />
            <StatChip emoji="⚡" bg="var(--badge-coral-bg)" label="Bulk-ready" value={bulkReadyCount} />
          </>
        )}
      </div>

      {shouldOfferUpgrade("public_links") && (
        <div className="mb-5">
          <UpgradePrompt
            feature="public_links"
            title="Public signing links on Pro"
            description={`Share a URL anyone can use to sign, DocuSign calls this PowerForms and locks it to Business Pro (~£45/user). We include it on Pro at ${formatProMonthlyShort()}.`}
          />
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

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          {samples.length > 0 && (
            <section className="cs-portal-surface-card overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
                <Sparkles className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">Starter library</h3>
                <span className="ml-auto rounded-full bg-[var(--c-portal-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
                  {samples.length} UK-ready
                </span>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {samples.map((s) => (
                  <div key={s.sample_id} className="cs-portal-surface-card rounded-xl p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{s.category}</p>
                    <p className="mt-1 font-semibold text-[var(--c-ink)]">{s.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--c-muted-fg)]">{s.description}</p>
                    <Button size="sm" variant="outline" className="mt-3 w-full rounded-xl" disabled={cloning === s.sample_id}
                      onClick={() => cloneSample(s.sample_id)}>
                      {cloning === s.sample_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add to library"}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="cs-portal-surface-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
              <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">My templates</h3>
              <span className="rounded-full bg-[var(--c-portal-card)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
                {loading ? "…" : `${filteredItems.length} shown`}
              </span>
            </div>

            {loading ? (
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center" data-testid="templates-empty">
                <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
                  <LayoutTemplate className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
                </span>
                <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No templates yet</h3>
                <p className="mt-1 max-w-sm text-sm text-[var(--c-muted-fg)]">
                  Open a draft in Prepare Studio and choose &ldquo;Save as template&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/new")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
                  style={{ background: "var(--c-ink-solid)" }}
                >
                  <FileText className="h-4 w-4" /> Create an envelope
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-6 py-14 text-center" data-testid="templates-no-results">
                <p className="font-medium text-[var(--c-ink)]">No templates match your search</p>
                <p className="mt-1 text-sm text-[var(--c-muted-fg)]">Try a different name or clear the search bar above.</p>
              </div>
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2" data-testid="templates-list">
                {filteredItems.map((t) => (
                  <div key={t.template_id} className="cs-portal-surface-card flex h-full flex-col rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--badge-teal-bg)" }}>
                        <FileText className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-heading font-semibold text-[var(--c-ink)]">{t.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
                            {t.document?.page_count || 0} pg
                          </span>
                          <span className="rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
                            Used {t.use_count || 0}×
                          </span>
                          {t.shared_with_team && (
                            <span className="rounded-full bg-[var(--status-sent-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-primary)]">Team</span>
                          )}
                          {canBulk(t) && (
                            <span className="rounded-full bg-[var(--badge-coral-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--badge-coral-fg)]">Bulk</span>
                          )}
                        </div>
                        {t.description ? <p className="mt-2 line-clamp-2 text-sm text-[var(--c-muted-fg)]">{t.description}</p> : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openUse(t)}
                        data-testid={`template-use-${t.template_id}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                        style={{ background: "var(--c-ink-solid)" }}
                      >
                        <Play className="h-3.5 w-3.5" /> Use template
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {features.public_links && canBulk(t) && (
                          <Button size="sm" variant={t.public_form?.enabled ? "default" : "outline"} className="h-8 flex-1 rounded-xl text-xs"
                            onClick={() => togglePublicLink(t)}
                            style={t.public_form?.enabled ? { background: "var(--c-primary)", color: "#fff" } : {}}
                            data-testid={`template-public-${t.template_id}`}>
                            <Link2 className="mr-1 h-3.5 w-3.5" />
                            {t.public_form?.enabled ? "Public on" : "Public link"}
                          </Button>
                        )}
                        {features.bulk_send && canBulk(t) && (
                          <Button size="sm" variant="outline" className="h-8 flex-1 rounded-xl text-xs" onClick={() => setBulkTpl(t)} data-testid={`template-bulk-${t.template_id}`}>
                            <Send className="mr-1 h-3.5 w-3.5" /> Bulk
                          </Button>
                        )}
                        {features.team_templates && (
                          <Button
                            size="sm"
                            variant={t.shared_with_team ? "default" : "outline"}
                            className="h-8 flex-1 rounded-xl text-xs"
                            disabled={sharing === t.template_id}
                            onClick={() => toggleShare(t.template_id, t.shared_with_team)}
                            data-testid={`template-share-${t.template_id}`}
                            style={t.shared_with_team ? { background: "var(--c-primary)", color: "#fff" } : {}}
                          >
                            {sharing === t.template_id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Share2 className="mr-1 h-3.5 w-3.5" />}
                            {t.shared_with_team ? "Shared" : "Share"}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs text-red-600 hover:text-red-700" onClick={() => remove(t.template_id)} data-testid={`template-delete-${t.template_id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">
              <BookCopy className="h-3.5 w-3.5" /> How templates work
            </h4>
            <ol className="mt-3 space-y-2.5">
              {[
                "Prepare an envelope and place all fields",
                "Save as template from Prepare Studio",
                "Reuse anytime — assign roles to new signers",
              ].map((line, i) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--c-ink)]">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "var(--badge-teal-bg)", color: "var(--c-primary)" }}>
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          </div>

          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">
              <Zap className="h-3.5 w-3.5" /> Pro features
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--c-ink)]">
              <li className="flex items-start gap-2"><Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--c-primary)]" /> Share templates with your team</li>
              <li className="flex items-start gap-2"><Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--c-primary)]" /> Public signing links (single signer)</li>
              <li className="flex items-start gap-2"><Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--c-primary)]" /> Bulk send from one template</li>
            </ul>
          </div>
        </div>
      </div>

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