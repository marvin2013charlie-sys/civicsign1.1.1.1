import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Undo2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

/** Sample page background colour from image edges (for new text placement). */
function sampleImageBg(img, rectPct) {
  if (!img?.complete || !img.naturalWidth) return null;
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const x0 = Math.max(0, Math.floor(rectPct.x * w));
  const y0 = Math.max(0, Math.floor(rectPct.y * h));
  const x1 = Math.min(w - 1, Math.floor((rectPct.x + (rectPct.w || 0.12)) * w));
  const y1 = Math.min(h - 1, Math.floor((rectPct.y + (rectPct.h || 0.04)) * h));
  const samples = [];
  const step = Math.max(1, Math.floor((x1 - x0) / 6));
  for (let x = x0; x <= x1; x += step) {
    for (const y of [Math.max(0, y0 - 3), Math.min(h - 1, y1 + 3)]) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      samples.push([d[0], d[1], d[2]]);
    }
  }
  if (!samples.length) return null;
  const n = samples.length;
  const r = Math.round(samples.reduce((s, p) => s + p[0], 0) / n);
  const g = Math.round(samples.reduce((s, p) => s + p[1], 0) / n);
  const b = Math.round(samples.reduce((s, p) => s + p[2], 0) / n);
  return `rgb(${r},${g},${b})`;
}

/**
 * Real in-place PDF text editing: click a line, the original glyphs are covered
 * with the sampled page background, and you type on top — no overlap, no white box.
 */
