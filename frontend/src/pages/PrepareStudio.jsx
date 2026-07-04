import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { pdfjs, PDF_OPTIONS } from "@/lib/pdf"; // eslint-disable-line no-unused-vars
import api, { formatApiError, fetchPdfBlobUrl } from "@/lib/api";
import { FIELD_TYPES, FIELD_ORDER, hexToRgba } from "@/lib/fields";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Plus, Trash2, ZoomIn, ZoomOut, Send, UserPlus, Loader2,
  GripVertical, X, Users, ListOrdered, LayoutTemplate, LayoutGrid,
} from "lucide-react";

const COLORS = ["#14B8A6", "#38BDF8", "#F59E0B", "#FB7185", "#84CC16", "#A78BFA"];

function PrepareField({ f, color, selected, onSelect, onChange, onDelete }) {
  const meta = FIELD_TYPES[f.type] || FIELD_TYPES.text;
  const Icon = meta.icon;

  const startDrag = (e) => {
    e.stopPropagation();
    onSelect(f.field_id);
    const overlay = e.currentTarget.parentElement;
    const rect = overlay.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY, ox = f.x, oy = f.y;
    const move = (ev) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      onChange(f.field_id, {
        x: Math.min(Math.max(0, ox + dx), 1 - f.w),
        y: Math.min(Math.max(0, oy + dy), 1 - f.h),
      });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e) => {
    e.stopPropagation();
    const fieldBox = e.currentTarget.parentElement;
    const overlay = fieldBox.parentElement;
    const rect = overlay.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY, ow = f.w, oh = f.h;
    const move = (ev) => {
      const dw = (ev.clientX - startX) / rect.width;
      const dh = (ev.clientY - startY) / rect.height;
      onChange(f.field_id, {
        w: Math.min(Math.max(0.03, ow + dw), 1 - f.x),
        h: Math.min(Math.max(0.018, oh + dh), 1 - f.y),
      });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className="cs-field"
      data-testid="placed-field"
      onPointerDown={startDrag}
      onClick={(e) => { e.stopPropagation(); onSelect(f.field_id); }}
      style={{
        left: `${f.x * 100}%`, top: `${f.y * 100}%`,
        width: `${f.w * 100}%`, height: `${f.h * 100}%`,
        borderColor: color, background: hexToRgba(color, 0.14), color,
        cursor: "move", boxShadow: selected ? `0 0 0 2px ${color}` : "none",
      }}
    >
      <span className="pointer-events-none flex items-center gap-1 truncate px-1">
        <Icon className="h-3 w-3" /> {meta.label}
      </span>
      {selected && (
        <>
          <button
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
            onClick={(e) => { e.stopPropagation(); onDelete(f.field_id); }}
            onPointerDown={(e) => e.stopPropagation()}
            data-testid="field-delete-button"
          >
            <X className="h-3 w-3" />
          </button>
          <div
            onPointerDown={startResize}
            className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm"
            style={{ background: color }}
          />
        </>
      )}
    </div>
  );
}

export default function PrepareStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [env, setEnv] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [fields, setFields] = useState([]);
  const [signingOrder, setSigningOrder] = useState("sequential");
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [tool, setTool] = useState(null);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState(760);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newRec, setNewRec] = useState({ name: "", email: "" });
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  // Mobile bottom-sheet: which panel is open ("recipients" | "fields" | null).
  const [mobileSheet, setMobileSheet] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/envelopes/${id}`);
      if (data.status !== "draft") { navigate(`/envelope/${id}`); return; }
      setEnv(data);
      setRecipients(data.recipients || []);
      setFields(data.fields || []);
      setSigningOrder(data.signing_order || "sequential");
      setActiveRecipient(data.recipients?.[0]?.recipient_id || null);
      const url = await fetchPdfBlobUrl(`/envelopes/${id}/file`);
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
    const onResize = () => {
      const avail = Math.min(window.innerWidth - (window.innerWidth >= 1024 ? 360 : 48), 820);
      setPageWidth(Math.max(320, avail));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const addRecipient = () => {
    if (!newRec.name.trim() || !newRec.email.trim()) { toast.error("Enter name and email"); return; }
    const rid = `rcp_${Math.random().toString(36).slice(2, 10)}`;
    const color = COLORS[recipients.length % COLORS.length];
    const r = { recipient_id: rid, name: newRec.name.trim(), email: newRec.email.trim().toLowerCase(),
      order: recipients.length + 1, color, status: "pending" };
    setRecipients((p) => [...p, r]);
    setActiveRecipient(rid);
    setNewRec({ name: "", email: "" });
  };

  const removeRecipient = (rid) => {
    setRecipients((p) => p.filter((r) => r.recipient_id !== rid).map((r, i) => ({ ...r, order: i + 1 })));
    setFields((p) => p.filter((f) => f.recipient_id !== rid));
    if (activeRecipient === rid) setActiveRecipient(null);
  };

  const placeField = (pageNum, xPct, yPct) => {
    if (!tool) return;
    if (!activeRecipient) { toast.error("Add and select a recipient first"); return; }
    const meta = FIELD_TYPES[tool];
    const x = Math.min(Math.max(0, xPct - meta.w / 2), 1 - meta.w);
    const y = Math.min(Math.max(0, yPct - meta.h / 2), 1 - meta.h);
    const fid = `fld_${Math.random().toString(36).slice(2, 10)}`;
    setFields((p) => [...p, { field_id: fid, recipient_id: activeRecipient, page: pageNum,
      type: tool, x, y, w: meta.w, h: meta.h, required: true, value: null }]);
    setSelected(fid);
  };

  const updateField = (fid, patch) => setFields((p) => p.map((f) => (f.field_id === fid ? { ...f, ...patch } : f)));
  const deleteField = (fid) => { setFields((p) => p.filter((f) => f.field_id !== fid)); setSelected(null); };

  const colorFor = (rid) => recipients.find((r) => r.recipient_id === rid)?.color || "#14B8A6";

  const persist = async () => {
    const payload = {
      signing_order: signingOrder,
      recipients: recipients.map((r) => ({ recipient_id: r.recipient_id, name: r.name, email: r.email, order: r.order, color: r.color })),
      fields: fields.map((f) => ({ field_id: f.field_id, recipient_id: f.recipient_id, page: f.page, type: f.type, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, value: f.value })),
    };
    const { data } = await api.put(`/envelopes/${id}`, payload);
    return data;
  };

  const saveAndExit = async () => {
    setSaving(true);
    try { await persist(); toast.success("Draft saved"); navigate("/dashboard"); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const continueToSend = async () => {
    if (recipients.length === 0) { toast.error("Add at least one recipient"); return; }
    if (fields.length === 0) { toast.error("Place at least one field"); return; }
    for (const r of recipients) {
      if (!fields.some((f) => f.recipient_id === r.recipient_id)) {
        toast.error(`${r.name} has no fields assigned`); setActiveRecipient(r.recipient_id); return;
      }
    }
    setSaving(true);
    try { await persist(); navigate(`/send/${id}`); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const openTemplateDialog = () => {
    if (recipients.length === 0 || fields.length === 0) {
      toast.error("Add recipients and fields before saving as a template");
      return;
    }
    setTplName(env?.title || "Untitled template");
    setTplDesc("");
    setTplOpen(true);
  };

  const saveAsTemplate = async () => {
    setSavingTpl(true);
    try {
      await persist();
      await api.post(`/templates/from-envelope/${id}`, { name: tplName, description: tplDesc });
      toast.success("Template saved");
      setTplOpen(false);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSavingTpl(false);
    }
  };

  const pages = env?.document?.pages || [];
  const renderWidth = Math.round(pageWidth * zoom);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div>;
  }

  // Shared panel content — rendered both in the desktop sidebar and inside the
  // mobile bottom sheet so the prepare flow has full parity on phones.
  const renderPanels = ({ onPick } = {}) => (
    <div className="space-y-6 p-4">
      {/* Recipients */}
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"><Users className="h-3.5 w-3.5" /> Recipients</div>
        <div className="mt-3 space-y-2">
          {recipients.map((r) => (
            <div key={r.recipient_id}
              onClick={() => setActiveRecipient(r.recipient_id)}
              data-testid="recipient-row"
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${activeRecipient === r.recipient_id ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)]" : "border-[var(--c-border)] bg-white"}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--c-ink)]">{r.name}</p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">{r.email}</p>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">#{r.order}</span>
              <button onClick={(e) => { e.stopPropagation(); removeRecipient(r.recipient_id); }} className="text-[var(--muted-foreground)] hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-[var(--c-border)] p-3">
          <Input value={newRec.name} onChange={(e) => setNewRec({ ...newRec, name: e.target.value })} placeholder="Recipient name" className="h-9" data-testid="recipient-name-input" />
          <Input value={newRec.email} onChange={(e) => setNewRec({ ...newRec, email: e.target.value })} placeholder="email@company.com" className="h-9" data-testid="recipient-email-input" />
          <Button variant="outline" className="w-full" onClick={addRecipient} data-testid="recipient-add-button"><UserPlus className="mr-1.5 h-4 w-4" /> Add recipient</Button>
        </div>
      </section>

      {/* Signing order */}
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"><ListOrdered className="h-3.5 w-3.5" /> Signing order</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[["sequential", "Sequential"], ["parallel", "Parallel"]].map(([v, l]) => (
            <button key={v} onClick={() => setSigningOrder(v)} data-testid={`order-${v}`}
              className={`rounded-lg border px-2 py-2 text-sm font-medium ${signingOrder === v ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)] text-[var(--c-ink)]" : "border-[var(--c-border)] bg-white text-[var(--muted-foreground)]"}`}>{l}</button>
          ))}
        </div>
      </section>

      {/* Fields palette */}
      <section>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Fields</div>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Pick a field, then tap the document to place it for <b style={{ color: colorFor(activeRecipient) }}>{recipients.find((r) => r.recipient_id === activeRecipient)?.name || "— select recipient"}</b>.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {FIELD_ORDER.map((t) => {
            const m = FIELD_TYPES[t]; const Icon = m.icon; const active = tool === t;
            return (
              <button key={t}
                onClick={() => { setTool(active ? null : t); onPick && onPick(); }}
                data-testid={`field-chip-${t}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${active ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)] text-[var(--c-ink)]" : "border-[var(--c-border)] bg-white text-[var(--c-ink)] hover:bg-[var(--c-paper-2)]"}`}>
                <Icon className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> {m.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  const activeRec = recipients.find((r) => r.recipient_id === activeRecipient);

  return (
    <div className="flex h-screen flex-col bg-[var(--c-paper)]">
      {/* Top toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--c-border)] bg-[var(--card)] px-3 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="prepare-back-button"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="hidden sm:block"><Logo to="/dashboard" /></div>
        <span className="min-w-0 flex-1 truncate font-heading text-sm font-semibold text-[var(--c-ink)] sm:flex-none sm:text-base">{env?.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-lg border border-[var(--c-border)] p-0.5 sm:flex">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} data-testid="prepare-zoom-out-button"><ZoomOut className="h-4 w-4" /></Button>
            <span className="w-10 text-center text-xs text-[var(--muted-foreground)]">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} data-testid="prepare-zoom-in-button"><ZoomIn className="h-4 w-4" /></Button>
          </div>
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={openTemplateDialog} disabled={saving} data-testid="prepare-save-template-button">
            <LayoutTemplate className="mr-1.5 h-4 w-4" /> Save as template
          </Button>
          <Button variant="outline" onClick={saveAndExit} disabled={saving} data-testid="prepare-save-button" className="hidden sm:inline-flex">Save & exit</Button>
          <Button onClick={continueToSend} disabled={saving} data-testid="prepare-send-button" style={{ background: "var(--c-primary)", color: "#fff" }} className="px-3 sm:px-4">
            {saving ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" /> : <Send className="h-4 w-4 sm:mr-1.5" />}
            <span className="hidden sm:inline">Continue to send</span>
            <span className="ml-1 sm:hidden">Send</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left control panel — desktop only. Mobile uses a bottom sheet. */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-[var(--c-border)] bg-[var(--card)] lg:flex">
          <ScrollArea className="flex-1 cs-scroll">
            {renderPanels()}
          </ScrollArea>
        </aside>

        {/* Document canvas */}
        <div className="min-w-0 flex-1 overflow-auto cs-scroll cs-grid-paper" data-testid="prepare-canvas">
          {tool && (
            <div className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-[var(--c-ink-solid)] px-4 py-2 text-sm text-white">
              <Plus className="h-4 w-4" /> Placing <b>{FIELD_TYPES[tool].label}</b> — click on the document. <button className="ml-2 underline" onClick={() => setTool(null)}>Done</button>
            </div>
          )}
          <div className="flex flex-col items-center py-6" onClick={() => setSelected(null)}>
            {blobUrl && (
              <Document file={blobUrl} options={PDF_OPTIONS} loading={<Loader2 className="mt-10 h-8 w-8 animate-spin text-[var(--c-primary)]" />} error={<div className="mt-10 text-sm text-red-600">Failed to load document.</div>}>
                {pages.map((dim, i) => {
                  const aspect = dim.height / dim.width;
                  const h = renderWidth * aspect;
                  return (
                    <div key={i} className="relative mb-6 bg-white shadow-[0_6px_24px_rgba(15,23,32,0.12)]" style={{ width: renderWidth, height: h }}>
                      <Page pageNumber={i + 1} width={renderWidth} renderTextLayer={false} renderAnnotationLayer={false}
                        loading={<div style={{ height: h }} className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" /></div>} />
                      <div className="absolute inset-0" style={{ cursor: tool ? "crosshair" : "default" }}
                        onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); placeField(i, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height); }}>
                        {fields.filter((f) => f.page === i).map((f) => (
                          <PrepareField key={f.field_id} f={f} color={colorFor(f.recipient_id)}
                            selected={selected === f.field_id} onSelect={setSelected} onChange={updateField} onDelete={deleteField} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </Document>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom toolbar — Zoho-style: open Recipients / Fields panels in a bottom sheet. */}
      <Sheet open={!!mobileSheet} onOpenChange={(o) => { if (!o) setMobileSheet(null); }}>
        <div className="flex shrink-0 items-center gap-2 border-t border-[var(--c-border)] bg-[var(--card)] px-3 py-2 lg:hidden">
          <button
            onClick={() => setMobileSheet("recipients")}
            data-testid="mobile-open-recipients"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--c-ink)]"
          >
            <Users className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
            {activeRec ? (
              <>
                <span className="h-2 w-2 rounded-full" style={{ background: activeRec.color }} />
                <span className="max-w-[120px] truncate">{activeRec.name}</span>
              </>
            ) : (
              <span>{recipients.length === 0 ? "Add recipient" : `${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`}</span>
            )}
          </button>
          <button
            onClick={() => setMobileSheet("fields")}
            data-testid="mobile-open-fields"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--c-primary)" }}
          >
            <LayoutGrid className="h-4 w-4" />
            {tool ? <>Placing <b className="font-bold">{FIELD_TYPES[tool].label}</b></> : <>Fields ({fields.length})</>}
          </button>
        </div>

        <SheetContent
          side="bottom"
          className="max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-[var(--c-border)] bg-[var(--card)] p-0 cs-scroll lg:hidden"
          data-testid="mobile-prepare-sheet"
        >
          <SheetHeader className="sticky top-0 z-10 border-b border-[var(--c-border)] bg-[var(--card)] px-4 pt-4 text-left">
            <SheetTitle className="font-heading text-base">
              {mobileSheet === "recipients" ? "Recipients & order" : "Place fields"}
            </SheetTitle>
            <p className="pb-2 text-xs text-[var(--muted-foreground)]">
              {mobileSheet === "recipients"
                ? "Add who needs to sign, set the signing order, then pick fields."
                : "Tap a field then tap anywhere on the document to drop it."}
            </p>
          </SheetHeader>
          {renderPanels({ onPick: () => setMobileSheet(null) })}
        </SheetContent>
      </Sheet>

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent data-testid="save-template-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Save as template</DialogTitle>
            <DialogDescription>Reuse this document, its fields, and recipient roles anytime.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="tpl-name">Template name</Label>
              <Input id="tpl-name" value={tplName} onChange={(e) => setTplName(e.target.value)} className="mt-1" data-testid="template-name-input" />
            </div>
            <div>
              <Label htmlFor="tpl-desc">Description (optional)</Label>
              <Textarea id="tpl-desc" rows={3} value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} className="mt-1" data-testid="template-desc-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button onClick={saveAsTemplate} disabled={savingTpl} data-testid="template-save-submit" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {savingTpl ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LayoutTemplate className="mr-1.5 h-4 w-4" />} Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
