import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { PDF_OPTIONS } from "@/lib/pdf";
import { publicApi, formatApiError, fetchPublicPdfBlobUrl, API_ORIGIN } from "@/lib/api";
import { FIELD_TYPES, hexToRgba } from "@/lib/fields";
import { Logo } from "@/components/Logo";
import { BrandAccent } from "@/components/BrandText";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignatureModal } from "@/components/SignatureModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, CheckCircle2, Download, PenLine, ChevronRight,
  XCircle, Fingerprint,
} from "lucide-react";

// Lazy so react-pdf + pdf.js (~109 KB gzip) don't block the signer shell.
// Recipients see the branded page and consent immediately; the PDF streams in.
const SignerPdfDocument = React.lazy(() => import(/* webpackPrefetch: true */ "@/components/SignerPdfDocument"));

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
  const [authVerified, setAuthVerified] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [authPostcode, setAuthPostcode] = useState("");
  const [authSending, setAuthSending] = useState(false);
  const [authVerifying, setAuthVerifying] = useState(false);
  const [savedSig, setSavedSig] = useState(null);
  const fieldRefs = useRef({});
  const identityFrame = useRef(null);
  useEffect(() => () => identityFrame.current?.close(), []);

  const loadPdf = useCallback(async (cancelledRef) => {
    const url = await fetchPublicPdfBlobUrl(`/sign/${token}/file`);
    if (cancelledRef.current) {
      URL.revokeObjectURL(url);
      return;
    }
    setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const cancelledRef = { current: false };
    const todayStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: d } = await publicApi.get(`/sign/${token}`);
        if (cancelled) return;
        setData(d);
        setAuthVerified(!!d.auth_verified || !d.auth_required);
        const init = {};
        d.fields.forEach((f) => {
          if (f.value != null) init[f.field_id] = f.value;
          else if (f.editable && f.type === "date") init[f.field_id] = todayStr;
        });
        setValues(init);
        if (d.completed) setDone("completed");
        else if (d.already_signed) setDone("signed");
        else if (d.signable && (!d.auth_required || d.auth_verified)) {
          try {
            const { data: vault } = await publicApi.get(`/sign/${token}/saved-signature`);
            if (!cancelled && vault?.signature?.signature_data) setSavedSig(vault.signature);
          } catch { /* optional */ }
          await loadPdf(cancelledRef);
        }
      } catch (err) {
        if (cancelled) return;
        setError(formatApiError(err) || "This signing link is invalid or has expired.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, [token, loadPdf]);
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

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

  // Convert a picked file to a base64 data URL for image-style fields.
  const handleFilePick = (fieldId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setValues((p) => ({ ...p, [fieldId]: reader.result }));
    reader.onerror = () => toast.error("Couldn't read that file");
    reader.readAsDataURL(file);
  };

  const goNext = () => {
    const next = editableFields.find((f) => !isFilled(f));
    if (next && fieldRefs.current[next.field_id]) {
      fieldRefs.current[next.field_id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const applySignature = async (dataUrl, saveForReuse = false) => {
    setValues((p) => ({ ...p, [sigModal.fieldId]: dataUrl }));
    setSigModal({ open: false, fieldId: null });
    if (saveForReuse && dataUrl) {
      try {
        await publicApi.put(`/sign/${token}/saved-signature`, {
          signature_data: dataUrl,
          signature_type: "drawn",
        });
        setSavedSig({ signature_data: dataUrl, signature_type: "drawn" });
      } catch { /* non-fatal */ }
    }
  };

  const submit = async () => {
    if (!consented) { toast.error("Please accept the electronic signature consent first"); return; }
    if (!allFilled) { toast.error("Please complete all required fields"); goNext(); return; }
    setSubmitting(true);
    try {
      const payload = {
        consent: true,
        signer_name: data.recipient.name,
        values: editableFields.map((f) => ({ field_id: f.field_id, value: values[f.field_id] ?? null })),
      };
      const { data: res } = await publicApi.post(`/sign/${token}/submit`, payload);
      setDone(res.status === "completed" ? "completed" : "signed");
      toast.success(res.message || "Signature recorded");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const sendAuthCode = async () => {
    setAuthSending(true);
    try {
      const { data: res } = await publicApi.post(`/sign/${token}/auth/send-code`);
      toast.success(res.message || "Verification code sent");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAuthSending(false);
    }
  };

  const startIdentity = async () => {
    setAuthVerifying(true);
    try {
      const { data: result } = await publicApi.post(`/sign/${token}/identity/start`, { consent: true });
      if (result.url) {
        const target = new URL(result.url);
        if (target.protocol !== "https:" || target.username || target.password ||
          !["veriff.com", "veriff.me"].some((host) => target.hostname === host || target.hostname.endsWith(`.${host}`))) {
          throw new Error("Invalid verification address");
        }
        const { createVeriffFrame, MESSAGES } = await import("@veriff/incontext-sdk");
        identityFrame.current?.close();
        identityFrame.current = createVeriffFrame({
          url: target.href,
          onEvent: (event) => {
            if (event === MESSAGES.FINISHED) {
              toast.info("Documents submitted. Check the verification result when processing finishes.");
            }
          },
        });
      } else {
        toast.info("Check your verification result below. If it is processing, try again shortly.");
      }
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setAuthVerifying(false); }
  };

  const verifyAuth = async () => {
    setAuthVerifying(true);
    try {
      const payload = data.auth_method === "sms"
        ? { code: authCode }
        : { postcode: authPostcode };
      if (data.auth_method === "identity") {
        const { data: result } = await publicApi.post(`/sign/${token}/identity/status`);
        if (!result.verified) {
          toast.info(result.message || "Verification is not complete. Complete the ID check, then check again.");
          return;
        }
      } else {
        await publicApi.post(`/sign/${token}/auth/verify`, payload);
      }
      setAuthVerified(true);
      toast.success("Identity verified, you can continue to sign");
      if (data?.signable && !blobUrl) {
        try {
          await loadPdf({ current: false });
        } catch (err) {
          toast.error(formatApiError(err) || "Could not load document");
        }
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAuthVerifying(false);
    }
  };

  const decline = async () => {
    try {
      await publicApi.post(`/sign/${token}/decline`, { reason: declineReason });
      setDeclineOpen(false);
      setDone("declined");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const downloadCompleted = async () => {
    try {
      const url = await fetchPublicPdfBlobUrl(`/sign/${token}/completed`);
      const a = document.createElement("a");
      a.href = url; a.download = `${data.title}-completed.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download not available yet"); }
  };

  // ---- screens ----
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]"><Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" /></div>;

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--c-paper)] p-6 text-center">
      <Logo /><XCircle className="h-12 w-12 text-red-500" />
      <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">Signing link <BrandAccent>unavailable</BrandAccent></h1>
      <p className="max-w-sm text-sm text-[var(--c-muted-fg)]">{error}</p>
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
          {declined ? (
            <>You declined to <BrandAccent>sign</BrandAccent></>
          ) : completed ? (
            <>All done, <BrandAccent>fully executed</BrandAccent>!</>
          ) : (
            <>Thank you for <BrandAccent>signing</BrandAccent>!</>
          )}
        </h1>
        <p className="max-w-md text-sm text-[var(--c-muted-fg)]">
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
        <Logo />
        <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">Waiting on other <BrandAccent>signers</BrandAccent></h1>
        <p className="max-w-sm text-sm text-[var(--c-muted-fg)]">This document is being signed in order. We&apos;ll email you when it&apos;s your turn.</p>
      </div>
    );
  }

  const pages = data.document.pages || [];
  const brand = data.sender_branding;
  const primary = brand?.primary_color || null;
  const accent = brand?.accent_color || primary;
  const logoSrc = brand?.logo_url?.startsWith("/")
    ? `${API_ORIGIN}${brand.logo_url}`
    : brand?.logo_url;

  return (
    <div className="min-h-screen bg-[var(--c-paper)]">
      {brand?.banner_text && (
        <div className="px-4 py-2 text-center text-sm font-medium text-white" style={{ background: primary || "var(--c-primary)" }} data-testid="signer-brand-banner">
          {brand.banner_text}
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--c-border)] bg-[var(--card)] px-3 sm:h-16 sm:gap-3 sm:px-6">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-8 max-w-[8rem] object-contain" data-testid="signer-brand-logo" />
        ) : (
          <Logo />
        )}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {started && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-[var(--c-muted-fg)]">{completedCount} of {requiredEditable.length} complete</span>
              <Button variant="outline" size="sm" onClick={goNext} data-testid="signer-next-button">Next field <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
            </div>
          )}
          <Button variant="ghost" size="sm" className="px-2 text-red-600 sm:px-3" onClick={() => setDeclineOpen(true)} data-testid="signer-decline-button">Decline</Button>
          <Button onClick={submit} disabled={submitting || !started} data-testid="signer-finish-button" style={{ background: primary || "var(--c-primary)", color: "#fff" }} className="px-3 sm:px-4">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" /> : <PenLine className="h-4 w-4 sm:mr-1.5" />}
            <span className="ml-1 hidden sm:inline">Finish & Sign</span>
            <span className="ml-1 sm:hidden">Sign</span>
          </Button>
        </div>
      </header>

      {/* Identity verification (Business plan) */}
      {!started && data.auth_required && !authVerified && (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6" data-testid="signer-auth-gate">
            <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">Verify your <BrandAccent>identity</BrandAccent></h1>
            <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
              {data.sender_name} requires {data.auth_method === "identity" ? "photo ID and selfie verification" : data.auth_method === "sms" ? "SMS" : "knowledge-based"} authentication before you can sign.
            </p>
            {data.auth_method === "identity" ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[var(--c-muted-fg)]">Have your passport or photocard driving licence ready. Your full name must match the name on the signing request. Veriff will collect your ID and selfie securely in this page; CivicSign records the verification result, not your ID images.</p>
                <p className="text-sm text-[var(--c-muted-fg)]">Review Veriff’s identity-verification terms and privacy information before submitting your documents. If you cannot complete the check, contact the sender for assistance.</p>
                <Button onClick={startIdentity} disabled={authVerifying} data-testid="signer-start-identity">Start ID verification</Button>
              </div>
            ) : data.auth_method === "sms" ? (
              <div className="mt-4 space-y-3">
                {data.auth_phone_hint && (
                  <p className="text-sm text-[var(--c-muted-fg)]">Code will be sent to {data.auth_phone_hint}</p>
                )}
                <Button variant="outline" onClick={sendAuthCode} disabled={authSending} data-testid="signer-send-code">
                  {authSending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Send verification code
                </Button>
                <input
                  className="h-10 w-full rounded-md border border-[var(--c-border)] px-3 text-sm"
                  placeholder="6-digit code" value={authCode} onChange={(e) => setAuthCode(e.target.value)}
                  data-testid="signer-auth-code"
                />
              </div>
            ) : (
              <div className="mt-4">
                <input
                  className="h-10 w-full rounded-md border border-[var(--c-border)] px-3 text-sm uppercase"
                  placeholder="Postcode on file" value={authPostcode} onChange={(e) => setAuthPostcode(e.target.value)}
                  data-testid="signer-auth-postcode"
                />
              </div>
            )}
            <Button className="mt-5 w-full" onClick={verifyAuth} disabled={authVerifying}
              data-testid="signer-verify-auth" style={{ background: primary || "var(--c-primary)", color: "#fff" }}>
              {authVerifying && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {data.auth_method === "identity" ? "Check verification result" : "Verify & continue"}
            </Button>
          </div>
        </div>
      )}

      {/* Consent gate */}
      {!started && (!data.auth_required || authVerified) && (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6">
            <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">{data.title}</h1>
            <p className="mt-1 text-sm text-[var(--c-muted-fg)]"><b>{data.sender_name}</b> has requested your <BrandAccent>signature</BrandAccent>.</p>
            {data.message && <p className="mt-3 rounded-lg border-l-4 bg-[var(--c-paper-2)] p-3 text-sm text-[var(--c-ink)]" style={{ borderColor: accent || "var(--c-primary)" }}>“{data.message}”</p>}
            {data.signature_level && data.signature_level !== "basic" && (
              <p
                className="mt-3 inline-flex rounded-full bg-[var(--status-sent-bg)] px-3 py-1 text-xs font-medium text-[var(--c-ink)]"
                data-testid={`${data.signature_level}-badge`}
              >
                {data.signature_level === "ses" && "Simple Electronic Signature (SES), UK eIDAS Art. 3(11)"}
                {data.signature_level === "aes" && "Advanced Electronic Signature (AES), UK eIDAS Art. 26"}
                {data.signature_level === "qes" && "Qualified Electronic Signature (QES), UK eIDAS Art. 3(12)"}
              </p>
            )}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-paper)] p-4">
              <Checkbox id="consent" checked={consented} onCheckedChange={(v) => setConsented(!!v)} data-testid="consent-checkbox" className="mt-0.5" />
              <label htmlFor="consent" className="text-sm text-[var(--c-ink)]">
                I agree to use electronic records and signatures, and I consent to conduct this transaction electronically in accordance with the UK Electronic Communications Act 2000 and the UK eIDAS Regulation. I understand my actions are legally binding.
              </label>
            </div>
            <Button className="mt-5 w-full" disabled={!consented} onClick={() => setStarted(true)} data-testid="consent-continue-button" style={{ background: primary || "var(--c-primary)", color: "#fff" }}>
              Review & start signing
            </Button>
          </div>
        </div>
      )}

      {/* Document */}
      {started && (
        <div className="flex flex-col items-center px-2 py-6">
          {data.sign_only && (
            <div
              className="mb-4 w-full max-w-[760px] rounded-lg border border-[var(--c-border)] bg-[var(--status-sent-bg)] px-4 py-3 text-sm text-[var(--c-ink)]"
              data-testid="signer-sign-only-notice"
            >
              This document was uploaded from Word. You can add your signature only — the document text cannot be edited.
            </div>
          )}
          <div className="mb-4 flex w-full max-w-[760px] items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--card)] px-3 py-2 sm:hidden">
            <span className="text-xs text-[var(--c-muted-fg)]">{completedCount}/{requiredEditable.length} done</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={goNext}>Next</Button>
          </div>
          {blobUrl && (
            <React.Suspense fallback={<Loader2 className="mt-10 h-8 w-8 animate-spin text-[var(--c-primary)]" />}>
              <SignerPdfDocument
                file={blobUrl}
                options={PDF_OPTIONS}
                pages={pages}
                pageWidth={pageWidth}
                renderPageFields={(i) => {
                  const pageFields = data.fields.filter((f) => f.page === i);
                  return pageFields.map((f) => {
                        const px = { left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` };
                        const color = f.recipient_color || "#14B8A6";
                        const fontSize = "clamp(9px, 2.8vw, 13px)";
                        const v = values[f.field_id];
                        const filled = f.type === "checkbox" ? v === true : v != null && v !== "";

                        if (!f.editable) {
                          const isImg = typeof v === "string" && v.startsWith("data:image");
                          return (
                            <div key={f.field_id} className="cs-field" style={{ ...px, borderColor: color, background: hexToRgba(color, 0.08), color, borderStyle: "solid", opacity: 0.85 }}>
                              {filled && isImg ? <img src={v} alt="field" className="max-h-full max-w-full object-contain" />
                                : filled && f.type === "checkbox" ? <CheckCircle2 className="h-3 w-3" />
                                : filled ? <span className="truncate px-1" style={{ fontSize }}>{v}</span>
                                : <span className="truncate px-1 text-[10px] opacity-70">{FIELD_TYPES[f.type]?.label}</span>}
                            </div>
                          );
                        }

                        // editable
                        const ref = (el) => { fieldRefs.current[f.field_id] = el; };
                        const meta = FIELD_TYPES[f.type] || FIELD_TYPES.text;

                        if (meta.input === "signature") {
                          return (
                            <div key={f.field_id} ref={ref} data-testid="signer-field" onClick={() => setSigModal({ open: true, fieldId: f.field_id })}
                              className="cs-field animate-pulse-none" style={{ ...px, borderColor: color, background: hexToRgba(color, filled ? 0.04 : 0.16), color, cursor: "pointer", boxShadow: `0 0 0 1.5px ${color}` }}>
                              {filled ? <img src={v} alt="signature" className="max-h-full max-w-full object-contain" />
                                : <span className="flex items-center gap-1" style={{ fontSize: Math.max(9, Math.min(13, fontSize)) }}><PenLine className="h-3 w-3" /> {meta.label}</span>}
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
                        if (meta.input === "image") {
                          // Stamp / Image / Attachment, open a file picker
                          const Icon = meta.icon || PenLine;
                          return (
                            <label key={f.field_id} ref={ref} data-testid="signer-field"
                              className="cs-field cursor-pointer overflow-hidden"
                              style={{ ...px, borderColor: color, background: hexToRgba(color, filled ? 0.04 : 0.14), color, boxShadow: `0 0 0 1.5px ${color}` }}>
                              <input type="file" accept={f.type === "attachment" ? "image/*,application/pdf" : "image/*"} className="hidden"
                                onChange={(e) => handleFilePick(f.field_id, e.target.files?.[0])} />
                              {filled && typeof v === "string" && v.startsWith("data:image")
                                ? <img src={v} alt={meta.label} className="max-h-full max-w-full object-contain" />
                                : <span className="flex items-center gap-1 truncate px-1" style={{ fontSize: Math.max(9, Math.min(13, fontSize)) }}>
                                    <Icon className="h-3 w-3" /> {filled ? "Replace" : meta.label}
                                  </span>}
                            </label>
                          );
                        }
                        if (meta.input === "select" && f.options?.length) {
                          return (
                            <select key={f.field_id} ref={ref} data-testid="signer-field"
                              value={v || ""} onChange={(e) => setValues((p) => ({ ...p, [f.field_id]: e.target.value }))}
                              className="cs-field bg-white px-1 outline-none"
                              style={{ ...px, borderColor: color, background: hexToRgba(color, 0.06), color: "#122120", fontSize, boxShadow: `0 0 0 1.5px ${color}` }}>
                              <option value="">Select…</option>
                              {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          );
                        }
                        if (meta.input === "select") {
                          return (
                            <input key={f.field_id} ref={ref} data-testid="signer-field"
                              value={v || ""} onChange={(e) => setValues((p) => ({ ...p, [f.field_id]: e.target.value }))}
                              placeholder={f.type === "dropdown" ? "Select / type" : "Choose / type"}
                              className="cs-field bg-white px-1 outline-none"
                              style={{ ...px, borderColor: color, background: hexToRgba(color, 0.06), color: "#122120", fontSize, boxShadow: `0 0 0 1.5px ${color}` }} />
                          );
                        }
                        // text / date / fullname / email / company / jobtitle / signdate
                        return (
                          <input key={f.field_id} ref={ref} data-testid="signer-field"
                            value={v || ""} onChange={(e) => setValues((p) => ({ ...p, [f.field_id]: e.target.value }))}
                            placeholder={meta.label}
                            className="cs-field bg-white px-1 outline-none"
                            style={{ ...px, borderColor: color, background: hexToRgba(color, 0.06), color: "#122120", fontSize, boxShadow: `0 0 0 1.5px ${color}` }} />
                        );
                  });
                }}
              />
            </React.Suspense>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--c-muted-fg)]"><Fingerprint className="h-3.5 w-3.5" /> Secured & timestamped by CivicSign</div>
        </div>
      )}

      <SignatureModal open={sigModal.open} onOpenChange={(o) => setSigModal((s) => ({ ...s, open: o }))}
        onApply={applySignature} defaultName={data?.recipient?.name} savedSignature={savedSig?.signature_data} />

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Decline to sign</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--c-muted-fg)]">Let the sender know why you&apos;re declining (optional).</p>
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
