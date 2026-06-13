import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api, { API_ORIGIN, formatApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload, FileText, Type, Image as ImageIcon, Eraser, RotateCw, Trash2, Plus,
  Download, Save, Scissors, GitMerge, Loader2, ArrowLeft, MousePointer2, PenTool,
} from "lucide-react";

const TOOLS = {
  NONE: "none",
  TEXT: "text",
  IMAGE: "image",
  WHITEOUT: "whiteout",
};

// ----- Helpers --------------------------------------------------------------
const pageUrl = (ws, idx) =>
  `${API_ORIGIN}/api/pdf/workspace/${ws.workspace_id}/page/${idx}.png?v=${ws.updated_at || ""}`;

// ----- Sortable Page Card ---------------------------------------------------
function SortablePageCard({
  pageIdx, ws, selected, onSelect, onRotate, onDelete, busy,
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: pageIdx });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef} style={style}
      data-testid={`pdf-page-card-${pageIdx}`}
      className={`group relative rounded-xl border bg-[var(--card)] p-2 shadow-sm transition-all ${
        selected ? "border-[var(--c-primary)] ring-2 ring-[var(--c-primary)]/30" : "border-[var(--c-border)]"
      }`}
    >
      <button
        type="button" onClick={() => onSelect(pageIdx)}
        className="block w-full"
        data-testid={`pdf-page-select-${pageIdx}`}
      >
        <img
          src={pageUrl(ws, pageIdx)}
          alt={`Page ${pageIdx + 1}`}
          loading="lazy"
          className="aspect-[3/4] w-full rounded-md border border-[var(--c-border)] object-cover bg-white"
        />
      </button>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
        <span {...attributes} {...listeners} className="cursor-grab select-none rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--c-paper-2)]" data-testid={`pdf-page-drag-${pageIdx}`}>
          ⋮⋮ Page {pageIdx + 1}
        </span>
        <div className="flex gap-1">
          <button
            type="button" onClick={() => onRotate(pageIdx)} disabled={busy}
            data-testid={`pdf-page-rotate-${pageIdx}`}
            aria-label={`Rotate page ${pageIdx + 1}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--c-border)] hover:bg-[var(--c-paper-2)] disabled:opacity-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button" onClick={() => onDelete(pageIdx)} disabled={busy}
            data-testid={`pdf-page-delete-${pageIdx}`}
            aria-label={`Delete page ${pageIdx + 1}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--c-border)] text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Page Editor (large preview + tool overlay) ---------------------------
