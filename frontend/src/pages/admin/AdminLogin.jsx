import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { AuthPasswordInput } from "@/components/auth/AuthFormPrimitives";
import { Logo } from "@/components/Logo";
import { Loader2, ArrowLeft, ShieldCheck, Lock } from "lucide-react";

/* Admin login — dark console card for internal staff (admin / staff roles). */

const darkInput =
  "w-full rounded-xl border bg-white/[0.06] px-4 py-3.5 text-[14.5px] text-[#F8F7F2] outline-none transition-all placeholder:text-white/30 focus:border-[#2DD4BF] focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]";

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
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--c-paper)]">
      <div className="cs-auth-form-glow cs-auth-form-glow-a" aria-hidden />
      <div className="cs-auth-form-glow cs-auth-form-glow-b" aria-hidden />

      {/* top bar — matches customer auth pages */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-3 sm:px-8 lg:px-10">
        <Logo to="/" />
        <div className="flex items-center gap-2">
          <span className="cs-auth-topbar-chip hidden sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--c-primary)" }} />
            Internal team only
          </span>
          <Link
            to="/"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--c-muted-fg)] transition-colors hover:border-[var(--c-primary)] hover:text-[var(--c-ink)]"
            data-testid="auth-back-link"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Back to civicsign.com</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </div>

      {/* console card */}
      <div className="relative z-[1] flex flex-1 items-start justify-center px-4 pb-14 pt-6 sm:items-center sm:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/[0.06]"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 34px 80px rgba(18,33,32,.35), 0 0 0 1px rgba(255,255,255,.04) inset" }}
          data-testid="admin-login-card"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(560px 340px at 85% -10%, rgba(45,212,191,.16), transparent), radial-gradient(460px 300px at 0% 110%, rgba(255,122,92,.12), transparent)",
            }}
          />

          {/* console title bar */}
          <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4 sm:px-7">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
                style={{ background: "rgba(45,212,191,.14)" }}
              >
                <ShieldCheck className="h-4 w-4" style={{ color: "#2DD4BF" }} />
              </span>
              <div>
                <div className="font-heading text-sm font-semibold text-[#F8F7F2]">
                  CivicSign Admin Console
                </div>
                <div className="font-mono text-[10.5px] text-white/45">internal team access</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-semibold tracking-[.5px]"
                style={{
                  background: "rgba(255,122,92,.14)",
                  borderColor: "rgba(255,122,92,.3)",
                  color: "#FF9B84",
                }}
              >
                RESTRICTED
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-semibold"
                style={{
                  background: "rgba(45,212,191,.1)",
                  borderColor: "rgba(45,212,191,.25)",
                  color: "#2DD4BF",
                }}
              >
                <span className="h-[7px] w-[7px] animate-pulse rounded-full" style={{ background: "#16A34A" }} />
                MONITORED
              </span>
            </div>
          </div>

          <div className="relative px-6 py-8 sm:px-10">
            <h1 className="font-heading text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[#F8F7F2] sm:text-[30px]">
              Staff sign in
              <span style={{ color: "#FF7A5C" }}>.</span>
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/50">
              Sign in with your CivicBot staff credentials. Customer accounts use the{" "}
              <Link to="/login" className="font-medium text-[#2DD4BF] underline-offset-2 hover:underline">
                main sign-in page
              </Link>
              .
            </p>

            <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-[12.5px] font-semibold text-white/75">
                  Staff email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicbot.co.uk"
                  autoComplete="username"
                  className={darkInput}
                  style={{ borderColor: "rgba(248,247,242,.16)" }}
                  data-testid="admin-login-email"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-[12.5px] font-semibold text-white/75">
                  Password
                </label>
                <AuthPasswordInput
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showPwd}
                  onToggle={() => setShowPwd((s) => !s)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  testId="admin-login-password"
                  toggleTestId="admin-login-toggle-password"
                  className={`${darkInput} cs-admin-dark-input`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex min-h-[48px] items-center justify-center rounded-[13px] text-[15px] font-semibold transition-all hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
                style={{ background: "#2DD4BF", color: "#122120", boxShadow: "0 10px 26px rgba(45,212,191,.3)" }}
                data-testid="admin-login-submit"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in to console →"}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-white/40">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Access restricted · Monitored · Audit-logged
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}