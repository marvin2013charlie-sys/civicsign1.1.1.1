import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Loader2, ShieldCheck, PenLine, Fingerprint, KeyRound, Copy, Check, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, resendVerification, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tell the user *why* they landed back on login if it was an auto sign-out.
  useEffect(() => {
    if (params.get("reason") === "idle") {
      toast.info("You were signed out automatically after 10 minutes of inactivity.", { id: "idle-out" });
    }
  }, [params]);

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

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: "linear-gradient(160deg, var(--c-ink-solid) 0%, #0E2B27 55%, #10695F 130%)" }}>
        <Logo dark />
        <div>
          <h2 className="font-heading text-4xl font-bold leading-tight">Get legally binding signatures, fast.</h2>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><PenLine className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Drag-and-drop document preparation</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" style={{ color: "#7fe9dd" }} /> UK eIDAS & Electronic Communications Act 2000 aligned</p>
            <p className="flex items-center gap-3"><Fingerprint className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Tamper-evident audit trail on every doc</p>
          </div>
          <figure className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <blockquote className="text-sm leading-relaxed text-white/85">
              “We replaced our clunky old tool in a day. CivicSign is faster and our clients love how clean the signing page is.”
            </blockquote>
            <figcaption className="mt-3 text-xs font-semibold text-white/60">Maya Chen · COO, Northwind Studio</figcaption>
          </figure>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CivicSign</p>
      </div>

      {/* Form */}
      <div className="flex justify-center bg-[var(--c-paper)] px-5 py-10 sm:p-8 lg:h-dvh lg:overflow-y-auto">
        <div className="w-full max-w-md lg:my-auto">
          <div className="mb-8 flex justify-center lg:hidden"><Logo /></div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 shadow-xl shadow-black/[0.04]">
            <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Welcome back</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Sign in to your CivicSign account.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="mt-1 h-11" data-testid="login-email-input" />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={openForgot}
                    className="text-xs font-medium text-[var(--c-primary)] transition-colors hover:opacity-80"
                    data-testid="login-forgot-password">
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Input id="password" type={showPwd ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="h-11 pr-10" data-testid="login-password-input" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} tabIndex={-1}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors hover:text-[var(--c-ink)]"
                    data-testid="login-toggle-password">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full text-[15px] font-semibold" data-testid="login-submit-button"
                style={{ background: "var(--c-primary)", color: "#fff" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>

          </div>

          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            New to CivicSign? <Link to="/register" className="font-semibold text-[var(--c-primary)]">Create an account</Link>
          </p>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Protected by encryption &amp; rate limiting
          </p>
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
