import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Loader2, MailCheck, ShieldCheck, RefreshCw, Fingerprint } from "lucide-react";

export default function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const [email] = useState(state.email || "");
  const [devCode, setDevCode] = useState(state.dev_code || "");
  const [devMode, setDevMode] = useState(state.dev_mode || false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // If someone lands here directly without an email in state, send them to sign up.
  useEffect(() => {
    if (!email) navigate("/register", { replace: true });
  }, [email, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) { toast.error("Enter the 6-digit code"); return; }
    setVerifying(true);
    try {
      await verifyEmail(email, code.trim());
      toast.success("Email verified — welcome to CivicSign!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Verification failed");
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
      toast.success("A new code is on its way.");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-[var(--c-ink-solid)] p-10 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="font-heading text-4xl font-bold leading-tight">One quick step to secure your account.</h2>
          <p className="mt-4 max-w-sm text-white/70">We sent a 6-digit verification code to your email. Enter it to activate your CivicSign account — this is a one-time step.</p>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Verified accounts keep your documents secure</p>
            <p className="flex items-center gap-3"><Fingerprint className="h-5 w-5" style={{ color: "#7fe9dd" }} /> After this, just sign in with email & password</p>
          </div>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CivicSign</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-[var(--c-paper)] p-6">
        <div className="w-full max-w-sm" data-testid="verify-email-card">
          <div className="mb-8 lg:hidden"><Logo /></div>

          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
            <MailCheck className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
          </span>
          <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--c-ink)]">Verify your email</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Enter the code we sent to <span className="font-semibold text-[var(--c-ink)]" data-testid="verify-email-address">{email}</span>
          </p>

          {devMode && devCode && (
            <div className="mt-4 rounded-lg border border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] p-4 text-center" data-testid="verify-dev-code">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Dev mode — email not configured</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-[var(--c-ink)]">{devCode}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Use this code below to continue</p>
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
            <Button type="submit" disabled={verifying || code.trim().length < 6} className="w-full" data-testid="verify-submit-button"
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

          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Wrong email? <Link to="/register" className="font-semibold text-[var(--c-primary)]">Start over</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
