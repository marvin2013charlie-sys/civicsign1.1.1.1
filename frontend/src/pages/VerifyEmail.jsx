import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { getAuthNext, clearAuthNext, nextQueryString } from "@/lib/authPortal";
import { Loader2, MailCheck, Lock, RefreshCw, Fingerprint } from "lucide-react";
import { requestProductTour } from "@/lib/productTour";

export default function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const state = location.state || {};
  const storedEmail = sessionStorage.getItem("cs_verify_email") || "";
  const next = getAuthNext(params);

  const [email] = useState(state.email || storedEmail);
  const [devCode, setDevCode] = useState(state.dev_code || sessionStorage.getItem("cs_verify_dev_code") || "");
  const [devMode, setDevMode] = useState(state.dev_mode || sessionStorage.getItem("cs_verify_dev_mode") === "1");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (state.email) {
      sessionStorage.setItem("cs_verify_email", state.email);
      if (state.dev_code) sessionStorage.setItem("cs_verify_dev_code", state.dev_code);
      if (state.dev_mode) sessionStorage.setItem("cs_verify_dev_mode", "1");
    }
  }, [state.email, state.dev_code, state.dev_mode]);

  useEffect(() => {
    if (!email) navigate(`/register${nextQueryString(next)}`, { replace: true });
  }, [email, navigate, next]);

  const submit = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) { toast.error("Enter the 6-digit code"); return; }
    setVerifying(true);
    try {
      const data = await verifyEmail(email, code.trim());
      sessionStorage.removeItem("cs_verify_email");
      sessionStorage.removeItem("cs_verify_dev_code");
      sessionStorage.removeItem("cs_verify_dev_mode");
      requestProductTour("app", data?.user?.user_id);
      toast.success("Email verified, welcome to CivicSign!");
      const dest = next || "/dashboard";
      clearAuthNext();
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(formatApiError(err) || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const data = await resendVerification(email);
      setDevMode(data.dev_mode);
      setDevCode(data.dev_code || "");
      toast.success(
        data.dev_mode
          ? "New code generated — see it below."
          : "A new code has been sent to your email.",
      );
    } catch (err) {
      toast.error(formatApiError(err) || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      authContext="verify"
      panelMarquee
      panelTitle={<>One quick step to <BrandAccent>secure</BrandAccent> your account.</>}
      panelSubtitle={
        devMode
          ? "Enter the 6-digit verification code shown on this page to activate your account. No email is sent in local dev mode."
          : "Enter the 6-digit verification code we emailed you to activate your CivicSign account. This is a one-time step."
      }
      panelBullets={[
        { icon: Lock, text: "Verified accounts keep your documents secure" },
        { icon: Fingerprint, text: "After this, just sign in with email & password" },
      ]}
      backTo={`/login${nextQueryString(next)}`}
      backLabel="Back to sign in"
    >
      <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 shadow-xl shadow-black/[0.04]" data-testid="verify-email-card">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
          <MailCheck className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--c-ink)]">Verify your email</h1>
        <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
          {devMode ? (
            <>Verifying <span className="font-semibold text-[var(--c-ink)]" data-testid="verify-email-address">{email}</span></>
          ) : (
            <>Enter the code sent to <span className="font-semibold text-[var(--c-ink)]" data-testid="verify-email-address">{email}</span></>
          )}
        </p>

        {devMode && devCode && (
          <div className="mt-4 rounded-lg border-2 border-dashed p-4 text-center" style={{ borderColor: "var(--c-primary)", background: "var(--status-sent-bg)" }} data-testid="verify-dev-code">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>Your verification code</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-[var(--c-ink)]">{devCode}</p>
            <p className="mt-1 text-xs text-[var(--c-muted-fg)]">Email is not sent in dev mode — copy this code into the field below</p>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="mt-1 text-center font-mono text-lg tracking-[0.3em]"
              data-testid="verify-code-input"
            />
          </div>
          <Button type="submit" disabled={verifying || code.trim().length < 6} className="h-11 w-full" data-testid="verify-submit-button"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
          </Button>
        </form>

        <button onClick={resend} disabled={resending}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--c-primary)] transition-colors hover:opacity-80 disabled:opacity-50"
          data-testid="verify-resend-button">
          {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Resend code
        </button>

        <p className="mt-6 text-center text-sm text-[var(--c-muted-fg)]">
          Wrong email?{" "}
          <Link to={`/register${nextQueryString(next)}`} className="font-semibold text-[var(--c-primary)]">Start over</Link>
        </p>
      </div>
    </AuthLayout>
  );
}