function PageEditor({ ws, pageIdx, tool, onApplied, onChangeTool }) {
  const imgRef = useRef(null);
  const [drag, setDrag] = useState(null); // {x0,y0,x1,y1} in % coords
  const [pendingText, setPendingText] = useState(null); // {x,y} for prompt
  const [textValue, setTextValue] = useState("");
  const [textSize, setTextSize] = useState(14);
  const [textColor, setTextColor] = useState("#0F1720");
  const [busy, setBusy] = useState(false);

  // Image-add state
  const [imgFile, setImgFile] = useState(null);
  const [imgUrl, setImgUrl] = useState("");
  const imgFileRef = useRef(null);

  useEffect(() => () => { if (imgUrl) URL.revokeObjectURL(imgUrl); }, [imgUrl]);
  useEffect(() => {
    // Reset transient state whenever the user switches tools or pages.
    setDrag(null); setPendingText(null); setTextValue("");
  }, [tool, pageIdx]);

  const getRelative = (e) => {
    const r = imgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  const onMouseDown = (e) => {
    if (tool === TOOLS.NONE) return;
    const { x, y } = getRelative(e);
    if (tool === TOOLS.TEXT) { setPendingText({ x, y }); return; }
    if (tool === TOOLS.IMAGE) {
      if (!imgFile) { toast.error("Pick an image first using the panel on the left."); return; }
      setDrag({ x0: x, y0: y, x1: x, y1: y, dragging: true }); return;
    }
    if (tool === TOOLS.WHITEOUT) {
      setDrag({ x0: x, y0: y, x1: x, y1: y, dragging: true }); return;
    }
  };

  const onMouseMove = (e) => {
    if (!drag || !drag.dragging) return;
    const { x, y } = getRelative(e);
    setDrag((d) => ({ ...d, x1: x, y1: y }));
  };

  const onMouseUp = async () => {
    if (!drag || !drag.dragging) return;
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    setDrag(null);
    if (w < 0.01 || h < 0.01) return; // ignore tiny accidental clicks
    setBusy(true);
    try {
      if (tool === TOOLS.WHITEOUT) {
        await api.post(`/pdf/workspace/${ws.workspace_id}/whiteout`,
          { page: pageIdx, x, y, w, h });
        toast.success("Area whited-out");
      } else if (tool === TOOLS.IMAGE) {
        const fd = new FormData();
        fd.append("file", imgFile);
        fd.append("page", String(pageIdx));
        fd.append("x", String(x)); fd.append("y", String(y));
        fd.append("w", String(w)); fd.append("h", String(h));
        await api.post(`/pdf/workspace/${ws.workspace_id}/image`, fd,
          { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Image added");
        setImgFile(null); setImgUrl((u) => { if (u) URL.revokeObjectURL(u); return ""; });
      }
      onApplied();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const applyText = async () => {
    if (!textValue.trim()) { toast.error("Type some text first"); return; }
    setBusy(true);
    try {
      await api.post(`/pdf/workspace/${ws.workspace_id}/text`, {
        page: pageIdx, x: pendingText.x, y: pendingText.y,
        text: textValue, font_size: textSize, color: textColor,
      });
      toast.success("Text added");
      setPendingText(null); setTextValue("");
      onApplied();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(f.type)) { toast.error("JPG, PNG, WebP or GIF only"); return; }
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgFile(f); setImgUrl(URL.createObjectURL(f));
  };

  // Overlay rectangle live preview while dragging
  const overlay = drag ? {
    left: `${Math.min(drag.x0, drag.x1) * 100}%`,
    top: `${Math.min(drag.y0, drag.y1) * 100}%`,
    width: `${Math.abs(drag.x1 - drag.x0) * 100}%`,
    height: `${Math.abs(drag.y1 - drag.y0) * 100}%`,
  } : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
      {/* Left tool panel */}
      <aside className="space-y-3 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Tools</p>
        <div className="grid grid-cols-2 gap-2">
          <ToolBtn icon={MousePointer2} label="Select" active={tool === TOOLS.NONE}
            onClick={() => onChangeTool(TOOLS.NONE)} testid="pdf-tool-select" />
          <ToolBtn icon={Type} label="Text" active={tool === TOOLS.TEXT}
            onClick={() => onChangeTool(TOOLS.TEXT)} testid="pdf-tool-text" />
          <ToolBtn icon={ImageIcon} label="Image" active={tool === TOOLS.IMAGE}
            onClick={() => onChangeTool(TOOLS.IMAGE)} testid="pdf-tool-image" />
          <ToolBtn icon={Eraser} label="White-out" active={tool === TOOLS.WHITEOUT}
            onClick={() => onChangeTool(TOOLS.WHITEOUT)} testid="pdf-tool-whiteout" />
        </div>

        {tool === TOOLS.TEXT && (
          <div className="mt-4 space-y-3 rounded-lg border border-dashed border-[var(--c-border)] p-3 text-xs">
            <p className="text-[var(--muted-foreground)]">
              Click anywhere on the page to drop new text.
            </p>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase">Size</Label>
              <Input type="number" min={6} max={120} value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value || 14))}
                data-testid="pdf-text-size" className="h-8 w-20" />
              <Label className="text-[10px] uppercase">Colour</Label>
              <input
                type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                data-testid="pdf-text-color"
                className="h-8 w-8 cursor-pointer rounded border border-[var(--c-border)] bg-transparent"
              />
            </div>
          </div>
        )}

        {tool === TOOLS.IMAGE && (
          <div className="mt-4 space-y-2 rounded-lg border border-dashed border-[var(--c-border)] p-3 text-xs">
            <p className="text-[var(--muted-foreground)]">
              Pick an image then drag on the page to choose where it goes.
            </p>
            <Button size="sm" variant="outline" onClick={() => imgFileRef.current?.click()}
              data-testid="pdf-image-pick" className="w-full">
              <Plus className="mr-1.5 h-4 w-4" /> Choose image
            </Button>
            <input ref={imgFileRef} type="file" accept="image/*" className="hidden"
              onChange={onPickImage} data-testid="pdf-image-input" />
            {imgUrl && (
              <div className="rounded-md border border-[var(--c-border)] p-2">
                <img src={imgUrl} alt="To insert" className="mx-auto max-h-24" />
                <p className="mt-1 truncate text-center text-[10px] text-[var(--muted-foreground)]">{imgFile?.name}</p>
              </div>
            )}
          </div>
        )}

        {tool === TOOLS.WHITEOUT && (
          <p className="rounded-lg border border-dashed border-[var(--c-border)] p-3 text-xs text-[var(--muted-foreground)]">
            Drag a rectangle on the page to cover (erase) what's underneath.
          </p>
        )}
      </aside>

      {/* Page preview */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-4">
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          Editing page {pageIdx + 1} of {ws.page_count}
        </p>
        <div
          className="relative mx-auto select-none"
          style={{ maxWidth: 720 }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          data-testid="pdf-editor-canvas"
        >
          <img
            ref={imgRef}
            src={pageUrl(ws, pageIdx)}
            alt={`Page ${pageIdx + 1}`}
            draggable={false}
            className="w-full select-none rounded-md border border-[var(--c-border)] bg-white shadow-sm"
            style={{ cursor: tool === TOOLS.NONE ? "default" : "crosshair" }}
          />
          {overlay && (
            <div
              className="pointer-events-none absolute border-2"
              style={{
                ...overlay,
                background: tool === TOOLS.WHITEOUT ? "rgba(255,255,255,0.6)" : "rgba(31,184,166,0.18)",
                borderColor: tool === TOOLS.WHITEOUT ? "#94A3B8" : "#1FB8A6",
              }}
            />
          )}
          {pendingText && tool === TOOLS.TEXT && (
            <div
              className="pointer-events-none absolute -translate-y-1/2"
              style={{ left: `${pendingText.x * 100}%`, top: `${pendingText.y * 100}%` }}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--c-primary)] ring-2 ring-white" />
            </div>
          )}
          {busy && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/30">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Text confirm dialog (after the user clicks a position) */}
      <Dialog open={!!pendingText && tool === TOOLS.TEXT} onOpenChange={(o) => !o && setPendingText(null)}>
        <DialogContent data-testid="pdf-text-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Type className="h-4 w-4" /> Add text</DialogTitle>
            <DialogDescription>Type the text to place at the marker.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="pdf-text">Text</Label>
            <Input id="pdf-text" value={textValue} autoFocus
              data-testid="pdf-text-input"
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); applyText(); } }}
              placeholder="e.g. CONFIDENTIAL" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingText(null)} data-testid="pdf-text-cancel">Cancel</Button>
            <Button onClick={applyText} disabled={busy || !textValue.trim()} data-testid="pdf-text-apply"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Add text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolBtn({ icon: Icon, label, active, onClick, testid }) {
  return (
    <button
      type="button" onClick={onClick} data-testid={testid}
      className={`inline-flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--c-primary)] bg-[var(--c-primary)]/10 text-[var(--c-ink)]"
          : "border-[var(--c-border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--c-paper-2)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ----- Main page -----------------------------------------------------------
export default function ManagePdf() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const mergeRef = useRef(null);
  const [workspace, setWorkspace] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [tool, setTool] = useState(TOOLS.NONE);
  const [view, setView] = useState("pages"); // "pages" | "editor"
  const [splitRanges, setSplitRanges] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { document.title = "Manage PDF · CIVICSIGN"; }, []);

  const refreshWorkspace = async (id) => {
    const wid = id || workspace?.workspace_id;
    if (!wid) return;
    const { data } = await api.get(`/pdf/workspace/${wid}`);
    setWorkspace(data);
  };

  const onPickFile = () => fileRef.current?.click();

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/pdf/workspace", fd,
        { headers: { "Content-Type": "multipart/form-data" } });
      setWorkspace(data); setPageIdx(0); setView("pages");
      toast.success(`Loaded ${data.filename} (${data.page_count} page${data.page_count === 1 ? "" : "s"})`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const onRotate = async (idx) => {
    setBusy(true);
    try {
      await api.post(`/pdf/workspace/${workspace.workspace_id}/page-op`,
        { op: "rotate", page: idx, degrees: 90 });
      toast.success("Page rotated");
      await refreshWorkspace();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onDeletePage = async (idx) => {
    if (!window.confirm(`Delete page ${idx + 1}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.post(`/pdf/workspace/${workspace.workspace_id}/page-op`,
        { op: "delete", page: idx });
      toast.success("Page deleted");
      setPageIdx(0);
      await refreshWorkspace();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onInsertBlank = async () => {
    setBusy(true);
    try {
      await api.post(`/pdf/workspace/${workspace.workspace_id}/page-op`,
        { op: "insert-blank", at: workspace.page_count });
      toast.success("Blank page added");
      await refreshWorkspace();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onDragEnd = async (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = pages.indexOf(active.id);
    const to = pages.indexOf(over.id);
    const newOrder = arrayMove(pages, from, to);
    setBusy(true);
    try {
      await api.post(`/pdf/workspace/${workspace.workspace_id}/page-op`,
        { op: "reorder", order: newOrder });
      toast.success("Pages reordered");
      await refreshWorkspace();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onMerge = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      await api.post(`/pdf/workspace/${workspace.workspace_id}/merge`, fd,
        { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Merged in ${f.name}`);
      await refreshWorkspace();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onSplit = async () => {
    if (!splitRanges.trim()) { toast.error("Enter ranges, e.g. 1-3, 5"); return; }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${workspace.workspace_id}/split`,
        { ranges: splitRanges },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `${(workspace.filename || "split").replace(/\.[^.]+$/, "")}-split.zip`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.success("Split downloaded as ZIP");
    } catch (err) {
      let detail = err.response?.data?.detail;
      if (err.response?.data instanceof Blob) {
        try { detail = JSON.parse(await err.response.data.text()).detail; } catch { /* ignore */ }
      }
      toast.error(formatApiError(detail));
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    setBusy(true);
    try {
      const res = await api.get(`/pdf/workspace/${workspace.workspace_id}/download`,
        { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `${(workspace.filename || "document").replace(/\.[^.]+$/, "")}-edited.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const onSaveToDocuments = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/pdf/workspace/${workspace.workspace_id}/save-to-documents`);
      toast.success(`Saved to Documents as "${data.title}"`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = async () => {
    if (!window.confirm("Discard this document and start over?")) return;
    try {
      await api.delete(`/pdf/workspace/${workspace.workspace_id}`);
    } catch { /* ignore */ }
    setWorkspace(null); setPageIdx(0); setView("pages");
  };

  const pages = useMemo(
    () => (workspace ? Array.from({ length: workspace.page_count }, (_, i) => i) : []),
    [workspace],
  );

  // ----- Empty / upload state ----------------------------------------------
  if (!workspace) {
    return (
      <AppShell title="Manage PDF">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--card)] p-10 text-center" data-testid="pdf-empty-uploader">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--c-primary)18" }}>
              <PenTool className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
            </div>
            <h2 className="mt-4 font-heading text-2xl font-bold text-[var(--c-ink)]">Edit any PDF or Word doc.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
              Drop in a file to add or remove text, swap images, white-out sensitive bits, rotate or reorder pages, merge, or split. Save the result back to your Documents to send for signing.
            </p>
            <Button
              size="lg" onClick={onPickFile} disabled={uploading} data-testid="pdf-upload-btn"
              className="mt-6" style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
              {uploading ? "Uploading…" : "Upload PDF or Word"}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf"
              onChange={onUpload} className="hidden" data-testid="pdf-upload-input" />
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">PDF or .docx · up to 20 MB</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <FeatureNote icon={Type} title="Add or edit text" text="Drop new text anywhere, or white-out old text and write over it." />
            <FeatureNote icon={ImageIcon} title="Swap images" text="Insert a new image or cover an existing one to replace it." />
            <FeatureNote icon={GitMerge} title="Merge & split" text="Combine multiple PDFs into one, or split by page ranges." />
            <FeatureNote icon={Save} title="Send for signing" text="Save the edited file straight to Documents and send it." />
          </div>
        </div>
      </AppShell>
    );
  }

  // ----- Workspace view ----------------------------------------------------
  return (
    <AppShell
      title="Manage PDF"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={onDownload} disabled={busy}
            data-testid="pdf-download-btn">
            <Download className="mr-1.5 h-4 w-4" /> Download
          </Button>
          <Button size="sm" onClick={onSaveToDocuments} disabled={saving}
            data-testid="pdf-save-to-documents-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save to Documents
          </Button>
        </>
      }
    >
      <div className="space-y-5" data-testid="pdf-workspace">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 text-[var(--c-primary)]" />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-[var(--c-ink)]" data-testid="pdf-current-filename">
                {workspace.filename}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {workspace.page_count} page{workspace.page_count === 1 ? "" : "s"} · workspace {workspace.workspace_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={busy}
              data-testid="pdf-discard-btn">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Start over
            </Button>
          </div>
        </div>

        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList className="bg-[var(--c-paper-2)] p-1">
            <TabsTrigger value="pages" data-testid="pdf-tab-pages" className="data-[state=active]:bg-[var(--card)]">
              <FileText className="mr-1.5 h-4 w-4" /> Pages
            </TabsTrigger>
            <TabsTrigger value="editor" data-testid="pdf-tab-editor" className="data-[state=active]:bg-[var(--card)]">
              <PenTool className="mr-1.5 h-4 w-4" /> Edit page
            </TabsTrigger>
            <TabsTrigger value="merge" data-testid="pdf-tab-merge" className="data-[state=active]:bg-[var(--card)]">
              <GitMerge className="mr-1.5 h-4 w-4" /> Merge
            </TabsTrigger>
            <TabsTrigger value="split" data-testid="pdf-tab-split" className="data-[state=active]:bg-[var(--card)]">
              <Scissors className="mr-1.5 h-4 w-4" /> Split
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-[var(--muted-foreground)]">
                Drag pages to reorder, rotate or delete with the icons below each thumbnail.
              </p>
              <Button variant="outline" size="sm" onClick={onInsertBlank} disabled={busy}
                data-testid="pdf-insert-blank-btn">
                <Plus className="mr-1.5 h-4 w-4" /> Insert blank page
              </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pages} strategy={rectSortingStrategy}>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="pdf-pages-grid">
                  {pages.map((p) => (
                    <SortablePageCard
                      key={p} pageIdx={p} ws={workspace} busy={busy}
                      selected={pageIdx === p}
                      onSelect={(i) => { setPageIdx(i); setView("editor"); setTool(TOOLS.NONE); }}
                      onRotate={onRotate} onDelete={onDeletePage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="editor" className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Label className="text-xs">Page</Label>
                <select
                  className="h-9 rounded-md border border-[var(--c-border)] bg-[var(--card)] px-2 text-sm"
                  value={pageIdx} onChange={(e) => setPageIdx(Number(e.target.value))}
                  data-testid="pdf-editor-page-select"
                >
                  {pages.map((p) => <option key={p} value={p}>{`Page ${p + 1}`}</option>)}
                </select>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Tip: white-out the old text, then use <b>Text</b> to write the new version over it.
              </p>
            </div>
            <PageEditor
              ws={workspace} pageIdx={pageIdx} tool={tool}
              onChangeTool={setTool}
              onApplied={() => refreshWorkspace()}
            />
          </TabsContent>

          <TabsContent value="merge" className="mt-5">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">
                <GitMerge className="mr-1 inline h-4 w-4" /> Merge another file
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Append a PDF or Word document to the end of the current file.
              </p>
              <Button onClick={() => mergeRef.current?.click()} disabled={busy} className="mt-4"
                data-testid="pdf-merge-btn"
                style={{ background: "var(--c-primary)", color: "#fff" }}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                Choose file to merge
              </Button>
              <input ref={mergeRef} type="file" accept=".pdf,.docx,application/pdf"
                onChange={onMerge} className="hidden" data-testid="pdf-merge-input" />
            </div>
          </TabsContent>

          <TabsContent value="split" className="mt-5">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-lg font-semibold text-[var(--c-ink)]">
                <Scissors className="mr-1 inline h-4 w-4" /> Split into multiple PDFs
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Enter page ranges separated by commas. Each range becomes its own PDF in the downloaded ZIP.
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[260px] flex-1">
                  <Label htmlFor="ranges">Ranges</Label>
                  <Input id="ranges" data-testid="pdf-split-input"
                    value={splitRanges} onChange={(e) => setSplitRanges(e.target.value)}
                    placeholder={`e.g. 1-3, 5, 7-${workspace.page_count}`} className="mt-1" />
                </div>
                <Button onClick={onSplit} disabled={busy} data-testid="pdf-split-btn"
                  style={{ background: "var(--c-primary)", color: "#fff" }}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Scissors className="mr-1.5 h-4 w-4" />}
                  Split & download
                </Button>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Document has {workspace.page_count} page{workspace.page_count === 1 ? "" : "s"} (1..{workspace.page_count}).
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function FeatureNote({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4 text-left">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--c-paper-2)]">
        <Icon className="h-4 w-4 text-[var(--c-primary)]" />
      </span>
      <h3 className="mt-2 text-sm font-semibold text-[var(--c-ink)]">{title}</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted-foreground)]">{text}</p>
    </div>
  );
}
