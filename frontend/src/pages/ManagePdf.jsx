import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api, { downloadFile, fetchPdfBlobUrl, formatApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { AppShell } from "@/components/AppShell";
import { PdfTextEditor } from "@/components/PdfTextEditor";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Loader2,
  FileStack,
  Download,
  Save,
  RotateCw,
  Trash2,
  FilePlus,
  GripVertical,
  MousePointer2,
  Type,
  Image as ImageIcon,
  Eraser,
  Scissors,
  PenTool,
  ArrowLeft,
  ArrowRight,
  Pencil,
} from "lucide-react";

const TOOLS = [
  { id: "select", label: "Select", icon: MousePointer2, testid: "pdf-tool-select" },
  { id: "text", label: "Edit text", icon: Type, testid: "pdf-tool-text" },
  { id: "image", label: "Image", icon: ImageIcon, testid: "pdf-tool-image" },
  { id: "whiteout", label: "Whiteout", icon: Eraser, testid: "pdf-tool-whiteout" },
];

function SortablePageCard({
  index,
  thumbUrl,
  busy,
  onRotate,
  onDelete,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(index),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-2 shadow-sm"
      data-testid={`pdf-page-card-${index}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--c-paper-2)]">
        {thumbUrl ? (
          <img src={thumbUrl} alt={`Page ${index + 1}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--c-muted-fg)]" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-xs font-medium text-white">
          {index + 1}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-muted-fg)] hover:bg-[var(--c-paper-2)]"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1"
          disabled={busy}
          onClick={() => onRotate(index)}
          data-testid={`pdf-page-rotate-${index}`}
        >
          <RotateCw className="mr-1 h-3.5 w-3.5" />
          Rotate
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-red-600 hover:text-red-700"
          disabled={busy}
          onClick={() => onDelete(index)}
          data-testid={`pdf-page-delete-${index}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ManagePdf() {
  const navigate = useNavigate();
  const [homeView, setHomeView] = useState("home");
  const [workspace, setWorkspace] = useState(null);
  const [tab, setTab] = useState("pages");
  const [busy, setBusy] = useState(false);
  const [standaloneMergeFiles, setStandaloneMergeFiles] = useState([]);
  const [mergeTitle, setMergeTitle] = useState("Merged document");
  const [quotaModal, setQuotaModal] = useState(false);
  const [quotaDetail, setQuotaDetail] = useState(null);
  const [thumbVersion, setThumbVersion] = useState(0);
  const [thumbUrls, setThumbUrls] = useState([]);
  const [editorPage, setEditorPage] = useState(0);
  const [editorUrl, setEditorUrl] = useState("");
  const [tool, setTool] = useState("select");
  const [pendingImage, setPendingImage] = useState(null);
  const [whiteoutDrag, setWhiteoutDrag] = useState(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [splitRanges, setSplitRanges] = useState("");
  const [mergeFiles, setMergeFiles] = useState([]);
  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const blobUrlsRef = useRef([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bumpThumbs = useCallback(() => setThumbVersion((v) => v + 1), []);

  const trackBlob = (url) => {
    blobUrlsRef.current.push(url);
    return url;
  };

  const revokeBlobs = useCallback(() => {
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
  }, []);

  useEffect(() => () => revokeBlobs(), [revokeBlobs]);

  const applyWorkspace = (data) => {
    setWorkspace(data);
    if (!saveTitle) {
      const base = (data.original_filename || data.filename || "document").replace(/\.pdf$/i, "");
      setSaveTitle(`${base} (Edited)`);
    }
  };

  const refreshThumbs = useCallback(async (ws, version) => {
    if (!ws?.workspace_id) return;
    revokeBlobs();
    const urls = await Promise.all(
      Array.from({ length: ws.page_count || 0 }, (_, i) =>
        fetchPdfBlobUrl(`/pdf/workspace/${ws.workspace_id}/page/${i}.png?v=${version}`)
          .then(trackBlob)
          .catch(() => ""),
      ),
    );
    setThumbUrls(urls);
  }, [revokeBlobs]);

  useEffect(() => {
    if (!workspace) return;
    refreshThumbs(workspace, thumbVersion);
  }, [workspace, thumbVersion, refreshThumbs]);

  useEffect(() => {
    if (!workspace?.workspace_id) {
      setEditorUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      return undefined;
    }
    let cancelled = false;
    fetchPdfBlobUrl(`/pdf/workspace/${workspace.workspace_id}/page/${editorPage}.png?v=${thumbVersion}`)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setEditorUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setEditorUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return "";
          });
        }
      });
    return () => {
      cancelled = true;
      setEditorUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    };
  }, [workspace, editorPage, thumbVersion]);

  const runOp = async (fn, successMsg) => {
    setBusy(true);
    try {
      const data = await fn();
      if (data) {
        setWorkspace((prev) => (prev ? { ...prev, ...data } : prev));
      }
      bumpThumbs();
      if (successMsg) toast.success(successMsg);
      return data;
    } catch (err) {
      toast.error(formatApiError(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const refreshAfterTextEdit = useCallback(() => {
    bumpThumbs();
  }, [bumpThumbs]);

  const createWorkspace = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/pdf/workspace", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const data = await createWorkspace(file);
      applyWorkspace(data);
      setEditorPage(0);
      setTab("pages");
      setHomeView("home");
      bumpThumbs();
      toast.success("PDF loaded, start editing");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onPickStandaloneMerge = (e) => {
    const picked = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
        || f.name.toLowerCase().endsWith(".docx"),
    );
    e.target.value = "";
    if (!picked.length) {
      toast.error("Select PDF or Word (.docx) files");
      return;
    }
    setStandaloneMergeFiles((prev) => [...prev, ...picked].slice(0, 10));
  };

  const removeStandaloneMergeFile = (index) => {
    setStandaloneMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const mergeIntoEditor = async () => {
    if (standaloneMergeFiles.length < 2) {
      toast.error("Add at least 2 files to merge");
      return;
    }
    setBusy(true);
    try {
      let ws = await createWorkspace(standaloneMergeFiles[0]);
      if (standaloneMergeFiles.length > 1) {
        const fd = new FormData();
        standaloneMergeFiles.slice(1).forEach((f) => fd.append("files", f));
        const { data: updated } = await api.post(`/pdf/workspace/${ws.workspace_id}/merge`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        ws = { ...ws, ...updated };
      }
      applyWorkspace(ws);
      setSaveTitle(mergeTitle.trim() ? `${mergeTitle.trim()} (Edited)` : "Merged document (Edited)");
      setEditorPage(0);
      setTab("pages");
      setStandaloneMergeFiles([]);
      setHomeView("home");
      bumpThumbs();
      toast.success(`Merged ${ws.page_count} pages, edit or save when ready`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const mergeAndPrepare = async () => {
    if (standaloneMergeFiles.length < 2) {
      toast.error("Add at least 2 PDF files to merge");
      return;
    }
    const fd = new FormData();
    standaloneMergeFiles.forEach((f) => fd.append("files", f));
    fd.append("title", mergeTitle);
    setBusy(true);
    try {
      const { data } = await api.post("/envelopes/from-merge", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("PDFs merged, opening Prepare Studio");
      navigate(`/prepare/${data.envelope_id}`);
    } catch (err) {
      if (!handleQuotaApiError(err, {
        setDetail: setQuotaDetail,
        setOpen: setQuotaModal,
      })) {
        toast.error(formatApiError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const pageOp = (body, msg) =>
    runOp(
      () => api.post(`/pdf/workspace/${workspace.workspace_id}/page-op`, body).then((r) => r.data),
      msg,
    );

  const onRotate = (index) => pageOp({ op: "rotate", page_index: index, degrees: 90 }, "Page rotated");

  const onDelete = async (index) => {
    if (!window.confirm(`Delete page ${index + 1}?`)) return;
    await pageOp({ op: "delete", page_index: index }, "Page deleted");
    setEditorPage((p) => Math.max(0, Math.min(p, (workspace?.page_count || 1) - 2)));
  };

  const onInsertBlank = () =>
    pageOp({ op: "insert-blank", after_index: (workspace?.page_count || 1) - 1 }, "Blank page added");

  const onDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id || !workspace) return;
    const oldOrder = Array.from({ length: workspace.page_count }, (_, i) => i);
    const from = Number(active.id);
    const to = Number(over.id);
    const newOrder = arrayMove(oldOrder, from, to);
    await pageOp({ op: "reorder", order: newOrder }, "Pages reordered");
  };

  const relPoint = (e) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 0.98),
      y: Math.min(Math.max(0, (e.clientY - rect.top) / rect.height), 0.98),
    };
  };

  const placeImage = async (e) => {
    if (!pendingImage) {
      imageInputRef.current?.click();
      return;
    }
    const pt = relPoint(e);
    if (!pt) return;
    const fd = new FormData();
    fd.append("page_index", String(editorPage));
    fd.append("x", String(pt.x));
    fd.append("y", String(pt.y));
    fd.append("w", "0.22");
    fd.append("h", "0.16");
    fd.append("file", pendingImage);
    await runOp(
      () => api.post(`/pdf/workspace/${workspace.workspace_id}/image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
      "Image placed",
    );
    setPendingImage(null);
  };

  const finishWhiteout = async (start, end) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(0.02, Math.abs(end.x - start.x));
    const h = Math.max(0.02, Math.abs(end.y - start.y));
    await runOp(
      () => api.post(`/pdf/workspace/${workspace.workspace_id}/whiteout`, {
        page_index: editorPage,
        rect_pct: { x, y, w, h },
      }).then((r) => r.data),
      "Whiteout applied",
    );
  };

  const onCanvasMouseDown = (e) => {
    if (tool === "image") {
      placeImage(e);
      return;
    }
    if (tool === "whiteout") {
      const pt = relPoint(e);
      if (pt) setWhiteoutDrag({ start: pt, end: pt });
    }
  };

  const onCanvasMouseMove = (e) => {
    if (!whiteoutDrag) return;
    const pt = relPoint(e);
    if (pt) setWhiteoutDrag((d) => ({ ...d, end: pt }));
  };

  const onCanvasMouseUp = () => {
    if (!whiteoutDrag) return;
    finishWhiteout(whiteoutDrag.start, whiteoutDrag.end);
    setWhiteoutDrag(null);
  };

  const onDownload = () => {
    if (!workspace) return;
    downloadFile(`/pdf/workspace/${workspace.workspace_id}/download`, workspace.filename || "document.pdf");
  };

  const onSaveToDocuments = async () => {
    if (!workspace) return;
    const fd = new FormData();
    fd.append("title", saveTitle || "Edited document");
    setBusy(true);
    try {
      await api.post(
        `/pdf/workspace/${workspace.workspace_id}/save-to-documents`,
        fd,
      );
      toast.success("Saved to Documents, open from your Dashboard when ready to add fields");
    } catch (err) {
      if (!handleQuotaApiError(err, {
        setDetail: setQuotaDetail,
        setOpen: setQuotaModal,
      })) {
        toast.error(formatApiError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const onSplit = async () => {
    if (!workspace || !splitRanges.trim()) {
      toast.error("Enter page ranges (e.g. 1-2, 3)");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${workspace.workspace_id}/split`,
        { ranges: splitRanges.trim() },
        { responseType: "blob" },
      );
      const base = (workspace.filename || "document").replace(/\.pdf$/i, "");
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}-split.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Split ZIP downloaded");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onMergeAppend = async () => {
    if (!workspace || !mergeFiles.length) {
      toast.error("Select PDF or Word files to append");
      return;
    }
    const fd = new FormData();
    mergeFiles.forEach((f) => fd.append("files", f));
    await runOp(
      () => api.post(`/pdf/workspace/${workspace.workspace_id}/merge`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
      "Files appended",
    );
    setMergeFiles([]);
  };

  const headerActions = workspace ? (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onDownload}
        disabled={busy}
        data-testid="pdf-download-btn"
      >
        <Download className="mr-1.5 h-4 w-4" />
        Download
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={onSaveToDocuments}
        disabled={busy}
        data-testid="pdf-save-documents-btn"
        style={{ background: "var(--c-primary)", color: "#fff" }}
      >
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
        Save to Documents
      </Button>
    </>
  ) : null;

  const whiteoutPreview = whiteoutDrag ? (() => {
    const x = Math.min(whiteoutDrag.start.x, whiteoutDrag.end.x) * 100;
    const y = Math.min(whiteoutDrag.start.y, whiteoutDrag.end.y) * 100;
    const w = Math.abs(whiteoutDrag.end.x - whiteoutDrag.start.x) * 100;
    const h = Math.abs(whiteoutDrag.end.y - whiteoutDrag.start.y) * 100;
    return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
  })() : null;

  return (
    <AppShell title="Manage PDF" actions={headerActions}>
      <div data-testid="manage-pdf" className="mx-auto max-w-6xl">
        {!workspace ? (
          <div data-testid="pdf-empty-uploader">
            {homeView === "home" && (
              <>
                <p className="mb-6 text-center text-sm text-[var(--c-muted-fg)]">
                  Edit a single document or combine multiple PDFs, then add signature fields and send.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <button
                    type="button"
                    data-testid="pdf-mode-edit"
                    onClick={() => setHomeView("edit")}
                    className="group rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 text-left transition-all hover:border-[var(--c-primary)] hover:shadow-md"
                  >
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: "var(--c-primary)18" }}
                    >
                      <Pencil className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
                    </span>
                    <h2 className="mt-4 font-heading text-lg font-bold text-[var(--c-ink)]">Edit PDF</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                      Reorder, rotate, or delete pages. Add text, images, and whiteout. Split or download when done.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--c-primary)]">
                      Open editor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="pdf-mode-merge"
                    onClick={() => setHomeView("merge")}
                    className="group rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 text-left transition-all hover:border-[var(--c-primary)] hover:shadow-md"
                  >
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: "var(--c-primary)18" }}
                    >
                      <FileStack className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
                    </span>
                    <h2 className="mt-4 font-heading text-lg font-bold text-[var(--c-ink)]">Merge PDF</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted-fg)]">
                      Combine 2–10 PDF or Word files in order. Open in the editor or go straight to Prepare Studio for signing.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--c-primary)]">
                      Merge files <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </div>
              </>
            )}

            {homeView === "edit" && (
              <div className="mx-auto max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8">
                <button
                  type="button"
                  className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]"
                  onClick={() => setHomeView("home")}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-center">
                  <span
                    className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "var(--c-primary)18" }}
                  >
                    <Pencil className="h-7 w-7" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <h2 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">Edit PDF</h2>
                  <p className="mt-2 text-sm text-[var(--c-muted-fg)]">
                    Upload one PDF or Word file to open the page editor, overlay tools, and split/merge tabs.
                  </p>
                </div>
                <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
                  <Upload className="h-9 w-9 text-[var(--c-primary)]" />
                  <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose PDF or DOCX</span>
                  <span className="mt-1 text-xs text-[var(--c-muted-fg)]">Up to 20 MB</span>
                  <Button
                    type="button"
                    className="mt-4"
                    disabled={busy}
                    data-testid="pdf-upload-btn"
                    style={{ background: "var(--c-primary)", color: "#fff" }}
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      document.getElementById("pdf-upload-input")?.click();
                    }}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Upload document
                  </Button>
                  <input
                    id="pdf-upload-input"
                    type="file"
                    accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    data-testid="pdf-upload-input"
                    onChange={onUpload}
                  />
                </label>
              </div>
            )}

            {homeView === "merge" && (
              <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8">
                <button
                  type="button"
                  className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]"
                  onClick={() => setHomeView("home")}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: "var(--c-primary)18" }}
                  >
                    <FileStack className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Merge PDF</h2>
                    <p className="text-xs text-[var(--c-muted-fg)]">Up to 10 files · order = merge order</p>
                  </div>
                </div>

                <div className="mt-5">
                  <Label htmlFor="standalone-merge-title">Document title</Label>
                  <Input
                    id="standalone-merge-title"
                    className="mt-1"
                    value={mergeTitle}
                    onChange={(e) => setMergeTitle(e.target.value)}
                    data-testid="standalone-merge-title"
                  />
                </div>

                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-10 transition-colors hover:border-[var(--c-primary)]">
                  <Upload className="h-8 w-8 text-[var(--c-primary)]" />
                  <span className="mt-2 text-sm font-medium text-[var(--c-ink)]">Add PDF or DOCX files</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    className="hidden"
                    data-testid="standalone-merge-input"
                    onChange={onPickStandaloneMerge}
                  />
                </label>

                {standaloneMergeFiles.length > 0 && (
                  <ol className="mt-4 space-y-2" data-testid="standalone-merge-list">
                    {standaloneMergeFiles.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm"
                      >
                        <span className="truncate text-[var(--c-ink)]">{i + 1}. {f.name}</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-red-600 hover:text-red-700"
                          onClick={() => removeStandaloneMergeFile(i)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy || standaloneMergeFiles.length < 2}
                    onClick={mergeIntoEditor}
                    data-testid="standalone-merge-edit-btn"
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Pencil className="mr-1.5 h-4 w-4" />}
                    Merge &amp; edit
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={busy || standaloneMergeFiles.length < 2}
                    onClick={mergeAndPrepare}
                    data-testid="standalone-merge-prepare-btn"
                    style={{ background: "var(--c-primary)", color: "#fff" }}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PenTool className="mr-1.5 h-4 w-4" />}
                    Merge &amp; prepare for signing
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div data-testid="pdf-workspace" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-4 py-3">
              <div>
                <p className="font-medium text-[var(--c-ink)]">{workspace.filename}</p>
                <p className="text-xs text-[var(--c-muted-fg)]">
                  {workspace.page_count} page{workspace.page_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="save-title" className="sr-only">Save title</Label>
                <Input
                  id="save-title"
                  className="h-9 w-48"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>
            </div>

            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                if (v === "editor") setTool("text");
              }}
            >
              <TabsList className="bg-[var(--c-paper-2)]">
                <TabsTrigger value="pages" data-testid="pdf-tab-pages">Pages</TabsTrigger>
                <TabsTrigger value="editor" data-testid="pdf-tab-editor">Editor</TabsTrigger>
                <TabsTrigger value="merge" data-testid="pdf-tab-merge">Merge</TabsTrigger>
                <TabsTrigger value="split" data-testid="pdf-tab-split">Split</TabsTrigger>
              </TabsList>

              <TabsContent value="pages" className="mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-[var(--c-muted-fg)]">Drag cards to reorder · rotate or delete individual pages</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={onInsertBlank}
                    data-testid="pdf-insert-blank-btn"
                  >
                    <FilePlus className="mr-1.5 h-4 w-4" />
                    Insert blank page
                  </Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={Array.from({ length: workspace.page_count || 0 }, (_, i) => String(i))}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      data-testid="pdf-pages-grid"
                      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                      {Array.from({ length: workspace.page_count || 0 }, (_, i) => (
                        <SortablePageCard
                          key={`${thumbVersion}-${i}`}
                          index={i}
                          thumbUrl={thumbUrls[i]}
                          busy={busy}
                          onRotate={onRotate}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </TabsContent>

              <TabsContent value="editor" className="mt-4">
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex flex-wrap gap-2 lg:w-40 lg:flex-col">
                    {TOOLS.map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        size="sm"
                        variant={tool === t.id ? "default" : "outline"}
                        className="justify-start"
                        data-testid={t.testid}
                        onClick={() => {
                          setTool(t.id);
                          if (t.id === "image" && !pendingImage) imageInputRef.current?.click();
                        }}
                        style={tool === t.id ? { background: "var(--c-primary)", color: "#fff" } : undefined}
                      >
                        <t.icon className="mr-2 h-4 w-4" />
                        {t.label}
                      </Button>
                    ))}
                    {pendingImage && (
                      <p className="text-xs text-[var(--c-muted-fg)]">
                        Image ready, click the page to place
                      </p>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) {
                          setPendingImage(f);
                          setTool("image");
                        }
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Label className="text-sm">Page</Label>
                      <select
                        className="h-9 rounded-lg border border-[var(--c-border)] bg-[var(--card)] px-2 text-sm"
                        value={editorPage}
                        onChange={(e) => setEditorPage(Number(e.target.value))}
                      >
                        {Array.from({ length: workspace.page_count || 0 }, (_, i) => (
                          <option key={i} value={i}>Page {i + 1}</option>
                        ))}
                      </select>
                    </div>

                    {tool === "text" ? (
                      <PdfTextEditor
                        key={`${workspace.workspace_id}-${editorPage}`}
                        workspaceId={workspace.workspace_id}
                        pageIndex={editorPage}
                        pageImageUrl={editorUrl}
                        pageDim={workspace.pages?.[editorPage]}
                        disabled={busy}
                        onSaved={refreshAfterTextEdit}
                      />
                    ) : (
                      <>
                        <div
                          ref={canvasRef}
                          data-testid="pdf-editor-canvas"
                          className={`relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] ${
                            tool === "whiteout" || tool === "image" ? "cursor-crosshair" : ""
                          }`}
                          onMouseDown={onCanvasMouseDown}
                          onMouseMove={onCanvasMouseMove}
                          onMouseUp={onCanvasMouseUp}
                          onMouseLeave={() => whiteoutDrag && onCanvasMouseUp()}
                        >
                          {editorUrl ? (
                            <img
                              src={editorUrl}
                              alt={`Edit page ${editorPage + 1}`}
                              className="block w-full select-none"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-[var(--c-muted-fg)]" />
                            </div>
                          )}
                          {whiteoutPreview && (
                            <div
                              className="pointer-events-none absolute border-2 border-dashed border-[var(--c-primary)] bg-white/70"
                              style={whiteoutPreview}
                            />
                          )}
                        </div>
                        <p className="mt-2 text-center text-xs text-[var(--c-muted-fg)]">
                          {tool === "image" && (pendingImage ? "Click to place image" : "Pick an image, then click to place")}
                          {tool === "whiteout" && "Click and drag to white out an area"}
                          {tool === "select" && "Select a tool to edit the page"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="merge" className="mt-4">
                <div className="max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6">
                  <div className="flex items-center gap-3">
                    <FileStack className="h-5 w-5 text-[var(--c-primary)]" />
                    <div>
                      <h3 className="font-heading font-semibold text-[var(--c-ink)]">Merge more files</h3>
                      <p className="text-xs text-[var(--c-muted-fg)]">Append additional PDF or Word files to the end of this document</p>
                    </div>
                  </div>
                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-8">
                    <Upload className="h-7 w-7 text-[var(--c-primary)]" />
                    <span className="mt-2 text-sm font-medium">Add files</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf,.docx"
                      multiple
                      className="hidden"
                      data-testid="pdf-merge-input"
                      onChange={(e) => setMergeFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {mergeFiles.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-[var(--c-ink)]">
                      {mergeFiles.map((f, i) => (
                        <li key={`${f.name}-${i}`}>{f.name}</li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="mt-4 w-full"
                    disabled={busy || !mergeFiles.length}
                    onClick={onMergeAppend}
                    data-testid="pdf-merge-btn"
                    style={{ background: "var(--c-primary)", color: "#fff" }}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Append files
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="split" className="mt-4">
                <div className="max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6">
                  <div className="flex items-center gap-3">
                    <Scissors className="h-5 w-5 text-[var(--c-primary)]" />
                    <div>
                      <h3 className="font-heading font-semibold text-[var(--c-ink)]">Split into parts</h3>
                      <p className="text-xs text-[var(--c-muted-fg)]">Use ranges like 1-2, 3, downloads a ZIP of PDFs</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="split-ranges">Page ranges</Label>
                    <Input
                      id="split-ranges"
                      className="mt-1"
                      placeholder="e.g. 1-2, 3"
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      data-testid="pdf-split-input"
                    />
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={busy || !splitRanges.trim()}
                    onClick={onSplit}
                    data-testid="pdf-split-btn"
                    style={{ background: "var(--c-primary)", color: "#fff" }}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Download ZIP
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <QuotaLimitModal open={quotaModal} onOpenChange={setQuotaModal} detail={quotaDetail} />
    </AppShell>
  );
}