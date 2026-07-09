import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Droplets, Loader2, Save, Upload } from "lucide-react";
import api, { fetchPdfBlobUrl, formatApiError, parseBlobApiError } from "@/lib/api";
import { handleQuotaApiError } from "@/lib/quota";
import { savePdfBlobToDocuments } from "@/lib/savePdfToDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FONTS = [
  { id: "helv", label: "Helvetica" },
  { id: "times", label: "Times New Roman" },
  { id: "cour", label: "Courier" },
];

const COLORS = [
  { id: "gray", rgb: [0.55, 0.55, 0.55], css: "#8c8c8c" },
  { id: "red", rgb: [0.86, 0.15, 0.15], css: "#dc2626" },
  { id: "blue", rgb: [0.15, 0.39, 0.92], css: "#2563eb" },
  { id: "black", rgb: [0.12, 0.16, 0.22], css: "#1f2937" },
];

export function PdfWatermarkPanel({ onBack, busy, setBusy, quotaHandlers }) {
  const [fileInfo, setFileInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [kind, setKind] = useState("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontName, setFontName] = useState("helv");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(35);
  const [rotation, setRotation] = useState(45);
  const [pageRange, setPageRange] = useState("all");
  const [colorId, setColorId] = useState("gray");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageScale, setImageScale] = useState(35);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [previewUrl, imagePreview]);

  const loadPreview = async (workspaceId) => {
    try {
      const url = await fetchPdfBlobUrl(`/pdf/workspace/${workspaceId}/page/0.png`);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      setPreviewUrl("");
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/pdf/workspace", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileInfo({
        workspace_id: data.workspace_id,
        filename: data.filename,
        page_count: data.page_count,
      });
      await loadPreview(data.workspace_id);
      toast.success("Document loaded — adjust watermark settings");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG, JPG, or WebP image");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setKind("image");
  };

  const buildWatermarkForm = () => {
    const color = COLORS.find((c) => c.id === colorId) || COLORS[0];
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("text", text.trim() || "CONFIDENTIAL");
    fd.append("font_name", fontName);
    fd.append("font_size", String(fontSize));
    fd.append("opacity", String(opacity / 100));
    fd.append("rotation", String(rotation));
    fd.append("position", "center");
    fd.append("page_range", pageRange.trim() || "all");
    fd.append("image_scale", String(imageScale / 100));
    fd.append("color_r", String(color.rgb[0]));
    fd.append("color_g", String(color.rgb[1]));
    fd.append("color_b", String(color.rgb[2]));
    if (kind === "image" && imageFile) {
      fd.append("image", imageFile);
    }
    return fd;
  };

  const runWatermark = async (mode) => {
    if (!fileInfo) return;
    if (kind === "image" && !imageFile) {
      toast.error("Upload a logo or image for the watermark");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(
        `/pdf/workspace/${fileInfo.workspace_id}/watermark`,
        buildWatermarkForm(),
        { responseType: "blob" },
      );
      const base = (fileInfo.filename || "document").replace(/\.pdf$/i, "");
      const filename = `${base}-watermarked.pdf`;
      if (mode === "download") {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Watermarked PDF downloaded");
      } else {
        await savePdfBlobToDocuments({
          blob: res.data,
          filename,
          title: `${base} (Watermarked)`,
          tool: "watermark",
          originalFilename: fileInfo.filename,
          quotaHandlers,
        });
        toast.success("Saved to Documents → From Manage PDF");
      }
    } catch (err) {
      if (!handleQuotaApiError(err, quotaHandlers || {})) {
        toast.error(err.message || await parseBlobApiError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFileInfo(null);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
    setImageFile(null);
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
    setKind("text");
    setText("CONFIDENTIAL");
    setPageRange("all");
  };

  const color = COLORS.find((c) => c.id === colorId) || COLORS[0];
  const fontFamily = fontName === "times" ? "Times New Roman, Times, serif"
    : fontName === "cour" ? "Courier New, Courier, monospace"
      : "Helvetica, Arial, sans-serif";

  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 sm:p-8">
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]"
        onClick={() => { reset(); onBack(); }}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: "var(--c-primary)18" }}
        >
          <Droplets className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--c-ink)]">Watermark PDF</h2>
          <p className="text-xs text-[var(--c-muted-fg)]">
            {fileInfo
              ? `${fileInfo.filename} · ${fileInfo.page_count} page${fileInfo.page_count === 1 ? "" : "s"}`
              : "Add text or image watermark to every page or a custom range"}
          </p>
        </div>
      </div>

      {!fileInfo ? (
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] py-12 transition-colors hover:border-[var(--c-primary)]">
          <Upload className="h-9 w-9 text-[var(--c-primary)]" />
          <span className="mt-3 text-sm font-medium text-[var(--c-ink)]">Choose PDF or DOCX</span>
          <input
            type="file"
            accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            data-testid="watermark-upload-input"
            onChange={onUpload}
          />
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            data-testid="watermark-upload-btn"
            style={{ background: "var(--c-primary)", color: "#fff" }}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              document.querySelector("[data-testid=watermark-upload-input]")?.click();
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Upload document
          </Button>
        </label>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,360px)] lg:items-start">
          <div className="relative min-w-0 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)]">
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="block w-full select-none" draggable={false} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {kind === "text" ? (
                    <span
                      className="whitespace-nowrap font-semibold select-none"
                      style={{
                        fontFamily,
                        fontSize: `${Math.max(14, fontSize * 0.22)}px`,
                        color: color.css,
                        opacity: opacity / 100,
                        transform: `rotate(${rotation}deg)`,
                      }}
                    >
                      {text || "CONFIDENTIAL"}
                    </span>
                  ) : imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Watermark preview"
                      className="max-w-[55%] object-contain"
                      style={{ opacity: opacity / 100, transform: `rotate(${rotation}deg)` }}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--c-muted-fg)]" />
              </div>
            )}
            <p className="border-t border-[var(--c-border)] px-2 py-1.5 text-center text-xs text-[var(--c-muted-fg)]">
              Page 1 preview
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={kind === "text" ? "default" : "outline"}
                className="w-full"
                data-testid="watermark-kind-text"
                onClick={() => setKind("text")}
                style={kind === "text" ? { background: "var(--c-primary)", color: "#fff" } : undefined}
              >
                Text
              </Button>
              <Button
                type="button"
                size="sm"
                variant={kind === "image" ? "default" : "outline"}
                className="w-full"
                data-testid="watermark-kind-image"
                onClick={() => setKind("image")}
                style={kind === "image" ? { background: "var(--c-primary)", color: "#fff" } : undefined}
              >
                Image
              </Button>
            </div>

            {kind === "text" ? (
              <>
                <div>
                  <Label htmlFor="wm-text">Watermark text</Label>
                  <Input
                    id="wm-text"
                    className="mt-1"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    data-testid="watermark-text-input"
                  />
                </div>
                <div>
                  <Label htmlFor="wm-font">Font</Label>
                  <select
                    id="wm-font"
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--card)] px-2 text-sm"
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    data-testid="watermark-font-select"
                  >
                    {FONTS.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <Label>Watermark image</Label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-5">
                  <span className="w-full truncate text-center text-sm text-[var(--c-muted-fg)]">
                    {imageFile ? imageFile.name : "PNG, JPG, or WebP (max 5 MB)"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      document.querySelector("[data-testid=watermark-image-input]")?.click();
                    }}
                  >
                    Choose image
                  </Button>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    data-testid="watermark-image-input"
                    onChange={onPickImage}
                  />
                </label>
              </div>
            )}

            <div>
              <Label>Font size / scale: {kind === "text" ? fontSize : `${imageScale}%`}</Label>
              <input
                type="range"
                min={kind === "text" ? 24 : 15}
                max={kind === "text" ? 96 : 60}
                value={kind === "text" ? fontSize : imageScale}
                onChange={(e) => (kind === "text"
                  ? setFontSize(Number(e.target.value))
                  : setImageScale(Number(e.target.value)))}
                className="mt-1 w-full"
                data-testid="watermark-size-slider"
              />
            </div>

            <div>
              <Label>Opacity: {opacity}%</Label>
              <input
                type="range"
                min={10}
                max={90}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-1 w-full"
                data-testid="watermark-opacity-slider"
              />
            </div>

            <div>
              <Label>Rotation: {rotation}°</Label>
              <input
                type="range"
                min={-90}
                max={90}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="mt-1 w-full"
                data-testid="watermark-rotation-slider"
              />
            </div>

            {kind === "text" && (
              <div className="flex flex-wrap gap-2" data-testid="watermark-colors">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.id}
                    onClick={() => setColorId(c.id)}
                    className={`h-7 w-7 rounded-full border-2 ${
                      colorId === c.id ? "border-[var(--c-ink)] scale-110" : "border-transparent"
                    }`}
                    style={{ background: c.css }}
                  />
                ))}
              </div>
            )}

            <div>
              <Label htmlFor="wm-pages">Pages (all or e.g. 1-2, 5)</Label>
              <Input
                id="wm-pages"
                className="mt-1"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="all"
                data-testid="watermark-page-range"
              />
            </div>

            <div className="mt-2 space-y-3 border-t border-[var(--c-border)] pt-4" data-testid="watermark-actions">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={reset}
                className="h-10 w-full"
                data-testid="watermark-change-file"
              >
                Change file
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => runWatermark("download")}
                  data-testid="watermark-download-btn"
                  className="h-10 w-full"
                  style={{ background: "var(--c-primary)", color: "#fff" }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => runWatermark("save")}
                  data-testid="watermark-save-documents-btn"
                  className="h-10 w-full px-2 text-xs sm:px-3 sm:text-sm"
                >
                  {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Save className="h-4 w-4 shrink-0" />}
                  <span className="truncate">Save to Documents</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}