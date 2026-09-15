import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { AuthPasswordInput, AuthTextInput, AuthField } from "@/components/auth/AuthFormPrimitives";
import { Logo } from "@/components/Logo";
import { Loader2, ArrowLeft, ShieldCheck, Lock } from "lucide-react";

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const signingInRef = useRef(false);

  useEffect(() => {
    if (user === null || signingInRef.current) return;
    if (user.role === "admin" || user.role === "staff") {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;

    signingInRef.current = true;
    setLoading(true);
    try {
      if (user && user.role === "user") {
        await logout();
      }

      const data = await login(trimmedEmail, password);
      if (data?.user?.role === "admin" || data?.user?.role === "staff") {
        toast.success(
          data.user.role === "admin"
            ? "Welcome to the admin console"
            : "Welcome to the internal portal",
        );
        window.location.replace("/admin");
        return;
      }

      await logout();
      toast.error("This portal is for internal team members only.");
    } catch (err) {
      toast.error(formatApiError(err) || "Login failed");
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--c-paper)] text-[var(--c-ink)]">
      <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Logo to="/" />
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-[var(--c-muted-fg)] hover:text-[var(--c-ink)]" data-testid="auth-back-link">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to home
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-6 sm:pb-24">
        <section className="w-full max-w-[440px] rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-6 shadow-sm sm:p-8" data-testid="admin-login-card" aria-labelledby="admin-login-title">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--c-paper)] text-[var(--c-primary)]">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--c-muted-fg)]">CivicSign Admin</p>
          <h1 id="admin-login-title" className="font-heading text-3xl font-bold tracking-tight">Staff sign in</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--c-muted-fg)]">Use your staff account to access the admin console.</p>
          <form onSubmit={submit} className="mt-7 flex flex-col gap-5">
            <AuthField id="admin-email" label="Staff email">
              <AuthTextInput id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@civicbot.co.uk" autoComplete="username" data-testid="admin-login-email" />
            </AuthField>
            <AuthField id="admin-password" label="Password">
              <AuthPasswordInput id="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} show={showPwd} onToggle={() => setShowPwd((s) => !s)} placeholder="Enter your password" autoComplete="current-password" testId="admin-login-password" toggleTestId="admin-login-toggle-password" />
            </AuthField>
            <button type="submit" disabled={loading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--c-primary)] px-4 text-sm font-semibold text-[#122120] transition-colors hover:brightness-95 disabled:opacity-60" data-testid="admin-login-submit">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loading ? "Signing in…" : "Sign in to console"}
            </button>
          </form>
          <p className="mt-6 border-t border-[var(--c-border)] pt-5 text-center text-sm text-[var(--c-muted-fg)]">Customer account? <Link to="/login" className="font-semibold text-[var(--c-primary)] underline underline-offset-4">Sign in here</Link></p>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--c-muted-fg)]"><Lock className="h-3.5 w-3.5" aria-hidden /> Staff access only</p>
        </section>
      </main>
    </div>
  );
}
