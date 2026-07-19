import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import api, { downloadFile, formatApiError, workspacePagePreviewUrl } from "@/lib/api";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { handleQuotaApiError } from "@/lib/quota";
import { AppShell } from "@/components/AppShell";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { usePlan } from "@/hooks/usePlan";
import { QuotaLimitModal } from "@/components/QuotaLimitModal";

// Tool panels are heavy — load only when the user opens that tool.
const PdfTextEditor = lazy(() =>
  import("@/components/PdfTextEditor").then((m) => ({ default: m.PdfTextEditor })),
);
const PdfCompressPanel = lazy(() =>
  import("@/components/PdfCompressPanel").then((m) => ({ default: m.PdfCompressPanel })),
);
const PdfWatermarkPanel = lazy(() =>
  import("@/components/PdfWatermarkPanel").then((m) => ({ default: m.PdfWatermarkPanel })),
);
const PdfProtectPanel = lazy(() =>
  import("@/components/PdfProtectPanel").then((m) => ({ default: m.PdfProtectPanel })),
);
const PdfUnlockPanel = lazy(() =>
  import("@/components/PdfUnlockPanel").then((m) => ({ default: m.PdfUnlockPanel })),
);
const PdfWordConvertPanel = lazy(() =>
  import("@/components/PdfWordConvertPanel").then((m) => ({ default: m.PdfWordConvertPanel })),
);
const PdfAiMetadataPanel = lazy(() =>
  import("@/components/PdfAiMetadataPanel").then((m) => ({ default: m.PdfAiMetadataPanel })),
);

function PanelFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-[var(--c-border)] bg-[var(--card)]">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--c-muted-fg)]" />
    </div>
  );
}
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
  Highlighter,
  Square,
  Circle,
  Minus,
  Check,
  X,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Files,
  ShieldCheck,
  PenLine,
  Send,
} from "lucide-react";
import {
  PDF_CATEGORIES,
  PDF_HOME_TOOLS,
  PDF_TOOL_GROUPS,
  toolMatchesSearch,
} from "@/lib/managePdfTools";

const TOOLS = [
  { id: "select", label: "Select", icon: MousePointer2, testid: "pdf-tool-select" },
  { id: "text", label: "Edit text", icon: Type, testid: "pdf-tool-text" },
  { id: "image", label: "Image", icon: ImageIcon, testid: "pdf-tool-image" },
  { id: "whiteout", label: "Whiteout", icon: Eraser, testid: "pdf-tool-whiteout" },
  { id: "highlight", label: "Highlight", icon: Highlighter, testid: "pdf-tool-highlight" },
  { id: "rect", label: "Rectangle", icon: Square, testid: "pdf-tool-rect" },
  { id: "ellipse", label: "Ellipse", icon: Circle, testid: "pdf-tool-ellipse" },
  { id: "line", label: "Line", icon: Minus, testid: "pdf-tool-line" },
  { id: "check", label: "Checkmark", icon: Check, testid: "pdf-tool-check" },
  { id: "cross", label: "Cross", icon: X, testid: "pdf-tool-cross" },
  { id: "link", label: "Link", icon: LinkIcon, testid: "pdf-tool-link" },
];

// Tools that use click-and-drag on the page
const DRAG_TOOLS = new Set(["whiteout", "highlight", "rect", "ellipse", "line", "link"]);
// Tools that place a mark with a single click
const CLICK_TOOLS = new Set(["check", "cross"]);

const ANNOT_COLORS = [
  { id: "red", css: "#dc2626", rgb: [0.86, 0.15, 0.15] },
  { id: "blue", css: "#2563eb", rgb: [0.15, 0.39, 0.92] },
  { id: "green", css: "#16a34a", rgb: [0.09, 0.64, 0.29] },
  { id: "black", css: "#1f2937", rgb: [0.12, 0.16, 0.22] },
  { id: "yellow", css: "#eab308", rgb: [0.92, 0.7, 0.03] },
];

