import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, RotateCcw } from "lucide-react";

const TYPE_FONTS = [
  { key: "sig-allura", label: "Elegant", css: "'Allura', cursive" },
  { key: "sig-dancing", label: "Classic", css: "'Dancing Script', cursive" },
  { key: "sig-caveat", label: "Casual", css: "'Caveat', cursive" },
];

export const SignatureModal = ({ open, onOpenChange, onApply, defaultName = "", title = "Add your signature" }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typed, setTyped] = useState(defaultName);
  const [font, setFont] = useState(TYPE_FONTS[0]);
  const [uploaded, setUploaded] = useState(null);
  const [tab, setTab] = useState("draw");

  useEffect(() => {
    if (open) {
      setTyped(defaultName);
      setUploaded(null);
      setHasDrawn(false);
    }
  }, [open, defaultName]);

  // ---- Draw canvas ----
  const initCanvas = useCallback((node) => {
    canvasRef.current = node;
    if (node) {
      const ctx = node.getContext("2d");
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#14213d";
    }
  }, []);

  const pos = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: (t.clientX - rect.left) * (c.width / rect.width),
      y: (t.clientY - rect.top) * (c.height / rect.height),
    };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };
  const clearCanvas = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  // ---- Type -> PNG ----
  const renderTypedToDataUrl = async () => {
    await document.fonts.ready;
    const cvs = document.createElement("canvas");
    cvs.width = 600; cvs.height = 200;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = "#14213d";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `96px ${font.css}`;
    ctx.fillText(typed || "", cvs.width / 2, cvs.height / 2);
    return cvs.toDataURL("image/png");
  };

  const apply = async () => {
    let dataUrl = null;
    if (tab === "draw") {
      if (!hasDrawn) return;
      dataUrl = canvasRef.current.toDataURL("image/png");
    } else if (tab === "type") {
      if (!typed.trim()) return;
      dataUrl = await renderTypedToDataUrl();
    } else if (tab === "upload") {
      if (!uploaded) return;
      dataUrl = uploaded;
    }
    if (dataUrl) {
      onApply(dataUrl);
      onOpenChange(false);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setUploaded(reader.result);
    reader.readAsDataURL(f);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="signature-modal">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" data-testid="signature-tab-draw">Draw</TabsTrigger>
            <TabsTrigger value="type" data-testid="signature-tab-type">Type</TabsTrigger>
            <TabsTrigger value="upload" data-testid="signature-tab-upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="rounded-xl border border-[var(--c-border)] bg-white">
              <canvas
                ref={initCanvas}
                width={520}
                height={200}
                data-testid="signature-draw-canvas"
                className="h-[200px] w-full touch-none rounded-xl"
                style={{ cursor: "crosshair" }}
                onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                onTouchStart={start} onTouchMove={move} onTouchEnd={end}
              />
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearCanvas} data-testid="signature-clear-button">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4">
            <Label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Your name</Label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your full name"
              data-testid="signature-type-input"
              className="mt-1"
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {TYPE_FONTS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFont(f)}
                  className={`rounded-lg border px-2 py-3 text-center transition-colors ${
                    font.key === f.key ? "border-[var(--c-primary)] bg-[var(--status-sent-bg)]" : "border-[var(--c-border)] bg-white"
                  }`}
                >
                  <span style={{ fontFamily: f.css, fontSize: "26px", color: "#14213d" }}>
                    {(typed || "Signature").slice(0, 10)}
                  </span>
                  <span className="mt-1 block text-[10px] text-[var(--muted-foreground)]">{f.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex h-[120px] items-center justify-center rounded-xl border border-[var(--c-border)] bg-white">
              <span style={{ fontFamily: font.css, fontSize: "52px", color: "#14213d" }}>{typed || "Your Signature"}</span>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            {!uploaded ? (
              <label className="flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--c-border)] bg-white text-center">
                <Upload className="mb-2 h-6 w-6 text-[var(--c-primary)]" />
                <span className="text-sm font-medium text-[var(--c-ink)]">Upload signature image</span>
                <span className="text-xs text-[var(--muted-foreground)]">PNG with transparent background works best</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="signature-upload-input" />
              </label>
            ) : (
              <div className="relative flex h-[200px] items-center justify-center rounded-xl border border-[var(--c-border)] bg-white">
                <img src={uploaded} alt="signature" className="max-h-[160px] max-w-[90%] object-contain" />
                <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={() => setUploaded(null)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} data-testid="signature-apply-button"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            Apply signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
