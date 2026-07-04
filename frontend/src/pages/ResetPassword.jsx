import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import { Loader2, KeyRound, ShieldCheck, CircleCheck, CircleAlert } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState(null);     // { email, name }
  const [invalid, setInvalid] = useState(null); // error message string
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!token) { setInvalid("This reset link is missing its token."); setChecking(false); return; }
      try {
        const { data } = await api.get("/auth/reset-info", { params: { token } });
        if (active) setInfo(data);
      } catch (err) {
        if (active) setInvalid(formatApiError(err.response?.data?.detail) || "This reset link is invalid.");
      } finally {
        if (active) setChecking(false);
      }
    };
    check();
    return () => { active = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    const pwdError = validatePassword(pwd);
    if (pwdError) { toast.error(pwdError); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pwd });
      setDone(true);
      toast.success("Password reset successfully");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-[var(--c-ink-solid)] p-10 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="font-heading text-4xl font-bold leading-tight">Set a new password</h2>
          <p className="mt-4 max-w-sm text-white/70">Choose a strong password to secure your CivicSign account. Reset links expire one hour after they're issued.</p>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Encrypted, tamper-evident workflows</p>
            <p className="flex items-center gap-3"><KeyRound className="h-5 w-5" style={{ color: "#7fe9dd" }} /> One-time, single-use reset links</p>
          </div>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CivicSign</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-[var(--c-paper)] p-6">
        <div className="w-full max-w-sm" data-testid="reset-password-card">
          <div className="mb-8 lg:hidden"><Logo /></div>

          {checking ? (
            <div className="flex items-center justify-center py-16 text-[var(--muted-foreground)]" data-testid="reset-checking">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying your link…
            </div>
          ) : invalid ? (
            <div data-testid="reset-invalid">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#FEF2F2" }}>
                <CircleAlert className="h-6 w-6" style={{ color: "#DC2626" }} />
              </span>
              <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--c-ink)]">Link not valid</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{invalid}</p>
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">Please ask your administrator to generate a fresh reset link.</p>
              <Link to="/login">
                <Button className="mt-6 w-full" style={{ background: "var(--c-primary)", color: "#fff" }} data-testid="reset-back-to-login">Back to sign in</Button>
              </Link>
            </div>
          ) : done ? (
            <div data-testid="reset-success">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--status-sent-bg)" }}>
                <CircleCheck className="h-6 w-6" style={{ color: "var(--c-primary)" }} />
              </span>
              <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--c-ink)]">Password updated</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your password has been changed. You can now sign in with your new password.</p>
              <Button className="mt-6 w-full" style={{ background: "var(--c-primary)", color: "#fff" }}
                onClick={() => navigate("/login")} data-testid="reset-go-login">
                Go to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Reset your password</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                For <span className="font-semibold text-[var(--c-ink)]" data-testid="reset-email">{info?.email}</span>
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="new-pwd">New password</Label>
                  <Input id="new-pwd" type="password" required autoComplete="new-password" value={pwd}
                    onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" className="mt-1" data-testid="reset-new-password" />
                </div>
                <div>
                  <Label htmlFor="confirm-pwd">Confirm new password</Label>
                  <Input id="confirm-pwd" type="password" required autoComplete="new-password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="mt-1" data-testid="reset-confirm-password" />
                </div>
                <Button type="submit" disabled={saving} className="w-full" data-testid="reset-submit"
                  style={{ background: "var(--c-primary)", color: "#fff" }}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
                Remembered it? <Link to="/login" className="font-semibold text-[var(--c-primary)]">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
