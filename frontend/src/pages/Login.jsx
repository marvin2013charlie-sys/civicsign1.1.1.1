import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Loader2, ShieldCheck, PenLine, Fingerprint, KeyRound, Copy, Check } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.4 12 .4A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 4.75 12 4.75z" />
    </svg>
  );
}

export default function Login() {
  const { login, resendVerification, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot-password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotResult, setForgotResult] = useState(null); // { dev_link, message }
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "";
      // Account exists but email isn't verified yet — route to verification.
      if (status === 403 && /verify your email/i.test(detail)) {
        try {
          const data = await resendVerification(email);
          toast.info("Please verify your email — we sent you a fresh code.");
          navigate("/verify-email", {
            state: { email, dev_code: data.dev_code, dev_mode: data.dev_mode },
          });
          return;
        } catch {
          navigate("/verify-email", { state: { email } });
          return;
        }
      }
      toast.error(formatApiError(detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setForgotEmail(email);
    setForgotResult(null);
    setCopied(false);
    setForgotOpen(true);
  };

  const sendForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Enter your email"); return; }
    setForgotSending(true);
    try {
      const data = await forgotPassword(forgotEmail);
      setForgotResult(data);
      toast.success(data.message || "If an account exists, a reset link is on its way.");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Could not send reset link");
    } finally {
      setForgotSending(false);
    }
  };

  const copyForgotLink = async () => {
    try {
      await navigator.clipboard.writeText(forgotResult.dev_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-[var(--c-ink)] p-10 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="font-heading text-4xl font-bold leading-tight">Get legally binding signatures, fast.</h2>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><PenLine className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Drag-and-drop document preparation</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" style={{ color: "#7fe9dd" }} /> UK eIDAS & Electronic Communications Act 2000 aligned</p>
            <p className="flex items-center gap-3"><Fingerprint className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Tamper-evident audit trail on every doc</p>
          </div>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CIVICSIGN</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-[var(--c-paper)] p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Sign in to CIVICSIGN</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Welcome back. Enter your details below.</p>

          <Button variant="outline" className="mt-6 w-full" onClick={handleGoogle} data-testid="login-google-button">
            <GoogleIcon /> <span className="ml-2">Continue with Google</span>
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--c-border)]" />
            <span className="text-xs text-[var(--muted-foreground)]">or</span>
            <div className="h-px flex-1 bg-[var(--c-border)]" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" className="mt-1" data-testid="login-email-input" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={openForgot}
                  className="text-xs font-medium text-[var(--c-primary)] transition-colors hover:opacity-80"
                  data-testid="login-forgot-password">
                  Forgot password?
                </button>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="mt-1" data-testid="login-password-input" />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="login-submit-button"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 rounded-lg border border-[var(--c-border)] bg-[var(--card)] p-3 text-xs text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--c-ink)]">Demo account:</span> demo@civicsign.com · Demo1234!
          </div>

          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            New to CIVICSIGN? <Link to="/register" className="font-semibold text-[var(--c-primary)]">Create an account</Link>
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-[var(--c-border)] pt-4 text-xs text-[var(--muted-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <Link to="/admin/login" className="font-medium transition-colors hover:text-[var(--c-ink)]" data-testid="login-admin-portal-link">
              Internal team? Admin sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent data-testid="forgot-password-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <KeyRound className="h-5 w-5" style={{ color: "var(--c-primary)" }} /> Reset your password
            </DialogTitle>
            <DialogDescription>
              Enter your account email to receive a secure link for setting a new password.
            </DialogDescription>
          </DialogHeader>

          {forgotResult ? (
            <div className="space-y-3" data-testid="forgot-password-result">
              <div className="rounded-lg border border-[var(--c-border)] bg-[var(--status-sent-bg)] p-3 text-sm text-[var(--c-ink)]">
                {forgotResult.message}
              </div>
              {forgotResult.dev_mode && forgotResult.dev_link && (
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Email is in skip-mode — open this link to reset your password:</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Input readOnly value={forgotResult.dev_link} className="font-mono text-xs" data-testid="forgot-dev-link" onFocus={(e) => e.target.select()} />
                    <Button size="sm" variant="outline" onClick={copyForgotLink} data-testid="forgot-copy-link">
                      {copied ? <Check className="h-4 w-4" style={{ color: "var(--c-primary)" }} /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <a href={forgotResult.dev_link} className="mt-2 inline-block text-sm font-semibold text-[var(--c-primary)]" data-testid="forgot-open-link">Open reset page</a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={sendForgot} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" required value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@company.com"
                  className="mt-1" data-testid="forgot-email-input" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} data-testid="forgot-cancel">Cancel</Button>
                <Button type="submit" disabled={forgotSending} data-testid="forgot-send-button"
                  style={{ background: "var(--c-primary)", color: "#fff" }}>
                  {forgotSending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Send reset link
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
