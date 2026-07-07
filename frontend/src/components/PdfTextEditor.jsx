import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Undo2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

/**
 * In-place PDF text editor, click lines to edit, switch freely, save explicitly.
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
  const editRef = useRef(null);
  const draftsRef = useRef({});
  /** Per-block undo/redo stacks (controlled inputs break native Cmd+Z). */
  const editHistoryRef = useRef({});

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [newPlacement, setNewPlacement] = useState(null);
  const [newText, setNewText] = useState("");
  const [pendingAdds, setPendingAdds] = useState([]);

  draftsRef.current = drafts;

  const updateScale = useCallback(() => {
    const img = canvasRef.current?.querySelector("img");
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

      // Block browser back shortcuts while editing (can jump to prepare/sign routes).
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
      },
    ]);
    setNewPlacement(null);
    setNewText("");
  };

  const discardChanges = () => {
    setDrafts({});
    setPendingAdds([]);
    setNewPlacement(null);
    setNewText("");
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
    const block = blocks.find((b) => b.id === blockId);
    if (block) ensureHistory(blockId, drafts[blockId] ?? block.text);
    setActiveId(blockId);
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
    setActiveId(null);
    setNewPlacement(pt);
    setNewText("");
  };

  /** Fixed box aligned to PDF span, grows while typing so extra words do not clip. */
  const blockStyle = (block, value, isActive) => {
    const fs = Math.max(8, block.font_size * scale);
    const pageH = pageDim?.height || 842;
    const boxH = block.rect_pct.h * pageH * scale;
    const baseW = block.rect_pct.w;
    const estW = Math.min(
      0.94 - block.rect_pct.x,
      Math.max(baseW, (value?.length || 0) * 0.0075 + 0.02),
    );
    return {
      left: `${block.rect_pct.x * 100}%`,
      top: `${block.rect_pct.y * 100}%`,
      width: `${(isActive ? estW : baseW) * 100}%`,
      height: `${block.rect_pct.h * 100}%`,
      fontSize: `${fs}px`,
      lineHeight: `${Math.max(boxH, fs * 1.1)}px`,
      fontFamily: block.font_family || "Helvetica, Arial, sans-serif",
      padding: 0,
      margin: 0,
      boxSizing: "border-box",
    };
  };

  const overlayClass = (isActive, isDirty) => {
    let cls = "absolute box-border overflow-visible whitespace-nowrap ";
    if (isActive) {
      cls += "z-20 border border-[var(--c-primary)] bg-white/90 text-[var(--c-ink)] ring-1 ring-[var(--c-primary)]/25 ";
    } else if (isDirty) {
      cls += "z-10 border border-amber-400/70 bg-transparent text-[var(--c-ink)] [text-shadow:0_0_4px_#fff,0_0_8px_#fff] ";
    } else {
      cls += "z-10 cursor-text border border-transparent bg-transparent text-transparent hover:border-[var(--c-primary)]/35 ";
    }
    return cls;
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
        className={`relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--c-border)] bg-white ${
          disabled ? "pointer-events-none opacity-70" : "cursor-text"
        }`}
        onClick={onCanvasClick}
      >
        {pageImageUrl ? (
          <img
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" />
          </div>
        )}

        {!loading && pageImageUrl && blocks.map((block) => {
          const isActive = activeId === block.id;
          const value = blockText(block);
          const dirty = isBlockDirty(block);
          const style = blockStyle(block, value, isActive);

          if (isActive) {
            return (
              <textarea
                key={block.id}
                ref={editRef}
                rows={1}
                value={value}
                disabled={saving}
                data-testid={`pdf-text-block-${block.id}`}
                className={`${overlayClass(true, dirty)} resize-none outline-none`}
                style={style}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
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

          return (
            <div
              key={block.id}
              data-testid={`pdf-text-block-${block.id}`}
              className={overlayClass(false, dirty)}
              style={style}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectBlock(block.id);
              }}
            >
              {value}
            </div>
          );
        })}

        {!loading && pendingAdds.map((add) => (
          <div
            key={add.id}
            className="absolute z-10 box-border overflow-hidden whitespace-nowrap border border-amber-400/80 bg-amber-50/95 text-[var(--c-ink)]"
            style={{
              left: `${add.rect_pct.x * 100}%`,
              top: `${add.rect_pct.y * 100}%`,
              width: `${add.rect_pct.w * 100}%`,
              height: `${add.rect_pct.h * 100}%`,
              fontSize: `${12 * scale}px`,
              lineHeight: `${add.rect_pct.h * 100}%`,
              fontFamily: add.font_family || "Helvetica, Arial, sans-serif",
            }}
          >
            {add.text}
          </div>
        ))}

        {newPlacement && (
          <div
            className="absolute z-30 box-border border-2 border-[var(--c-primary)] bg-white p-0 shadow-md"
            style={{
              left: `${newPlacement.x * 100}%`,
              top: `${newPlacement.y * 100}%`,
              minWidth: "140px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              value={newText}
              placeholder="Type new text…"
              className="w-full border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNewPlacement(null);
                  setNewText("");
                }
              }}
            />
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-[var(--c-muted-fg)]">
        {blocks.length > 0
          ? "Click text to edit in place. Cmd+Z undoes typing. Switch lines freely, press Save changes when done."
          : "No editable text on this page. Click empty space to add text, then Save changes."}
      </p>
    </div>
  );
}