function PdfHomeModeCard({ testId, onClick, icon: Icon, title, description, cta, tag }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="group cs-portal-surface-card flex h-full flex-col rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: "var(--badge-teal-bg)" }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        {tag && (
          <span className="rounded-full bg-[var(--c-paper-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">
            {tag}
          </span>
        )}
      </div>
      <h2 className="mt-3 font-heading text-base font-bold text-[var(--c-ink)]">{title}</h2>
      <p className="mt-1.5 flex-1 text-sm leading-snug text-[var(--c-muted-fg)]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--c-primary)]">
        {cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function ManagePdfHome({ category, search, onCategoryChange, onSelectTool, onOpenSaved }) {
  const categoryLabel = PDF_CATEGORIES.find((c) => c.id === category)?.label || "All tools";
  const q = search.trim().toLowerCase();
  const byCategory = category === "all"
    ? PDF_HOME_TOOLS
    : PDF_HOME_TOOLS.filter((t) => t.category === category);
  const filtered = byCategory.filter((t) => toolMatchesSearch(t, q));

  const renderToolGrid = (tools) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {tools.map((tool) => {
        const group = PDF_TOOL_GROUPS.find((g) => g.id === tool.category);
        return (
          <PdfHomeModeCard
            key={tool.id}
            testId={tool.testId}
            onClick={() => onSelectTool(tool.id)}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            cta={tool.cta}
            tag={category === "all" ? group?.label : undefined}
          />
        );
      })}
    </div>
  );

  return (
    <div data-testid="manage-pdf-home">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            style={{ fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 600, color: "var(--c-primary-hover)" }}
          >
            2-in-1 workspace
          </div>
          <h2 className="mt-0.5 font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--c-ink)]">
            Choose a tool
            <span style={{ color: "var(--c-accent)" }}>.</span>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Edit, compress, watermark, protect, unlock, convert, merge, split, or scan PDFs — then download or save to Documents for signing.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSaved}
          data-testid="manage-pdf-saved-documents-btn"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-portal-card)] px-4 py-2.5 text-[13px] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)]"
        >
          <Files className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
          Saved PDFs
        </button>
      </div>

      <div
        className="mb-5 flex flex-wrap rounded-full border border-[var(--c-border)] bg-[var(--c-portal-card)] p-[3px] w-fit"
        data-testid="manage-pdf-category-filter"
      >
        {PDF_CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              data-testid={`manage-pdf-category-${cat.id}`}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
              style={active ? { background: "var(--c-ink-solid)", color: "#fff" } : { color: "var(--c-muted-fg)" }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          {filtered.length === 0 ? (
            <div className="cs-portal-surface-card flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
              <p className="font-heading text-lg font-semibold text-[var(--c-ink)]">No tools match your search</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--c-muted-fg)]">
                Try &quot;compress&quot;, &quot;merge&quot;, &quot;watermark&quot;, or clear the search bar above.
              </p>
            </div>
          ) : category === "all" ? (
            PDF_TOOL_GROUPS.map((group) => {
              const tools = filtered.filter((t) => t.category === group.id);
              if (!tools.length) return null;
              return (
                <section key={group.id} className="cs-portal-surface-card overflow-hidden rounded-2xl">
                  <div className="flex items-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-sm"
                      style={{ background: group.bg }}
                      aria-hidden
                    >
                      {group.emoji}
                    </span>
                    <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">{group.label}</h3>
                    <span className="ml-auto rounded-full bg-[var(--c-portal-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-muted-fg)]">
                      {tools.length} tool{tools.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="p-5">{renderToolGrid(tools)}</div>
                </section>
              );
            })
          ) : (
            <div className="cs-portal-surface-card overflow-hidden rounded-2xl">
              <div className="border-b border-[var(--c-border)] bg-[var(--c-paper-2)] px-5 py-3.5">
                <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">{categoryLabel}</h3>
                <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">
                  {filtered.length} tool{filtered.length === 1 ? "" : "s"} in this category
                </p>
              </div>
              <div className="p-5">{renderToolGrid(filtered)}</div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Included on your plan
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-[var(--c-ink)]">
              Manage PDF is part of CivicSign&apos;s 2-in-1 platform. Saved files do not count toward your monthly send allowance.
            </p>
          </div>

          <div className="cs-portal-surface-card rounded-2xl p-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--c-muted-fg)]">Typical workflow</h4>
            <ol className="mt-3 space-y-2.5">
              {[
                { icon: PenTool, text: "Pick a tool and upload your file" },
                { icon: Save, text: "Download or save to Documents" },
                { icon: PenLine, text: "Open in Prepare Studio to place fields" },
                { icon: Send, text: "Send for signature when ready" },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={step.text} className="flex items-start gap-2.5 text-sm text-[var(--c-ink)]">
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ background: "var(--badge-teal-bg)", color: "var(--c-primary)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex items-center gap-1.5 pt-0.5">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--c-primary)" }} />
                      {step.text}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div
            className="cs-portal-surface-card rounded-2xl border-l-4 px-4 py-3.5"
            style={{ borderLeftColor: "var(--c-primary)" }}
          >
            <p className="text-sm leading-relaxed text-[var(--c-ink)]">
              <strong>Saved PDFs</strong> live under Documents → From Manage PDF. Open any saved file in Prepare Studio when you&apos;re ready to send.
            </p>
            <button
              type="button"
              onClick={onOpenSaved}
              className="mt-2 text-xs font-semibold text-[var(--c-primary)] hover:underline"
            >
              View saved PDFs →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Load thumbnail only when near the viewport — avoids N concurrent full-PDF rasterises. */
function LazyPageThumb({ src, alt }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative h-full w-full">
      {visible && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {(!visible || !loaded) && !failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--c-muted-fg)]" />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--c-muted-fg)]">
          Preview unavailable
        </div>
      )}
    </div>
  );
}

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
          <LazyPageThumb src={thumbUrl} alt={`Page ${index + 1}`} />
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
  const { has: hasFeature } = usePlan();
  const navigate = useNavigate();
  const [homeView, setHomeView] = useState("home");
  const [homeCategory, setHomeCategory] = useState("all");
  const [homeToolSearch, setHomeToolSearch] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [tab, setTab] = useState("pages");
  const [busy, setBusy] = useState(false);
  const [standaloneMergeFiles, setStandaloneMergeFiles] = useState([]);
  const [mergeTitle, setMergeTitle] = useState("Merged document");
  const [quotaModal, setQuotaModal] = useState(false);
  const [quotaDetail, setQuotaDetail] = useState(null);
  const [thumbVersion, setThumbVersion] = useState(0);
  const [editorPage, setEditorPage] = useState(0);
  const [tool, setTool] = useState("select");
  const [pendingImage, setPendingImage] = useState(null);
  const [whiteoutDrag, setWhiteoutDrag] = useState(null);
  const [annotColor, setAnnotColor] = useState(ANNOT_COLORS[0]);
  const [saveTitle, setSaveTitle] = useState("");
  const [splitRanges, setSplitRanges] = useState("");
  const [splitWorkspace, setSplitWorkspace] = useState(null);
  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Bumping version only changes img ?v= — browser loads pages lazily (IntersectionObserver).
  const bumpThumbs = useCallback(() => setThumbVersion((v) => v + 1), []);

  const applyWorkspace = (data) => {
    setWorkspace(data);
    if (!saveTitle) {
      const base = (data.original_filename || data.filename || "document").replace(/\.pdf$/i, "");
      setSaveTitle(`${base} (Edited)`);
    }
  };

  const pageCount = workspace?.page_count || 0;
  const workspaceId = workspace?.workspace_id;

  const thumbUrls = useMemo(() => {
    if (!workspaceId || !pageCount) return [];
    return Array.from({ length: pageCount }, (_, i) =>
      workspacePagePreviewUrl(workspaceId, i, {
        version: thumbVersion,
        dpi: 72,
        fmt: "jpeg",
        quality: 72,
      }),
    );
  }, [workspaceId, pageCount, thumbVersion]);

  // Editor uses a slightly sharper preview; still JPEG for speed.
  const editorUrl = useMemo(() => {
    if (!workspaceId) return "";
    return workspacePagePreviewUrl(workspaceId, editorPage, {
      version: thumbVersion,
      dpi: 110,
      fmt: "jpeg",
      quality: 82,
    });
  }, [workspaceId, editorPage, thumbVersion]);

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

  const refreshAfterTextEdit = useCallback(async () => {
    bumpThumbs();
    // refresh undo/redo availability after PdfTextEditor saves
    const wid = workspace?.workspace_id;
    if (!wid) return;
    try {
      const { data } = await api.get(`/pdf/workspace/${wid}`);
      setWorkspace((prev) => (prev ? { ...prev, ...data } : prev));
    } catch {
      /* preview already refreshed; meta refresh is best-effort */
    }
  }, [bumpThumbs, workspace?.workspace_id]);

  const restoreVersion = async (direction, msg) => {
    const data = await runOp(
      () => api.post(`/pdf/workspace/${workspace.workspace_id}/${direction}`).then((r) => r.data),
      msg,
    );
    if (data?.page_count) {
      setEditorPage((p) => Math.min(p, data.page_count - 1));
    }
  };

  const onUndo = () => restoreVersion("undo", "Change undone");
  const onRedo = () => restoreVersion("redo", "Change redone");

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
      setThumbVersion(0);
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

  const mergeAndSaveDocuments = async () => {
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
      const res = await api.get(`/pdf/workspace/${ws.workspace_id}/download`, { responseType: "blob" });
      const title = mergeTitle.trim() || "Merged document";
      const filename = `${title.replace(/\.pdf$/i, "")}.pdf`;
      await savePdfBlobToDocuments({
        blob: res.data,
        filename,
        title: `${title} (Merged)`,
        tool: "merge",
        originalFilename: standaloneMergeFiles.map((f) => f.name).join(", "),
        quotaHandlers: { setDetail: setQuotaDetail, setOpen: setQuotaModal },
      });
      toast.success("Saved to Documents → From Manage PDF");
    } catch (err) {
      if (!handleQuotaApiError(err, { setDetail: setQuotaDetail, setOpen: setQuotaModal })) {
        toast.error(formatApiError(err));
      }
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

  const ANNOT_LABELS = {
    highlight: "Highlight added",
    rect: "Rectangle added",
    ellipse: "Ellipse added",
    line: "Line added",
    check: "Checkmark added",
    cross: "Cross added",
    link: "Link added",
  };

  const postAnnotation = (body, msg) =>
    runOp(
      () => api.post(`/pdf/workspace/${workspace.workspace_id}/annotate`, body).then((r) => r.data),
      msg,
    );

  const finishAnnotationDrag = async (kind, start, end) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(0.01, Math.abs(end.x - start.x));
    const h = Math.max(0.01, Math.abs(end.y - start.y));
    const body = {
      page_index: editorPage,
      kind,
      rect_pct: { x, y, w, h },
      color: kind === "highlight" ? [1, 0.9, 0.2] : annotColor.rgb,
      stroke_width: 1.5,
    };
    if (kind === "line") {
      // preserve the drag direction for the line endpoints
      body.rect_pct = { x: start.x, y: start.y, w: Math.max(0.01, w), h: Math.max(0.01, h) };
      body.end_pct = { x: end.x, y: end.y };
    }
    if (kind === "link") {
      const url = window.prompt("Link URL (https://…)");
      if (!url) return;
      body.url = url.trim();
    }
    await postAnnotation(body, ANNOT_LABELS[kind]);
  };

  const placeClickMark = async (kind, pt) => {
    const size = 0.028;
    await postAnnotation({
      page_index: editorPage,
      kind,
      rect_pct: {
        x: Math.max(0, pt.x - size / 2),
        y: Math.max(0, pt.y - size / 2),
        w: size,
        h: size,
      },
      color: kind === "check" ? [0.05, 0.55, 0.25] : [0.75, 0.12, 0.12],
    }, ANNOT_LABELS[kind]);
  };

  const onCanvasMouseDown = (e) => {
    if (tool === "image") {
      placeImage(e);
      return;
    }
    if (CLICK_TOOLS.has(tool)) {
      const pt = relPoint(e);
      if (pt) placeClickMark(tool, pt);
      return;
    }
    if (DRAG_TOOLS.has(tool)) {
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
    const { start, end } = whiteoutDrag;
    setWhiteoutDrag(null);
    if (Math.abs(end.x - start.x) < 0.005 && Math.abs(end.y - start.y) < 0.005) return;
    if (tool === "whiteout") {
      finishWhiteout(start, end);
    } else if (DRAG_TOOLS.has(tool)) {
      finishAnnotationDrag(tool, start, end);
    }
  };

  const onDownload = () => {
    if (!workspace) return;
    downloadFile(`/pdf/workspace/${workspace.workspace_id}/download`, workspace.filename || "document.pdf");
  };

  const onSaveToDocuments = async () => {
    if (!workspace) return;
    const fd = new FormData();
    fd.append("title", saveTitle || "Edited document");
    fd.append("tool", "edit");
    setBusy(true);
    try {
      await api.post(
        `/pdf/workspace/${workspace.workspace_id}/save-to-documents`,
        fd,
      );
      toast.success("Saved to Documents → From Manage PDF tab");
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

  const onSplitUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const data = await createWorkspace(file);
      setSplitWorkspace({
        workspace_id: data.workspace_id,
        filename: data.filename,
        page_count: data.page_count,
      });
      setSplitRanges("");
      toast.success(`${data.page_count} page${data.page_count === 1 ? "" : "s"} loaded`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onSplitSave = async () => {
    if (!splitWorkspace || !splitRanges.trim()) {
      toast.error("Upload a PDF and enter page ranges (e.g. 1-2, 3)");
      return;
    }
    setBusy(true);
    try {
      const base = (splitWorkspace.filename || "document").replace(/\.pdf$/i, "");
      const { data } = await api.post(
        `/pdf/workspace/${splitWorkspace.workspace_id}/split/save-to-documents`,
        { ranges: splitRanges.trim(), title: `${base} (Split)` },
      );
      const n = data.saved_count || 1;
      toast.success(
        n === 1
          ? "Saved to Documents → From Manage PDF"
          : `Saved ${n} documents to Documents → From Manage PDF`,
      );
    } catch (err) {
      if (!handleQuotaApiError(err, { setDetail: setQuotaDetail, setOpen: setQuotaModal })) {
        toast.error(formatApiError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const onSplit = async () => {
    if (!splitWorkspace || !splitRanges.trim()) {
      toast.error("Upload a PDF and enter page ranges (e.g. 1-2, 3)");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${splitWorkspace.workspace_id}/split`,
        { ranges: splitRanges.trim() },
        { responseType: "blob" },
      );
      const base = (splitWorkspace.filename || "document").replace(/\.pdf$/i, "");
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

  const quotaHandlers = { setDetail: setQuotaDetail, setOpen: setQuotaModal };

  const headerActions = workspace ? (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onDownload}
        disabled={busy}
        data-testid="pdf-download-btn"
        aria-label="Download"
      >
        <Download className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Download</span>
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={onSaveToDocuments}
        disabled={busy}
        data-testid="pdf-save-documents-btn"
        aria-label="Save to Documents"
        style={{ background: "var(--c-primary)", color: "#fff" }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" /> : <Save className="h-4 w-4 sm:mr-1.5" />}
        <span className="hidden sm:inline">Save to Documents</span>
        <span className="sm:hidden">Save</span>
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

  const showToolHome = !workspace && homeView === "home";

  if (!hasFeature("manage_pdf")) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl" data-testid="manage-pdf-upgrade">
          <UpgradePrompt
            feature="manage_pdf"
            title="Manage PDF is included with every paid plan"
            description="Edit, compress, watermark, protect, unlock, convert PDF/Word, merge, split, and scan AI metadata — included on Pro, Business, and Organisation plans. Not available on the Free plan."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      actions={headerActions}
      headerSearch={showToolHome ? {
        value: homeToolSearch,
        onChange: setHomeToolSearch,
        placeholder: "Search PDF tools…",
        testId: "manage-pdf-search-input",
      } : undefined}
    >
      <div data-testid="manage-pdf" className="mx-auto max-w-6xl">
        {!workspace ? (
          <div data-testid="pdf-empty-uploader">
            {homeView === "home" && (
              <ManagePdfHome
                category={homeCategory}
                search={homeToolSearch}
                onCategoryChange={setHomeCategory}
                onSelectTool={setHomeView}
                onOpenSaved={() => navigate("/documents?tab=manage-pdf")}
              />
            )}

            <Suspense fallback={<PanelFallback />}>
              {homeView === "compress" && (
                <PdfCompressPanel
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}

              {homeView === "watermark" && (
                <PdfWatermarkPanel
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}

              {homeView === "protect" && (
                <PdfProtectPanel
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}

              {homeView === "unlock" && (
                <PdfUnlockPanel
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}

              {homeView === "pdf-to-word" && (
                <PdfWordConvertPanel
                  mode="pdf-to-word"
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}

              {homeView === "word-to-pdf" && (
                <PdfWordConvertPanel
                  mode="word-to-pdf"
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}

              {homeView === "ai-metadata" && (
                <PdfAiMetadataPanel
                  busy={busy}
                  setBusy={setBusy}
                  onBack={() => setHomeView("home")}
                  quotaHandlers={quotaHandlers}
                />
              )}
            </Suspense>

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
                    Upload one PDF or Word file to open the page editor and overlay tools.
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

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
                    variant="outline"
                    className="w-full"
                    disabled={busy || standaloneMergeFiles.length < 2}
                    onClick={mergeAndSaveDocuments}
                    data-testid="standalone-merge-save-documents-btn"
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    Save to Documents
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
                    Prepare for signing
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {homeView === "split" && (
              <div className="mx-auto max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8">
                <button
                  type="button"
                  className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]"
                  onClick={() => {
                    setHomeView("home");
                    setSplitWorkspace(null);
                    setSplitRanges("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: "var(--c-primary)18" }}
                  >
                    <Scissors className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Split PDF</h2>
                    <p className="text-xs text-[var(--c-muted-fg)]">
                      {splitWorkspace
                        ? `${splitWorkspace.filename} · ${splitWorkspace.page_count} page${splitWorkspace.page_count === 1 ? "" : "s"}`
                        : "Upload a PDF, then enter page ranges"}
                    </p>
                  </div>
                </div>

                {!splitWorkspace ? (
                  <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
                    <Upload className="h-9 w-9 text-[var(--c-primary)]" />
                    <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose PDF or DOCX</span>
                    <span className="mt-1 text-xs text-[var(--c-muted-fg)]">Up to 20 MB</span>
                    <Button
                      type="button"
                      className="mt-4"
                      disabled={busy}
                      data-testid="standalone-split-upload-btn"
                      style={{ background: "var(--c-primary)", color: "#fff" }}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        document.getElementById("standalone-split-upload-input")?.click();
                      }}
                    >
                      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      Upload document
                    </Button>
                    <input
                      id="standalone-split-upload-input"
                      type="file"
                      accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      data-testid="standalone-split-upload-input"
                      onChange={onSplitUpload}
                    />
                  </label>
                ) : (
                  <>
                    <div className="mt-5">
                      <Label htmlFor="standalone-split-ranges">Page ranges</Label>
                      <Input
                        id="standalone-split-ranges"
                        className="mt-1"
                        placeholder="e.g. 1-2, 3"
                        value={splitRanges}
                        onChange={(e) => setSplitRanges(e.target.value)}
                        data-testid="standalone-split-input"
                      />
                      <p className="mt-1.5 text-xs text-[var(--c-muted-fg)]">
                        Use commas between parts. Each range becomes a separate PDF in the ZIP.
                      </p>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setSplitWorkspace(null);
                          setSplitRanges("");
                        }}
                        data-testid="standalone-split-change-file-btn"
                      >
                        Change file
                      </Button>
                      <Button
                        type="button"
                        disabled={busy || !splitRanges.trim()}
                        onClick={onSplit}
                        data-testid="standalone-split-download-btn"
                        style={{ background: "var(--c-primary)", color: "#fff" }}
                      >
                        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                        Download ZIP
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy || !splitRanges.trim()}
                        onClick={onSplitSave}
                        data-testid="standalone-split-save-documents-btn"
                      >
                        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Save to Documents
                      </Button>
                    </div>
                  </>
                )}
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
                    {(DRAG_TOOLS.has(tool) || CLICK_TOOLS.has(tool)) && tool !== "whiteout" && tool !== "highlight" && (
                      <div className="flex items-center gap-1.5 pt-1" data-testid="pdf-annot-colors">
                        {ANNOT_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            aria-label={`Colour ${c.id}`}
                            data-testid={`pdf-annot-color-${c.id}`}
                            onClick={() => setAnnotColor(c)}
                            className={`h-5 w-5 rounded-full border-2 transition-transform ${
                              annotColor.id === c.id ? "scale-110 border-[var(--c-ink)]" : "border-transparent"
                            }`}
                            style={{ background: c.css }}
                          />
                        ))}
                      </div>
                    )}
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || !workspace.can_undo}
                        onClick={onUndo}
                        data-testid="pdf-undo-btn"
                      >
                        <Undo2 className="mr-1.5 h-4 w-4" />
                        Undo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || !workspace.can_redo}
                        onClick={onRedo}
                        data-testid="pdf-redo-btn"
                      >
                        <Redo2 className="mr-1.5 h-4 w-4" />
                        Redo
                      </Button>
                      <span className="mx-1 h-5 w-px bg-[var(--c-border)]" />
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
                      <Suspense fallback={<PanelFallback />}>
                        <PdfTextEditor
                          key={`${workspace.workspace_id}-${editorPage}`}
                          workspaceId={workspace.workspace_id}
                          pageIndex={editorPage}
                          pageImageUrl={editorUrl}
                          pageDim={workspace.pages?.[editorPage]}
                          disabled={busy}
                          onSaved={refreshAfterTextEdit}
                        />
                      </Suspense>
                    ) : (
                      <>
                        <div
                          ref={canvasRef}
                          data-testid="pdf-editor-canvas"
                          className={`relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] ${
                            DRAG_TOOLS.has(tool) || CLICK_TOOLS.has(tool) || tool === "image" ? "cursor-crosshair" : ""
                          }`}
                          onMouseDown={onCanvasMouseDown}
                          onMouseMove={onCanvasMouseMove}
                          onMouseUp={onCanvasMouseUp}
                          onMouseLeave={() => whiteoutDrag && onCanvasMouseUp()}
                        >
                          {editorUrl ? (
                            <img
                              key={editorUrl}
                              src={editorUrl}
                              alt={`Edit page ${editorPage + 1}`}
                              className="block w-full select-none"
                              draggable={false}
                              decoding="async"
                            />
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-[var(--c-muted-fg)]" />
                            </div>
                          )}
                          {whiteoutPreview && (
                            <div
                              className={`pointer-events-none absolute border-2 border-dashed ${
                                tool === "whiteout"
                                  ? "border-[var(--c-primary)] bg-white/70"
                                  : tool === "highlight"
                                    ? "border-yellow-500 bg-yellow-300/40"
                                    : "border-[var(--c-primary)] bg-[var(--c-primary)]/10"
                              } ${tool === "ellipse" ? "rounded-full" : ""}`}
                              style={whiteoutPreview}
                            />
                          )}
                        </div>
                        <p className="mt-2 text-center text-xs text-[var(--c-muted-fg)]">
                          {tool === "image" && (pendingImage ? "Click to place image" : "Pick an image, then click to place")}
                          {tool === "whiteout" && "Click and drag to white out an area"}
                          {tool === "highlight" && "Click and drag to highlight an area"}
                          {tool === "rect" && "Click and drag to draw a rectangle"}
                          {tool === "ellipse" && "Click and drag to draw an ellipse"}
                          {tool === "line" && "Click and drag to draw a line"}
                          {tool === "check" && "Click the page to place a checkmark"}
                          {tool === "cross" && "Click the page to place a cross"}
                          {tool === "link" && "Click and drag over text to add a web link"}
                          {tool === "select" && "Select a tool to edit the page"}
                        </p>
                      </>
                    )}
                  </div>
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