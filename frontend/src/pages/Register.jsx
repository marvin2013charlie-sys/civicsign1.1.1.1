import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import {
  Loader2, ShieldCheck, PenLine, Fingerprint, Eye, EyeOff, Check, Circle,
} from "lucide-react";

const PWD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "1 capital letter", test: (p) => /[A-Z]/.test(p) },
  { label: "1 number", test: (p) => /\d/.test(p) },
  { label: "1 special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const pwdError = validatePassword(password);
    if (pwdError) { toast.error(pwdError); return; }
    setLoading(true);
    try {
      const data = await register(name, email, password);
      if (data?.verification_required) {
        toast.success("Almost there — verify your email to finish.");
        navigate("/verify-email", {
          state: { email: data.email, dev_code: data.dev_code, dev_mode: data.dev_mode },
        });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Registration failed");
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
          <h2 className="font-heading text-4xl font-bold leading-tight">Start sending in minutes.</h2>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><PenLine className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Unlimited fields &amp; recipients</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Secure tokenized signing links</p>
            <p className="flex items-center gap-3"><Fingerprint className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Certificate of Completion on every doc</p>
          </div>
          <figure className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <blockquote className="text-sm leading-relaxed text-white/85">
              “Setup took minutes. Drag a few fields, hit send, done. Exactly what a small team needs.”
            </blockquote>
            <figcaption className="mt-3 text-xs font-semibold text-white/60">Sara Liang · Founder, Tertia</figcaption>
          </figure>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CivicSign</p>
      </div>

      {/* Form */}
      <div className="flex justify-center bg-[var(--c-paper)] px-5 py-10 sm:p-8 lg:h-dvh lg:overflow-y-auto">
        <div className="w-full max-w-md lg:my-auto">
          <div className="mb-8 flex justify-center lg:hidden"><Logo /></div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--card)] p-8 shadow-xl shadow-black/[0.04]">
            <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Create your account</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Free to start. No credit card required.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Rivera" className="mt-1 h-11" data-testid="register-name-input" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="mt-1 h-11" data-testid="register-email-input" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input id="password" type={showPwd ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password" className="h-11 pr-10" data-testid="register-password-input" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} tabIndex={-1}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors hover:text-[var(--c-ink)]"
                    data-testid="register-toggle-password">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5" data-testid="register-password-rules">
                  {PWD_RULES.map(({ label, test }) => {
                    const ok = test(password);
                    return (
                      <li key={label} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-[var(--c-primary)]" : "text-[var(--muted-foreground)]"}`}>
                        {ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-2 w-2 shrink-0 opacity-50" />}
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full text-[15px] font-semibold" data-testid="register-submit-button"
                style={{ background: "var(--c-primary)", color: "#fff" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="underline hover:text-[var(--c-ink)]">Terms</Link> and{" "}
              <Link to="/privacy" className="underline hover:text-[var(--c-ink)]">Privacy Policy</Link>.
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account? <Link to="/login" className="font-semibold text-[var(--c-primary)]">Sign in</Link>
          </p>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Protected by encryption &amp; rate limiting
          </p>
        </div>
      </div>
    </div>
  );
}
