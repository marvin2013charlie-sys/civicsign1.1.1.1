import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutTemplate, MoreVertical, Trash2, Play, Users, PenLine, Loader2,
  Send, Copy, FilePlus2, CheckCircle2, Layers, Sparkles,
} from "lucide-react";

function UseDialog({ template, open, onOpenChange }) {
  const navigate = useNavigate();
  const [map, setMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && template) {
      const init = {};
      template.roles.forEach((r) => { init[r.role_id] = { name: r.name, email: "" }; });
      setMap(init);
    }
  }, [open, template]);

  const submit = async () => {
    for (const r of template.roles) {
      if (!map[r.role_id]?.email?.trim()) { toast.error(`Enter an email for ${r.name}`); return; }
    }
    setLoading(true);
    try {
      const recipients = template.roles.map((r) => ({
        role_id: r.role_id, name: map[r.role_id].name || r.name, email: map[r.role_id].email,
      }));
      const { data } = await api.post(`/templates/${template.template_id}/use`, { recipients });
      toast.success("Envelope created from template");
      navigate(`/send/${data.envelope_id}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="use-template-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Use “{template.name}”</DialogTitle>
          <DialogDescription>Assign a recipient to each role, then send.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {template.roles.map((r) => (
            <div key={r.role_id} className="rounded-lg border border-[var(--c-border)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                <span className="text-sm font-semibold text-[var(--c-ink)]">Role: {r.name}</span>
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">#{r.order}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Recipient name" value={map[r.role_id]?.name || ""}
                  onChange={(e) => setMap((m) => ({ ...m, [r.role_id]: { ...m[r.role_id], name: e.target.value } }))}
                  data-testid="use-role-name" />
                <Input type="email" placeholder="email@company.com" value={map[r.role_id]?.email || ""}
                  onChange={(e) => setMap((m) => ({ ...m, [r.role_id]: { ...m[r.role_id], email: e.target.value } }))}
                  data-testid="use-role-email" />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} data-testid="use-template-submit"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />} Create & review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ template, open, onOpenChange }) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (open) { setRaw(""); setResult(null); } }, [open]);

  const parseRows = () =>
    raw.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) return { name: parts[0], email: parts[1] };
      return { name: parts[0].split("@")[0], email: parts[0] };
    }).filter((r) => r.email && r.email.includes("@"));

  const rows = parseRows();

  const submit = async () => {
    if (rows.length === 0) { toast.error("Add at least one valid recipient (Name, email)"); return; }
    setLoading(true);
    try {
      const { data } = await api.post(`/templates/${template.template_id}/bulk-send`, {
        base_url: window.location.origin, rows,
      });
      setResult(data);
      toast.success(`Sent ${data.created} document(s)`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Link copied"); };

  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="bulk-send-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Bulk send “{template.name}”</DialogTitle>
          <DialogDescription>Send this single-signer template to many recipients at once.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div>
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--status-completed-bg)] p-3 text-sm font-medium text-[var(--c-ink)]">
              <CheckCircle2 className="h-4 w-4" style={{ color: "#16A34A" }} /> {result.created} document(s) sent
            </div>
            <div className="max-h-64 space-y-2 overflow-auto cs-scroll">
              {result.envelopes.map((e) => (
                <div key={e.envelope_id} className="flex items-center justify-between rounded-lg border border-[var(--c-border)] p-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--c-ink)]">{e.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{e.email}</p></div>
                  {e.sign_url && <Button variant="outline" size="sm" onClick={() => copy(e.sign_url)}><Copy className="h-3.5 w-3.5" /></Button>}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-3"><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <>
            <div>
              <Label>Recipients (one per line: <span className="font-mono">Name, email</span>)</Label>
              <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)}
                placeholder={"Alice Johnson, alice@acme.com\nBob Smith, bob@acme.com"} className="mt-1 font-mono text-sm"
                data-testid="bulk-rows-input" />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{rows.length} valid recipient(s) detected</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={submit} disabled={loading || rows.length === 0} data-testid="bulk-send-submit"
                style={{ background: "var(--c-primary)", color: "#fff" }}>
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Send to {rows.length}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useT, setUseT] = useState(null);
  const [bulkT, setBulkT] = useState(null);

  const load = async () => {
    try {
      const [tpls, smp] = await Promise.all([
        api.get("/templates"),
        api.get("/templates/samples"),
      ]);
      setTemplates(tpls.data);
      setSamples(smp.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/templates/${id}`);
      setTemplates((p) => p.filter((t) => t.template_id !== id));
      toast.success("Template deleted");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");

  return (
    <AppShell
      title="Templates"
      actions={
        <Button onClick={() => navigate("/new")} data-testid="templates-new-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> New document
        </Button>
      }
    >
      <p className="text-sm text-[var(--muted-foreground)]">
        Reusable documents with pre-placed fields and recipient roles. Create one by preparing a document and choosing <b>Save as template</b> in the editor.
      </p>

      {/* Starter templates (shared sample library) */}
      {samples.length > 0 && (
        <div className="mt-6" data-testid="starter-templates-section">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
            <h2 className="font-heading text-base font-semibold text-[var(--c-ink)]">Starter templates</h2>
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Ready-made documents you can send right away. Just add recipients.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {samples.map((t) => (
              <div key={t.template_id} data-testid="sample-template-card" className="flex flex-col rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]"><LayoutTemplate className="h-5 w-5" style={{ color: "var(--c-primary)" }} /></span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-sent-bg)", color: "var(--c-ink)" }}>Sample</span>
                </div>
                <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">{t.name}</h3>
                {t.description ? <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted-foreground)]">{t.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.roles?.length} role(s)</span>
                  <span className="flex items-center gap-1"><PenLine className="h-3.5 w-3.5" /> {t.fields?.length} field(s)</span>
                  <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {t.document?.page_count} page(s)</span>
                </div>
                <div className="mt-4 flex flex-1 items-end gap-2">
                  <Button className="flex-1" onClick={() => setUseT(t)} data-testid="sample-use-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
                    <Play className="mr-1.5 h-4 w-4" /> Use
                  </Button>
                  {t.roles?.length === 1 && (
                    <Button variant="outline" onClick={() => setBulkT(t)} data-testid="sample-bulk-button">
                      <Send className="mr-1.5 h-4 w-4" /> Bulk
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <h2 className="mt-8 font-heading text-base font-semibold text-[var(--c-ink)]">Your templates</h2>
        </div>
      )}

      {loading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : templates.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-6 py-20 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-sent-bg)" }}>
            <LayoutTemplate className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
          </span>
          <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">No templates yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">Prepare a document with fields and recipients, then click “Save as template” to reuse it again and again.</p>
          <Button onClick={() => navigate("/new")} className="mt-5" data-testid="empty-templates-new-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
            <FilePlus2 className="mr-1.5 h-4 w-4" /> Prepare a document
          </Button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.template_id} data-testid="template-card" className="flex flex-col rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-paper-2)]"><LayoutTemplate className="h-5 w-5" style={{ color: "var(--c-primary)" }} /></span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" data-testid="template-menu"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-600" onClick={() => remove(t.template_id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">{t.name}</h3>
              {t.description ? <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted-foreground)]">{t.description}</p> : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.roles?.length} role(s)</span>
                <span className="flex items-center gap-1"><PenLine className="h-3.5 w-3.5" /> {t.fields?.length} field(s)</span>
                <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {t.document?.page_count} page(s)</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Used {t.use_count || 0}× · {fmt(t.created_at)}</p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => setUseT(t)} data-testid="template-use-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
                  <Play className="mr-1.5 h-4 w-4" /> Use
                </Button>
                {t.roles?.length === 1 && (
                  <Button variant="outline" onClick={() => setBulkT(t)} data-testid="template-bulk-button">
                    <Send className="mr-1.5 h-4 w-4" /> Bulk
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <UseDialog template={useT} open={!!useT} onOpenChange={(o) => !o && setUseT(null)} />
      <BulkDialog template={bulkT} open={!!bulkT} onOpenChange={(o) => !o && setBulkT(null)} />
    </AppShell>
  );
}
