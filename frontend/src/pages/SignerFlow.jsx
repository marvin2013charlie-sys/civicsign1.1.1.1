import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { pdfjs, PDF_OPTIONS } from "@/lib/pdf"; // eslint-disable-line no-unused-vars
import api, { formatApiError, fetchPdfBlobUrl } from "@/lib/api";
import { FIELD_TYPES, hexToRgba } from "@/lib/fields";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignatureModal } from "@/components/SignatureModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, CheckCircle2, ShieldCheck, Download, PenLine, ChevronRight,
  XCircle, Fingerprint,
} from "lucide-react";

export default function SignerFlow() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consented, setConsented] = useState(false);
  const [started, setStarted] = useState(false);
  const [values, setValues] = useState({});
  const [pageWidth, setPageWidth] = useState(720);
  const [sigModal, setSigModal] = useState({ open: false, fieldId: null });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // 'signed' | 'completed'
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const fieldRefs = useRef({});

  const todayStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/sign/${token}`);
      setData(d);
      // init values
      const init = {};
      d.fields.forEach((f) => {
        if (f.value != null) init[f.field_id] = f.value;
        else if (f.editable && f.type === "date") init[f.field_id] = todayStr;
      });
      setValues(init);
      if (d.completed) setDone("completed");
      else if (d.already_signed) setDone("signed");
      const url = await fetchPdfBlobUrl(`/sign/${token}/file`);
      setBlobUrl(url);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || "This signing link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onResize = () => setPageWidth(Math.max(300, Math.min(760, window.innerWidth - 32)));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const editableFields = (data?.fields || []).filter((f) => f.editable);
  const requiredEditable = editableFields.filter((f) => f.required);
  const isFilled = (f) => {
    const v = values[f.field_id];
    if (f.type === "checkbox") return v === true;
    return v != null && v !== "";
  };
  const completedCount = requiredEditable.filter(isFilled).length;
  const allFilled = requiredEditable.every(isFilled);

  const goNext = () => {
    const next = editableFields.find((f) => !isFilled(f));
    if (next && fieldRefs.current[next.field_id]) {
      fieldRefs.current[next.field_id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const applySignature = (dataUrl) => {
    setValues((p) => ({ ...p, [sigModal.fieldId]: dataUrl }));
    setSigModal({ open: false, fieldId: null });
  };

  const submit = async () => {
    if (!allFilled) { toast.error("Please complete all required fields"); goNext(); return; }
    setSubmitting(true);
    try {
      const payload = {
        consent: true,
        signer_name: data.recipient.name,
        values: editableFields.map((f) => ({ field_id: f.field_id, value: values[f.field_id] ?? null })),
      };
      const { data: res } = await api.post(`/sign/${token}/submit`, payload);
      setDone(res.status === "completed" ? "completed" : "signed");
      toast.success(res.message || "Signature recorded");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async () => {
    try {
      await api.post(`/sign/${token}/decline`, { reason: declineReason });
      setDeclineOpen(false);
      setDone("declined");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const downloadCompleted = async () => {
    try {
      const url = await fetchPdfBlobUrl(`/sign/${token}/completed`);
      const a = document.createElement("a");
      a.href = url; a.download = `${data.title}-completed.pdf`; a.click();
    } catch { toast.error("Download not available yet"); }
  };

  // ---- screens ----
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div>;

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--c-paper)] p-6 text-center">
      <Logo /><XCircle className="h-12 w-12 text-red-500" />
      <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">Signing link unavailable</h1>
      <p className="max-w-sm text-sm text-[var(--muted-foreground)]">{error}</p>
    </div>
  );

  if (done) {
    const completed = done === "completed";
    const declined = done === "declined";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--c-paper)] p-6 text-center noise-overlay">
        <Logo />
        {declined ? <XCircle className="h-14 w-14 text-red-500" /> : <CheckCircle2 className="h-14 w-14" style={{ color: "var(--c-primary)" }} />}
        <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">
          {declined ? "You declined to sign" : completed ? "All done — fully executed!" : "Thank you for signing!"}
        </h1>
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">
          {declined ? "The sender has been notified that you declined this document."
            : completed ? "Every party has signed. A sealed PDF with a Certificate of Completion has been generated."
            : "Your signature has been recorded. You'll be notified once all parties have signed."}
        </p>
        {completed && (
          <Button onClick={downloadCompleted} data-testid="signer-download-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
            <Download className="mr-1.5 h-4 w-4" /> Download completed document
          </Button>
        )}
      </div>
    );
  }

  if (!data.signable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--c-paper)] p-6 text-center">
        <Logo /><ShieldCheck className="h-12 w-12" style={{ color: "var(--c-primary)" }} />
        <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">Waiting on other signers</h1>
        <p className="max-w-sm text-sm text-[var(--muted-foreground)]">This document is being signed in order. We'll email you when it's your turn.</p>
      </div>
    );
  }

  const pages = data.document.pages || [];

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--card)] px-4 sm:px-6">
        <Logo />
        <div className="ml-auto flex items-center gap-3">
          {started && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-[var(--muted-foreground)]">{completedCount} of {requiredEditable.length} complete</span>
              <Button variant="outline" size="sm" onClick={goNext} data-testid="signer-next-button">Next field <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
            </div>
          )}
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeclineOpen(true)} data-testid="signer-decline-button">Decline</Button>
          <Button onClick={submit} disabled={submitting || !started} data-testid="signer-finish-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PenLine className="mr-1.5 h-4 w-4" />} Finish & Sign
          </Button>
        </div>
      </header>

      {/* Consent gate */}
      {!started && (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6">
            <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">{data.title}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]"><b>{data.sender_name}</b> has requested your signature.</p>
            {data.message && <p className="mt-3 rounded-lg border-l-4 bg-[var(--c-paper-2)] p-3 text-sm text-[var(--c-ink)]" style={{ borderColor: "var(--c-primary)" }}>“{data.message}”</p>}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-4">
              <Checkbox id="consent" checked={consented} onCheckedChange={(v) => setConsented(!!v)} data-testid="consent-checkbox" className="mt-0.5" />
              <label htmlFor="consent" className="text-sm text-[var(--c-ink)]">
                I agree to use electronic records and signatures, and I consent to conduct this transaction electronically in accordance with the UK Electronic Communications Act 2000 and the UK eIDAS Regulation. I understand my actions are legally binding.
              </label>
            </div>
            <Button className="mt-5 w-full" disabled={!consented} onClick={() => setStarted(true)} data-testid="consent-continue-button" style={{ background: "var(--c-primary)", color: "#fff" }}>
              Review & start signing
            </Button>
          </div>
        </div>
      )}

      {/* Document */}
      {started && (
        <div className="flex flex-col items-center px-2 py-6">
          <div className="mb-4 flex w-full max-w-[760px] items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--card)] px-3 py-2 sm:hidden">
            <span className="text-xs text-[var(--muted-foreground)]">{completedCount}/{requiredEditable.length} done</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={goNext}>Next</Button>
          </div>
          {blobUrl && (
            <Document file={blobUrl} options={PDF_OPTIONS} loading={<Loader2 className="mt-10 h-8 w-8 animate-spin text-[var(--c-primary)]" />} error={<div className="mt-10 text-sm text-red-600">Failed to load document.</div>}>
              {pages.map((dim, i) => {
                const aspect = dim.height / dim.width;
                const h = pageWidth * aspect;
                const pageFields = data.fields.filter((f) => f.page === i);
                return (
                  <div key={i} className="relative mb-6 bg-white shadow-[0_6px_24px_rgba(15,23,32,0.12)]" style={{ width: pageWidth, height: h }}>
                    <Page pageNumber={i + 1} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false}
                      loading={<div style={{ height: h }} className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" /></div>} />
                    <div className="absolute inset-0">
                      {pageFields.map((f) => {
                        const px = { left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` };
                        const color = f.recipient_color || "#1FB8A6";
                        const fh = f.h * h;
                        const fontSize = Math.max(9, Math.min(16, fh * 0.6));
                        const v = values[f.field_id];
                        const filled = f.type === "checkbox" ? v === true : v != null && v !== "";

                        if (!f.editable) {
                          return (
                            <div key={f.field_id} className="cs-field" style={{ ...px, borderColor: color, background: hexToRgba(color, 0.08), color, borderStyle: "solid", opacity: 0.85 }}>
                              {filled && (f.type === "signature" || f.type === "initials") ? <img src={v} alt="sig" className="max-h-full max-w-full object-contain" />
                                : filled && f.type === "checkbox" ? <CheckCircle2 className="h-3 w-3" />
                                : filled ? <span className="truncate px-1" style={{ fontSize }}>{v}</span>
                                : <span className="truncate px-1 text-[10px] opacity-70">{FIELD_TYPES[f.type]?.label}</span>}
                            </div>
                          );
                        }

                        // editable
                        const ref = (el) => { fieldRefs.current[f.field_id] = el; };
                        if (f.type === "signature" || f.type === "initials") {
                          return (
                            <div key={f.field_id} ref={ref} data-testid="signer-field" onClick={() => setSigModal({ open: true, fieldId: f.field_id })}
                              className="cs-field animate-pulse-none" style={{ ...px, borderColor: color, background: hexToRgba(color, filled ? 0.04 : 0.16), color, cursor: "pointer", boxShadow: `0 0 0 1.5px ${color}` }}>
                              {filled ? <img src={v} alt="signature" className="max-h-full max-w-full object-contain" />
                                : <span className="flex items-center gap-1" style={{ fontSize: Math.max(9, Math.min(13, fontSize)) }}><PenLine className="h-3 w-3" /> {FIELD_TYPES[f.type].label}</span>}
                            </div>
                          );
                        }
                        if (f.type === "checkbox") {
                          return (
                            <div key={f.field_id} ref={ref} data-testid="signer-field" onClick={() => setValues((p) => ({ ...p, [f.field_id]: !v }))}
                              className="cs-field" style={{ ...px, borderColor: color, background: hexToRgba(color, v ? 0.25 : 0.1), color, cursor: "pointer", borderStyle: "solid" }}>
                              {v && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                          );
                        }
                        // text / date
                        return (
                          <input key={f.field_id} ref={ref} data-testid="signer-field"
                            value={v || ""} onChange={(e) => setValues((p) => ({ ...p, [f.field_id]: e.target.value }))}
                            placeholder={FIELD_TYPES[f.type]?.label}
                            className="cs-field bg-white px-1 outline-none"
                            style={{ ...px, borderColor: color, background: hexToRgba(color, 0.06), color: "#0F1720", fontSize, boxShadow: `0 0 0 1.5px ${color}` }} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Document>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Fingerprint className="h-3.5 w-3.5" /> Secured & timestamped by CIVICSIGN</div>
        </div>
      )}

      <SignatureModal open={sigModal.open} onOpenChange={(o) => setSigModal((s) => ({ ...s, open: o }))}
        onApply={applySignature} defaultName={data?.recipient?.name} />

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Decline to sign</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">Let the sender know why you're declining (optional).</p>
          <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={decline} data-testid="decline-confirm-button">Confirm decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
