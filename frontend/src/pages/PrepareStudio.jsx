import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document } from "react-pdf";
import { PdfPageLayer } from "@/components/PdfPageLayer";
import { toast } from "sonner";
import { PDF_OPTIONS } from "@/lib/pdf";
import api, { formatApiError, fetchPdfBlobUrl } from "@/lib/api";
import { FIELD_TYPES, FIELD_ORDER, hexToRgba } from "@/lib/fields";

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
  X, Users, ListOrdered, LayoutTemplate, LayoutGrid, Save, ShieldCheck,
  UploadCloud, PenLine, FileText,
} from "lucide-react";
import { usePlan } from "@/hooks/usePlan";

import { RECIPIENT_COLORS } from "@/lib/semanticColors";
const COLORS = RECIPIENT_COLORS;

const PREPARE_STEPS = [
  { id: 1, label: "Upload", icon: UploadCloud, done: true },
  { id: 2, label: "Prepare", icon: PenLine, active: true },
  { id: 3, label: "Send", icon: Send, done: false },
];

function PanelCard({ title, icon: Icon, children, testId }) {
  return (
    <section className="cs-portal-surface-card overflow-hidden rounded-xl" data-testid={testId}>
      <div className="flex items-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-3">
        {Icon && <Icon className="h-3.5 w-3.5 text-[var(--c-primary)]" />}
        <h3 className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

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
      className={`cs-field${selected ? " cs-field-selected" : ""}`}
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
  const { features } = usePlan();
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
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pageRefs = useRef([]);
  const canvasAreaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/envelopes/${id}`);
        if (cancelled) return;
        if (data.status !== "draft") { navigate(`/envelope/${id}`); return; }
        setEnv(data);
        setRecipients(data.recipients || []);
        setFields(data.fields || []);
        setSigningOrder(data.signing_order || "sequential");
        setActiveRecipient(data.recipients?.[0]?.recipient_id || null);
        const url = await fetchPdfBlobUrl(`/envelopes/${id}/file`);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      } catch (err) {
        if (cancelled) return;
        toast.error(formatApiError(err));
        navigate("/dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  const fetchContactSuggestions = async (q) => {
    try {
      const [hist, book] = await Promise.all([
        api.get("/recipients/suggestions", { params: { q } }).then((r) => r.data).catch(() => []),
        api.get("/contacts", { params: { q } }).then((r) => r.data).catch(() => []),
      ]);
      const seen = new Set();
      const merged = [];
      [...book, ...hist].forEach((c) => {
        const email = (c.email || "").toLowerCase();
        if (!email || seen.has(email)) return;
        seen.add(email);
        merged.push({ name: c.name, email: c.email });
      });
      setContactSuggestions(merged.slice(0, 12));
      setShowSuggestions(merged.length > 0);
    } catch {
      setContactSuggestions([]);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const measure = () => {
      const el = canvasAreaRef.current;
      const avail = el?.clientWidth
        ? Math.max(320, el.clientWidth - 32)
        : Math.max(280, window.innerWidth - (window.innerWidth >= 1280 ? 420 : 24));
      setPageWidth(Math.min(820, avail));
    };
    measure();
    const el = canvasAreaRef.current;
    const ro = el ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [loading]);

  const addRecipient = () => {
    if (!newRec.name.trim() || !newRec.email.trim()) { toast.error("Enter name and email"); return; }
    if (features.max_recipients && recipients.length >= features.max_recipients) {
      toast.error(`Your plan allows up to ${features.max_recipients} recipients. Upgrade to Pro for more.`);
      return;
    }
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
      recipients: recipients.map((r) => ({
        recipient_id: r.recipient_id, name: r.name, email: r.email, order: r.order, color: r.color,
        auth_method: r.auth_method || null,
        auth_phone: r.auth_phone || null,
        auth_kba_postcode: r.auth_kba_postcode || null,
      })),
      fields: fields.map((f) => ({ field_id: f.field_id, recipient_id: f.recipient_id, page: f.page, type: f.type, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, options: f.options, value: f.value })),
    };
    const { data } = await api.put(`/envelopes/${id}`, payload);
    return data;
  };

  const saveAndExit = async () => {
    setSaving(true);
    try { await persist(); toast.success("Draft saved"); navigate("/dashboard"); }
    catch (err) { toast.error(formatApiError(err)); }
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
    catch (err) { toast.error(formatApiError(err)); }
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

  const saveAsTemplate = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (savingTpl || saving) return;
    setSavingTpl(true);
    try {
      await persist();
      await api.post(`/templates/from-envelope/${id}`, { name: tplName, description: tplDesc });
      toast.success("Template saved, find it on the Templates page");
      setTplOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingTpl(false);
    }
  };

  const pages = env?.document?.pages || [];
  const renderWidth = Math.round(pageWidth * zoom);
  const signingPageIndexes = pages.length >= 6
    ? [pages.length - 2, pages.length - 1]
    : pages.length > 1
      ? [pages.length - 1]
      : [];

  const jumpToPage = (index) => {
    pageRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="cs-portal-main-panel flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
        <p className="text-sm text-[var(--c-muted-fg)]">Loading your document…</p>
      </div>
    );
  }

  // Shared panel content, rendered both in the desktop sidebar and inside the
  // mobile bottom sheet so the prepare flow has full parity on phones.
  const renderPanels = ({ onPick, mode = "all" } = {}) => (
    <div className="prepare-panels box-border w-full max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 xl:p-4">
      {env?.document?.file_type === "docx" && (mode === "all" || mode === "fields") && (
        <div
          className="rounded-xl border-l-4 bg-[var(--status-sent-bg)] px-3 py-2.5 text-xs leading-relaxed text-[var(--c-ink)]"
          style={{ borderLeftColor: "var(--c-primary)" }}
        >
          Word document — signers can add <strong>signatures only</strong>, not edit text.
        </div>
      )}

      {(mode === "all" || mode === "recipients") && (
        <PanelCard title="Recipients" icon={Users}>
          <div className="space-y-2">
            {recipients.map((r) => (
              <div
                key={r.recipient_id}
                onClick={() => setActiveRecipient(r.recipient_id)}
                data-testid="recipient-row"
                className={`flex min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border p-2.5 transition-all ${
                  activeRecipient === r.recipient_id
                    ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)] shadow-sm"
                    : "border-[var(--c-border)] bg-[var(--c-portal-card)] hover:bg-[var(--c-paper-2)]"
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: r.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--c-ink)]">{r.name}</p>
                  <p className="truncate text-xs text-[var(--c-muted-fg)]">{r.email}</p>
                </div>
                <span className="rounded-full bg-[var(--c-paper-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">#{r.order}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeRecipient(r.recipient_id); }} className="text-[var(--c-muted-fg)] hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="relative mt-3 space-y-2 rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--c-paper)] p-3">
            <Input
              value={newRec.name}
              onChange={(e) => {
                const v = e.target.value;
                setNewRec({ ...newRec, name: v });
                fetchContactSuggestions(v);
              }}
              onFocus={() => fetchContactSuggestions(newRec.name)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Recipient name"
              className="h-9 rounded-lg bg-[var(--c-portal-card)]"
              data-testid="recipient-name-input"
            />
            <Input
              value={newRec.email}
              onChange={(e) => setNewRec({ ...newRec, email: e.target.value })}
              placeholder="email@company.com"
              className="h-9 rounded-lg bg-[var(--c-portal-card)]"
              data-testid="recipient-email-input"
            />
            {showSuggestions && contactSuggestions.length > 0 && (
              <ul className="absolute left-3 right-3 top-12 z-20 max-h-36 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--card)] shadow-lg" data-testid="recipient-suggestions">
                {contactSuggestions.map((c) => (
                  <li key={c.email}>
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--c-paper-2)]"
                      onMouseDown={() => {
                        setNewRec({ name: c.name, email: c.email });
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-medium text-[var(--c-ink)]">{c.name || c.email}</span>
                      {c.name && <span className="text-xs text-[var(--c-muted-fg)]">{c.email}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="w-full rounded-xl" onClick={addRecipient} data-testid="recipient-add-button">
              <UserPlus className="mr-1.5 h-4 w-4" /> Add recipient
            </Button>
          </div>
          {features.recipient_auth && activeRecipient && (
            <div className="mt-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3" data-testid="recipient-auth-panel">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
                <ShieldCheck className="h-3.5 w-3.5" /> Recipient authentication
              </div>
              <p className="mt-1 text-xs text-[var(--c-muted-fg)]">Verify identity before signing (Business).</p>
              <div
                className="mt-2 flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px]"
              >
                {[["", "None"], ...(features.recipient_auth_sms ? [["sms", "SMS"]] : []), ["kba", "KBA"], ...(features.recipient_auth_identity ? [["identity", "Passport / driving licence"]] : [])].map(([v, l]) => {
                  const active = (recipients.find((r) => r.recipient_id === activeRecipient)?.auth_method || "") === v;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setRecipients((p) => p.map((r) => r.recipient_id === activeRecipient
                        ? { ...r, auth_method: v || null, auth_phone: v === "sms" ? r.auth_phone : null,
                            auth_kba_postcode: v === "kba" ? r.auth_kba_postcode : null }
                        : r))}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                      style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {recipients.find((r) => r.recipient_id === activeRecipient)?.auth_method === "sms" && (
                <Input className="mt-2 h-9 rounded-lg" placeholder="+44 7700 900123"
                  value={recipients.find((r) => r.recipient_id === activeRecipient)?.auth_phone || ""}
                  onChange={(e) => setRecipients((p) => p.map((r) => r.recipient_id === activeRecipient
                    ? { ...r, auth_phone: e.target.value } : r))}
                  data-testid="recipient-auth-phone" />
              )}
              {recipients.find((r) => r.recipient_id === activeRecipient)?.auth_method === "kba" && (
                <Input className="mt-2 h-9 rounded-lg" placeholder="Postcode on file (e.g. SW1A 1AA)"
                  value={recipients.find((r) => r.recipient_id === activeRecipient)?.auth_kba_postcode || ""}
                  onChange={(e) => setRecipients((p) => p.map((r) => r.recipient_id === activeRecipient
                    ? { ...r, auth_kba_postcode: e.target.value } : r))}
                  data-testid="recipient-auth-postcode" />
              )}
            </div>
          )}
        </PanelCard>
      )}

      {(mode === "all" || mode === "recipients") && (
        <PanelCard title="Signing order" icon={ListOrdered}>
          <div className="flex rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px]">
            {[["sequential", "Sequential"], ["parallel", "Parallel"]].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setSigningOrder(v)}
                data-testid={`order-${v}`}
                className="flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={signingOrder === v ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
              >
                {l}
              </button>
            ))}
          </div>
        </PanelCard>
      )}

      {(mode === "all" || mode === "fields") && (
        <PanelCard title="Fields" icon={LayoutGrid}>
          <p className="text-xs leading-relaxed text-[var(--c-muted-fg)]">
            Pick a field, then click the document for{" "}
            <b style={{ color: colorFor(activeRecipient) }}>
              {recipients.find((r) => r.recipient_id === activeRecipient)?.name || "selected recipient"}
            </b>.
          </p>
          <div className="mt-3 max-h-[min(55vh,28rem)] overflow-y-auto overflow-x-hidden cs-scroll" data-testid="prepare-fields-palette">
            <div className="grid grid-cols-2 gap-2">
              {FIELD_ORDER.map((t) => {
                const m = FIELD_TYPES[t];
                const Icon = m.icon;
                const active = tool === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTool(active ? null : t); onPick && onPick(); }}
                    data-testid={`field-chip-${t}`}
                    className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2.5 text-center text-[10px] font-semibold leading-tight transition-all sm:text-[11px]"
                    style={active
                      ? { borderColor: "var(--c-primary)", background: "var(--status-sent-bg)", color: "var(--c-ink)", boxShadow: "0 0 0 1px var(--c-primary)" }
                      : { borderColor: "var(--c-border)", background: "var(--c-portal-card)", color: "var(--c-ink)" }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--c-primary)" }} />
                    <span className="w-full min-w-0 truncate px-0.5">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {selected && (() => {
            const sf = fields.find((f) => f.field_id === selected);
            if (!sf || !["dropdown", "radio"].includes(sf.type)) return null;
            return (
              <div className="mt-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-3" data-testid="field-options-editor">
                <Label className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Options (one per line)</Label>
                <Textarea
                  className="mt-1.5 rounded-lg font-mono text-xs"
                  rows={4}
                  value={(sf.options || []).join("\n")}
                  onChange={(e) => {
                    const opts = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                    updateField(sf.field_id, { options: opts.length ? opts : null });
                  }}
                  placeholder={"Option A\nOption B\nOption C"}
                />
              </div>
            );
          })()}
        </PanelCard>
      )}
    </div>
  );

  const activeRec = recipients.find((r) => r.recipient_id === activeRecipient);
  const isWordDoc = env?.document?.file_type === "docx";

  return (
    <div className="cs-portal-main-panel flex h-screen flex-col">
      {/* Header — Dashboard / New Envelope style */}
      <header className="shrink-0 border-b border-[var(--c-border)] bg-[var(--c-portal-card)]">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="prepare-back-button" className="shrink-0 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl sm:hidden" onClick={saveAndExit} disabled={saving} data-testid="prepare-mobile-save-button" aria-label="Save and exit">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl sm:hidden" onClick={openTemplateDialog} disabled={saving} data-testid="prepare-mobile-template-button" aria-label="Save as template">
            <LayoutTemplate className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p
              className="hidden text-[22px] font-semibold leading-none sm:block"
              style={{ fontFamily: "'Caveat', cursive", color: "var(--c-primary-hover)" }}
            >
              Step 2 of 3
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--badge-teal-bg)]">
                <FileText className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
              </span>
              <h1 className="min-w-0 truncate font-heading text-base font-bold tracking-tight text-[var(--c-ink)] sm:text-lg">
                {env?.title}
              </h1>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-0.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-0.5 sm:flex">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} data-testid="prepare-zoom-out-button"><ZoomOut className="h-4 w-4" /></Button>
              <span className="w-10 text-center text-xs font-semibold text-[var(--c-muted-fg)]">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} data-testid="prepare-zoom-in-button"><ZoomIn className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" className="hidden rounded-xl sm:inline-flex" onClick={openTemplateDialog} disabled={saving} data-testid="prepare-save-template-button">
              <LayoutTemplate className="mr-1.5 h-4 w-4" /> Save as template
            </Button>
            <Button variant="outline" onClick={saveAndExit} disabled={saving} data-testid="prepare-save-button" className="hidden rounded-xl sm:inline-flex">
              Save & exit
            </Button>
            <button
              type="button"
              onClick={continueToSend}
              disabled={saving}
              data-testid="prepare-send-button"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
              style={{ background: "var(--c-ink-solid)", boxShadow: saving ? "none" : "0 8px 20px rgba(18,33,32,.18)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Continue to send</span>
              <span className="sm:hidden">Send</span>
            </button>
          </div>
        </div>

        <div className="hidden flex-wrap items-center justify-between gap-3 border-t border-[var(--c-border)] px-5 py-2.5 sm:flex">
          <div
            className="flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] p-[3px]"
            data-testid="prepare-steps"
          >
            {PREPARE_STEPS.map((step) => {
              const Icon = step.icon;
              const active = step.active;
              const done = step.done;
              return (
                <span
                  key={step.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
                  style={
                    active
                      ? { background: "var(--c-ink-solid)", color: "#fff" }
                      : done
                        ? { color: "var(--c-primary)" }
                        : { color: "var(--c-muted-fg)" }
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {step.label}
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--c-muted-fg)]">
            <span className="rounded-full bg-[var(--c-paper-2)] px-2.5 py-1">{recipients.length} recipient{recipients.length === 1 ? "" : "s"}</span>
            <span className="rounded-full bg-[var(--c-paper-2)] px-2.5 py-1">{fields.length} field{fields.length === 1 ? "" : "s"}</span>
            <span className="rounded-full bg-[var(--c-paper-2)] px-2.5 py-1 capitalize">{signingOrder}</span>
            {isWordDoc && <span className="rounded-full bg-[var(--status-sent-bg)] px-2.5 py-1 text-[var(--c-primary)]">Word · sign-only</span>}
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside className="relative z-10 hidden w-[26rem] max-w-[min(26rem,38vw)] min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--c-border)] bg-[var(--c-paper)] xl:flex">
          <ScrollArea className="prepare-sidebar-scroll h-0 min-h-0 w-full max-w-full flex-1 cs-scroll">
            {renderPanels({ mode: "all" })}
          </ScrollArea>
        </aside>

        <div ref={canvasAreaRef} className="relative z-0 min-h-0 min-w-0 flex-1 overflow-auto cs-scroll cs-grid-paper" data-testid="prepare-canvas">
          {pages.length > 3 && (
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-portal-card)]/95 px-4 py-2.5 backdrop-blur-sm" data-testid="prepare-page-nav">
              <span className="rounded-full bg-[var(--c-paper-2)] px-2.5 py-1 text-xs font-semibold text-[var(--c-muted-fg)]">{pages.length} pages</span>
              {signingPageIndexes.map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => jumpToPage(idx)}
                  data-testid={`prepare-jump-page-${idx + 1}`}
                  className="rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
                >
                  Jump to signing (p.{idx + 1})
                </button>
              ))}
            </div>
          )}
          {tool && (
            <div className="sticky top-0 z-20 flex items-center justify-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-ink-solid)] px-4 py-2.5 text-sm text-white shadow-md">
              <Plus className="h-4 w-4" />
              Placing <b>{FIELD_TYPES[tool].label}</b> — click on the document
              <button type="button" className="ml-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold hover:bg-white/25" onClick={() => setTool(null)}>Done</button>
            </div>
          )}
          <div className="mx-auto flex w-full max-w-full flex-col items-center px-3 py-6 sm:px-4" onClick={() => setSelected(null)}>
            {blobUrl && (
              <Document file={blobUrl} options={PDF_OPTIONS} loading={<Loader2 className="mt-10 h-8 w-8 animate-spin text-[var(--c-primary)]" />} error={<div className="mt-10 text-sm text-red-600">Failed to load document.</div>}>
                {pages.map((_, i) => (
                  <PdfPageLayer
                    key={`page-${i + 1}`}
                    ref={(node) => { pageRefs.current[i] = node; }}
                    pageNumber={i + 1}
                    width={renderWidth}
                    overlayCursor={tool ? "crosshair" : "default"}
                    onOverlayClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      placeField(i, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
                    }}
                    loading={<div className="flex min-h-[480px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" /></div>}
                  >
                    {fields.filter((f) => f.page === i).map((f) => (
                      <PrepareField key={f.field_id} f={f} color={colorFor(f.recipient_id)}
                        selected={selected === f.field_id} onSelect={setSelected} onChange={updateField} onDelete={deleteField} />
                    ))}
                  </PdfPageLayer>
                ))}
              </Document>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom toolbar, Zoho-style: open Recipients / Fields panels in a bottom sheet. */}
      <Sheet open={!!mobileSheet} onOpenChange={(o) => { if (!o) setMobileSheet(null); }}>
        <div className="flex shrink-0 items-center gap-2 border-t border-[var(--c-border)] bg-[var(--c-portal-card)] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] xl:hidden">
          <button
            type="button"
            onClick={() => setMobileSheet("recipients")}
            data-testid="mobile-open-recipients"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-2.5 text-sm font-semibold text-[var(--c-ink)]"
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
            type="button"
            onClick={() => setMobileSheet("fields")}
            data-testid="mobile-open-fields"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ background: "var(--c-ink-solid)" }}
          >
            <LayoutGrid className="h-4 w-4" />
            {tool ? <>Placing <b className="font-bold">{FIELD_TYPES[tool].label}</b></> : <>Fields ({fields.length})</>}
          </button>
        </div>

        <SheetContent
          side="bottom"
          className="z-[60] w-full max-w-[100vw] max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-2xl border-t border-[var(--c-border)] bg-[var(--card)] p-0 cs-scroll xl:hidden [&>button]:top-3.5 [&>button]:right-3.5"
          data-testid="mobile-prepare-sheet"
        >
          <SheetHeader className="sticky top-0 z-10 border-b border-[var(--c-border)] bg-[var(--card)] px-4 pt-4 text-left">
            <SheetTitle className="font-heading text-base">
              {mobileSheet === "recipients" ? "Recipients & order" : "Place fields"}
            </SheetTitle>
            <p className="pb-2 text-xs text-[var(--c-muted-fg)]">
              {mobileSheet === "recipients"
                ? "Add who needs to sign, set the signing order, then pick fields."
                : "Tap a field then tap anywhere on the document to drop it."}
            </p>
          </SheetHeader>
          {renderPanels({
            onPick: () => setMobileSheet(null),
            mode: mobileSheet === "recipients" ? "recipients" : mobileSheet === "fields" ? "fields" : "all",
          })}
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
              <Input
                id="tpl-name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    saveAsTemplate(e);
                  }
                }}
                className="mt-1"
                data-testid="template-name-input"
              />
            </div>
            <div>
              <Label htmlFor="tpl-desc">Description (optional)</Label>
              <Textarea id="tpl-desc" rows={3} value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} className="mt-1" data-testid="template-desc-input" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveAsTemplate} disabled={savingTpl || saving} data-testid="template-save-submit" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {savingTpl ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LayoutTemplate className="mr-1.5 h-4 w-4" />} Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