export function PdfTextEditor({
  workspaceId,
  pageIndex,
  pageImageUrl,
  pageDim,
  disabled,
  onSaved,
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const editRef = useRef(null);
  const editHistoryRef = useRef({});

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [newPlacement, setNewPlacement] = useState(null);
  const [newText, setNewText] = useState("");
  const [newPlacementBg, setNewPlacementBg] = useState(null);
  const [pendingAdds, setPendingAdds] = useState([]);

  const updateScale = useCallback(() => {
    const img = imgRef.current;
    const pdfW = pageDim?.width;
    if (img?.clientWidth && pdfW) {
      setScale(img.clientWidth / pdfW);
    }
  }, [pageDim]);

  const loadBlocks = useCallback(async (preserveDrafts = false) => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/pdf/workspace/${workspaceId}/page/${pageIndex}/text-spans`,
      );
      setBlocks(data.spans || []);
      if (!preserveDrafts) {
        setDrafts({});
        setPendingAdds([]);
        editHistoryRef.current = {};
      }
      setActiveId(null);
      setNewPlacement(null);
      setNewText("");
      setNewPlacementBg(null);
    } catch (err) {
      setBlocks([]);
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, pageIndex]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale, pageImageUrl]);

  useEffect(() => {
    if (activeId && editRef.current) {
      editRef.current.focus();
      const len = editRef.current.value.length;
      editRef.current.setSelectionRange(len, len);
    }
  }, [activeId]);

  const blockText = (block) => drafts[block.id] ?? block.text;

  const blockInk = (block) => block.text_color_css || "rgb(15,23,42)";

  const blockFill = (block) => block.bg_color_css || "rgb(255,255,255)";

  const ensureHistory = (blockId, seed) => {
    if (!editHistoryRef.current[blockId]) {
      editHistoryRef.current[blockId] = { past: [], present: seed, future: [] };
    }
    return editHistoryRef.current[blockId];
  };

  const recordEdit = (blockId, nextValue, block) => {
    const h = ensureHistory(blockId, drafts[blockId] ?? block.text);
    if (nextValue === h.present) return;
    h.past.push(h.present);
    h.present = nextValue;
    h.future = [];
    setDrafts((prev) => ({ ...prev, [blockId]: nextValue }));
  };

  const undoEdit = useCallback((blockId, block) => {
    const h = ensureHistory(blockId, drafts[blockId] ?? block.text);
    if (!h.past.length) return false;
    h.future.unshift(h.present);
    h.present = h.past.pop();
    setDrafts((prev) => ({ ...prev, [blockId]: h.present }));
    return true;
  }, [drafts]);

  const redoEdit = useCallback((blockId, block) => {
    const h = ensureHistory(blockId, drafts[blockId] ?? block.text);
    if (!h.future.length) return false;
    h.past.push(h.present);
    h.present = h.future.shift();
    setDrafts((prev) => ({ ...prev, [blockId]: h.present }));
    return true;
  }, [drafts]);

  const isBlockDirty = useCallback((block) => {
    const d = drafts[block.id];
    return d !== undefined && d !== block.text;
  }, [drafts]);

  const hasPendingChanges = useMemo(() => {
    const edited = blocks.some(isBlockDirty);
    const drafting = Boolean(newPlacement && newText.trim());
    return edited || pendingAdds.length > 0 || drafting;
  }, [blocks, isBlockDirty, pendingAdds, newPlacement, newText]);

  const isEditingSession = Boolean(activeId || hasPendingChanges || newPlacement);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!canvasRef.current) return;
      const inEditor = canvasRef.current.contains(e.target);
      if (!inEditor && !activeId) return;

      const isUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
      const isRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && e.shiftKey;

      if (isUndo || isRedo) {
        e.preventDefault();
        e.stopPropagation();
        if (!activeId) return;
        const block = blocks.find((b) => b.id === activeId);
        if (!block) return;
        if (isUndo) undoEdit(activeId, block);
        else redoEdit(activeId, block);
        return;
      }

      const isBack = (e.metaKey || e.altKey) && e.key === "ArrowLeft";
      if (isBack && isEditingSession) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeId, blocks, isEditingSession, redoEdit, undoEdit]);

  useEffect(() => {
    if (!isEditingSession) return undefined;

    const trap = { pdfTextEditor: true };
    window.history.pushState(trap, "", window.location.href);

    const onPopState = () => {
      window.history.pushState(trap, "", window.location.href);
      toast.message("Save or discard your text changes before leaving this page");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isEditingSession]);

  const stageNewText = () => {
    const text = newText.trim();
    if (!text || !newPlacement) return;
    const bg = newPlacementBg || sampleImageBg(imgRef.current, {
      x: newPlacement.x,
      y: newPlacement.y,
      w: Math.min(0.55, Math.max(0.12, text.length * 0.012)),
      h: 0.04,
    });
    setPendingAdds((prev) => [
      ...prev,
      {
        id: `new-${prev.length}`,
        text,
        rect_pct: {
          x: newPlacement.x,
          y: newPlacement.y,
          w: Math.min(0.55, Math.max(0.12, text.length * 0.012)),
          h: 0.04,
        },
        font_size: 12,
        font_family: "Helvetica, Arial, sans-serif",
        text_color_css: "rgb(15,23,42)",
        bg_color_css: bg || "rgb(255,255,255)",
      },
    ]);
    setNewPlacement(null);
    setNewText("");
    setNewPlacementBg(null);
  };

  const discardChanges = () => {
    setDrafts({});
    setPendingAdds([]);
    setNewPlacement(null);
    setNewText("");
    setNewPlacementBg(null);
    setActiveId(null);
    loadBlocks();
    toast.message("Unsaved text changes discarded");
  };

  const saveAll = async () => {
    if (!hasPendingChanges || saving) return;

    const edits = blocks.filter(isBlockDirty);
    const adds = [...pendingAdds];
    if (newPlacement && newText.trim()) {
      adds.push({
        id: "new-final",
        text: newText.trim(),
        rect_pct: {
          x: newPlacement.x,
          y: newPlacement.y,
          w: Math.min(0.55, Math.max(0.12, newText.trim().length * 0.012)),
          h: 0.04,
        },
        font_size: 12,
        font_family: "Helvetica, Arial, sans-serif",
      });
    }

    if (!edits.length && !adds.length) return;

    setSaving(true);
    try {
      for (const block of edits) {
        const next = drafts[block.id];
        await api.post(`/pdf/workspace/${workspaceId}/edit-text`, {
          page_index: pageIndex,
          rect_pct: block.rect_pct,
          new_text: next,
          old_text: block.text,
          origin_pct: block.origin_pct,
          font_size: block.font_size,
          font_name: block.font_name,
          text_color: block.text_color,
        });
      }
      for (const add of adds) {
        await api.post(`/pdf/workspace/${workspaceId}/text`, {
          page_index: pageIndex,
          text: add.text,
          font_size: add.font_size || 12,
          rect_pct: add.rect_pct,
        });
      }
      toast.success(
        edits.length + adds.length === 1
          ? "Text saved"
          : `${edits.length + adds.length} text changes saved`,
      );
      setDrafts({});
      setPendingAdds([]);
      setNewPlacement(null);
      setNewText("");
      setNewPlacementBg(null);
      setActiveId(null);
      await onSaved?.();
      await loadBlocks();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const relPoint = (e) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 0.95),
      y: Math.min(Math.max(0, (e.clientY - rect.top) / rect.height), 0.95),
    };
  };

  const hitBlock = (pt) => {
    if (!pt) return null;
    const pad = 0.012;
    return blocks.find((b) => {
      const r = b.rect_pct;
      return (
        pt.x >= r.x - pad
        && pt.x <= r.x + r.w + pad
        && pt.y >= r.y - pad
        && pt.y <= r.y + r.h + pad
      );
    });
  };

  const selectBlock = (blockId) => {
    if (newPlacement && newText.trim()) {
      stageNewText();
    }
    setNewPlacement(null);
    setNewText("");
    setNewPlacementBg(null);
    const block = blocks.find((b) => b.id === blockId);
    if (block) ensureHistory(blockId, drafts[blockId] ?? block.text);
    setActiveId(blockId);
  };

  const deselectAll = () => {
    setActiveId(null);
    setNewPlacement(null);
    setNewText("");
    setNewPlacementBg(null);
  };

  const onCanvasClick = (e) => {
    if (disabled || saving) return;
    const pt = relPoint(e);
    const hit = hitBlock(pt);
    if (hit) {
      selectBlock(hit.id);
      return;
    }
    if (newPlacement && newText.trim()) {
      stageNewText();
    }
    deselectAll();
  };

  const onCanvasDoubleClick = (e) => {
    if (disabled || saving) return;
    const pt = relPoint(e);
    if (hitBlock(pt)) return;
    if (newPlacement && newText.trim()) {
      stageNewText();
    }
    setActiveId(null);
    setNewPlacement(pt);
    setNewText("");
    setNewPlacementBg(sampleImageBg(imgRef.current, {
      x: pt.x,
      y: pt.y,
      w: 0.2,
      h: 0.04,
    }));
  };

  const blockStyle = (block, value, mode) => {
    const fs = Math.max(8, block.font_size * scale);
    const pageH = pageDim?.height || 842;
    const boxH = block.rect_pct.h * pageH * scale;
    const baseW = block.rect_pct.w;
    const estW = Math.min(
      0.94 - block.rect_pct.x,
      Math.max(baseW, (value?.length || 0) * 0.0075 + 0.02),
    );
    const wPct = mode === "editing" ? estW : (mode === "preview" ? estW : baseW);
    const showText = mode !== "hit";

    return {
      left: `${block.rect_pct.x * 100}%`,
      top: `${block.rect_pct.y * 100}%`,
      width: `${wPct * 100}%`,
      height: `${block.rect_pct.h * 100}%`,
      fontSize: `${fs}px`,
      lineHeight: `${Math.max(boxH, fs * 1.15)}px`,
      fontFamily: block.font_family || "Helvetica, Arial, sans-serif",
      color: showText ? blockInk(block) : "transparent",
      backgroundColor: showText ? blockFill(block) : "transparent",
      padding: 0,
      margin: 0,
      boxSizing: "border-box",
    };
  };

  const overlayClass = (mode) => {
    const base = "absolute box-border overflow-visible whitespace-nowrap border-0 shadow-none outline-none cursor-text ";
    if (mode === "editing") return `${base}z-20`;
    if (mode === "preview") return `${base}z-[15]`;
    return `${base}z-10`;
  };

  const addOverlayStyle = (add) => {
    const fs = Math.max(8, (add.font_size || 12) * scale);
    const pageH = pageDim?.height || 842;
    const boxH = add.rect_pct.h * pageH * scale;
    return {
      left: `${add.rect_pct.x * 100}%`,
      top: `${add.rect_pct.y * 100}%`,
      width: `${add.rect_pct.w * 100}%`,
      height: `${add.rect_pct.h * 100}%`,
      fontSize: `${fs}px`,
      lineHeight: `${Math.max(boxH, fs * 1.15)}px`,
      fontFamily: add.font_family || "Helvetica, Arial, sans-serif",
      color: add.text_color_css || "rgb(15,23,42)",
      backgroundColor: add.bg_color_css || "rgb(255,255,255)",
    };
  };

  return (
    <div className="min-w-0 flex-1">
      {hasPendingChanges && (
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
          data-testid="pdf-text-save-bar"
        >
          <span className="text-sm text-amber-900">Unsaved text changes</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={discardChanges}
              data-testid="pdf-text-discard-btn"
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={saveAll}
              data-testid="pdf-text-save-btn"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      )}

      <div
        ref={canvasRef}
        data-testid="pdf-editor-canvas"
        className={`relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] ${
          disabled ? "pointer-events-none opacity-70" : "cursor-text"
        }`}
        onClick={onCanvasClick}
        onDoubleClick={onCanvasDoubleClick}
      >
        {pageImageUrl ? (
          <img
            ref={imgRef}
            src={pageImageUrl}
            alt={`Page ${pageIndex + 1}`}
            className="block w-full select-none"
            draggable={false}
            onLoad={updateScale}
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center bg-[var(--c-paper-2)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--c-muted-fg)]" />
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" />
          </div>
        )}

        {!loading && pageImageUrl && blocks.map((block) => {
          const isActive = activeId === block.id;
          const isDirty = isBlockDirty(block);
          const value = blockText(block);
          const mode = isActive ? "editing" : (isDirty ? "preview" : "hit");
          const style = blockStyle(block, value, mode);

          if (isActive) {
            return (
              <textarea
                key={block.id}
                ref={editRef}
                rows={1}
                value={value}
                disabled={saving}
                data-testid={`pdf-text-block-${block.id}`}
                className={`${overlayClass("editing")} resize-none appearance-none caret-[var(--c-ink)]`}
                style={style}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => {
                  const closingId = block.id;
                  window.setTimeout(() => {
                    setActiveId((current) => (current === closingId ? null : current));
                  }, 0);
                }}
                onChange={(e) => {
                  recordEdit(block.id, e.target.value, block);
                }}
                onKeyDown={(e) => {
                  const isUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
                  const isRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && e.shiftKey;
                  if (isUndo || isRedo) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isUndo) undoEdit(block.id, block);
                    else redoEdit(block.id, block);
                    return;
                  }
                  if (e.key === "Escape") {
                    setDrafts((prev) => {
                      const next = { ...prev };
                      delete next[block.id];
                      return next;
                    });
                    setActiveId(null);
                  }
                }}
              />
            );
          }

          if (isDirty) {
            return (
              <div
                key={block.id}
                data-testid={`pdf-text-block-${block.id}`}
                className={overlayClass("preview")}
                style={style}
                aria-label={value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectBlock(block.id);
                }}
              >
                {value}
              </div>
            );
          }

          return (
            <div
              key={block.id}
              data-testid={`pdf-text-block-${block.id}`}
              className={overlayClass("hit")}
              style={style}
              aria-label={block.text}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectBlock(block.id);
              }}
            />
          );
        })}

        {!loading && pendingAdds.map((add) => (
          <div
            key={add.id}
            className={`${overlayClass("preview")} px-0`}
            style={addOverlayStyle(add)}
            data-testid={`pdf-text-pending-${add.id}`}
          >
            {add.text}
          </div>
        ))}

        {newPlacement && (
          <input
            autoFocus
            type="text"
            value={newText}
            placeholder=""
            data-testid="pdf-text-new-input"
            className="absolute z-30 box-border appearance-none border-0 px-0 py-0 shadow-none outline-none caret-[var(--c-ink)]"
            style={{
              left: `${newPlacement.x * 100}%`,
              top: `${newPlacement.y * 100}%`,
              minWidth: "80px",
              fontSize: `${12 * scale}px`,
              lineHeight: `${Math.max(14, 12 * scale * 1.15)}px`,
              fontFamily: "Helvetica, Arial, sans-serif",
              color: "rgb(15,23,42)",
              backgroundColor: newPlacementBg || "rgb(255,255,255)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNewText(e.target.value)}
            onBlur={() => {
              if (newText.trim()) {
                stageNewText();
              } else {
                setNewPlacement(null);
                setNewText("");
                setNewPlacementBg(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNewPlacement(null);
                setNewText("");
                setNewPlacementBg(null);
              }
            }}
          />
        )}
      </div>

      <p className="mt-2 text-center text-xs text-[var(--c-muted-fg)]">
        {blocks.length > 0
          ? "Click any text to edit inline — no boxes, just type. Save changes when you are finished."
          : "No editable text on this page. Double-click empty space to add text, then Save changes."}
      </p>
    </div>
  );
}