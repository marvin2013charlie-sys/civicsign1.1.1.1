import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Lock, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--c-ink)] px-4 py-10">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--c-primary)" }} aria-hidden="true" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--c-primary)" }}>
            <ShieldCheck className="h-7 w-7 text-white" />
          </span>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-white">
            CIVIC<span style={{ color: "var(--c-primary)" }}>SIGN</span> Admin
          </h1>
          <p className="mt-1 text-sm text-white/50">Internal console — authorized team members only</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur" data-testid="admin-login-card">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="admin-email" className="text-white/80">Work email</Label>
              <Input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@civicsign.com" autoComplete="username"
                className="mt-1 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[var(--c-primary)]"
                data-testid="admin-login-email" />
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-white/80">Password</Label>
              <Input id="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="mt-1 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[var(--c-primary)]"
                data-testid="admin-login-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="admin-login-submit"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Lock className="mr-1.5 h-4 w-4" /> Sign in to console</>)}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-white/30">
            Access is restricted and monitored. Unauthorized use is prohibited.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-white/40">
          <ArrowLeft className="h-3.5 w-3.5" />
          <Link to="/" className="transition-colors hover:text-white/70" data-testid="admin-login-back-home">Back to civicsign.com</Link>
        </div>
      </div>
    </div>
  );
}
