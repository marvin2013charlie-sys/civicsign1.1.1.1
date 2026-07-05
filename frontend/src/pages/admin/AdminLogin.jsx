import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, ShieldCheck, Lock, ArrowLeft, Eye, EyeOff, Users, ScrollText,
} from "lucide-react";

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // If an admin or staff member is already signed in, jump to the console.
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "staff")) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.user?.role === "admin" || data?.user?.role === "staff") {
        toast.success(data.user.role === "admin" ? "Welcome to the admin console" : "Welcome to the internal portal");
        navigate("/admin", { replace: true });
      } else {
        // A valid but non-admin/staff account tried to use the internal portal.
        await logout();
        toast.error("This portal is for internal team members only.");
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: "linear-gradient(160deg, var(--c-ink-solid) 0%, #0E2B27 55%, #10695F 130%)" }}>
        <Logo dark />
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/70">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#7fe9dd" }} /> Internal console
          </span>
          <h2 className="mt-4 font-heading text-4xl font-bold leading-tight">Run CivicSign behind the scenes.</h2>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><Users className="h-5 w-5" style={{ color: "#7fe9dd" }} /> User support, diagnostics &amp; impersonation</p>
            <p className="flex items-center gap-3"><ScrollText className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Billing, refunds &amp; audit log</p>
            <p className="flex items-center gap-3"><Lock className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Role-based access for staff accounts</p>
          </div>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CivicSign · Access is restricted and monitored</p>
      </div>

      {/* Form */}
      <div className="flex justify-center bg-[var(--c-paper)] px-5 py-10 sm:p-8 lg:h-dvh lg:overflow-y-auto">
        <div className="w-full max-w-md lg:my-auto">
          <div className="mb-8 flex justify-center lg:hidden"><Logo /></div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 shadow-xl shadow-black/[0.04]" data-testid="admin-login-card">
            <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">
              CivicSign <span style={{ color: "var(--c-primary)" }}>Admin</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Authorized team members only.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="admin-email">Work email</Label>
                <Input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@civicbot.co.uk" autoComplete="username"
                  className="mt-1 h-11" data-testid="admin-login-email" />
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative mt-1">
                  <Input id="admin-password" type={showPwd ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    className="h-11 pr-10" data-testid="admin-login-password" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} tabIndex={-1}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors hover:text-[var(--c-ink)]"
                    data-testid="admin-login-toggle-password">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full text-[15px] font-semibold" data-testid="admin-login-submit"
                style={{ background: "var(--c-primary)", color: "#fff" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Lock className="mr-1.5 h-4 w-4" /> Sign in to console</>)}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              Access is restricted and monitored. Unauthorized use is prohibited.
            </p>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-[var(--muted-foreground)]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <Link to="/" className="transition-colors hover:text-[var(--c-ink)]" data-testid="admin-login-back-home">Back to civicsign.com</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
