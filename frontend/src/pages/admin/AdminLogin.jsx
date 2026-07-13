import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { AuthPasswordInput } from "@/components/auth/AuthFormPrimitives";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

/* Admin login — implemented from the Claude Design "CivicSign Auth v3" spec:
   a single dark console card (RESTRICTED / MONITORED chips, staff credentials). */

const H_FONT = { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif" };

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
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(900px 460px at 15% -5%, rgba(45,212,191,.14), transparent), radial-gradient(700px 400px at 95% 105%, rgba(255,122,92,.1), transparent)" }}
      />

      {/* top bar */}
      <div className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[9px] text-[15px] font-bold text-white"
            style={{ ...H_FONT, background: "linear-gradient(135deg,#2DD4BF,#0D9488)", boxShadow: "0 3px 8px rgba(20,184,166,.35)" }}
          >C</span>
          <span className="text-[17px] font-semibold text-[var(--c-ink)]" style={H_FONT}>
            CivicSign<span style={{ color: "#2DD4BF" }}>.</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--c-muted-fg)] transition-colors hover:border-[var(--c-primary)] hover:text-[var(--c-ink)]"
          data-testid="auth-back-link"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to civicsign.com
        </Link>
      </div>

      {/* console card */}
      <div className="relative flex flex-1 items-start justify-center px-4 pb-14 pt-4 sm:items-center sm:pt-0">
        <div
          className="relative w-full max-w-[520px] overflow-hidden rounded-[28px]"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 34px 80px rgba(18,33,32,.35)" }}
          data-testid="admin-login-card"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(560px 340px at 85% -10%, rgba(45,212,191,.16), transparent), radial-gradient(460px 300px at 0% 110%, rgba(255,122,92,.12), transparent)" }}
          />

          {/* console title bar */}
          <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-7 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ background: "rgba(45,212,191,.14)" }}>
                <ShieldCheck className="h-4 w-4" style={{ color: "#2DD4BF" }} />
              </span>
              <div>
                <div className="text-sm font-semibold text-[#F8F7F2]" style={H_FONT}>CivicSign Admin Console</div>
                <div className="font-mono text-[10.5px] text-white/45">internal team access</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-semibold tracking-[.5px]"
                style={{ background: "rgba(255,122,92,.14)", borderColor: "rgba(255,122,92,.3)", color: "#FF9B84" }}
              >RESTRICTED</span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-semibold"
                style={{ background: "rgba(45,212,191,.1)", borderColor: "rgba(45,212,191,.25)", color: "#2DD4BF" }}
              >
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#16A34A" }} />
                MONITORED
              </span>
            </div>
          </div>

          <div className="relative px-7 py-8 sm:px-10">
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#F8F7F2]" style={H_FONT}>
              Staff sign in<span style={{ color: "#FF7A5C" }}>.</span>
            </h1>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <div>
                <div className="mb-1.5 text-[12.5px] font-semibold text-white/75">Staff email</div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicsign.co.uk"
                  autoComplete="username"
                  className={darkInput}
                  style={{ borderColor: "rgba(248,247,242,.16)" }}
                  data-testid="admin-login-email"
                />
              </div>

              <div>
                <div className="mb-1.5 text-[12.5px] font-semibold text-white/75">Password</div>
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
                className="mt-1 flex items-center justify-center rounded-[13px] py-3.5 text-[15px] font-semibold transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ background: "#2DD4BF", color: "#122120", boxShadow: "0 10px 26px rgba(45,212,191,.3)" }}
                data-testid="admin-login-submit"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in to console →"}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-white/40">
              🔒 Access restricted · Monitored · Audit-logged
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
