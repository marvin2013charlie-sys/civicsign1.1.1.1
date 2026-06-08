import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Loader2, ShieldCheck, PenLine, Fingerprint } from "lucide-react";

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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
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

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-[var(--c-ink)] p-10 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="font-heading text-4xl font-bold leading-tight">Start sending in minutes.</h2>
          <div className="mt-8 space-y-4 text-white/80">
            <p className="flex items-center gap-3"><PenLine className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Unlimited fields & recipients</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Secure tokenized signing links</p>
            <p className="flex items-center gap-3"><Fingerprint className="h-5 w-5" style={{ color: "#7fe9dd" }} /> Certificate of Completion on every doc</p>
          </div>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} CIVICSIGN</p>
      </div>

      <div className="flex items-center justify-center bg-[var(--c-paper)] p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Create your account</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Free to start. No credit card required.</p>

          <Button variant="outline" className="mt-6 w-full" onClick={handleGoogle} data-testid="register-google-button">
            <GoogleIcon /> <span className="ml-2">Continue with Google</span>
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--c-border)]" />
            <span className="text-xs text-[var(--muted-foreground)]">or</span>
            <div className="h-px flex-1 bg-[var(--c-border)]" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Rivera" className="mt-1" data-testid="register-name-input" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" className="mt-1" data-testid="register-email-input" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters" className="mt-1" data-testid="register-password-input" />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="register-submit-button"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account? <Link to="/login" className="font-semibold text-[var(--c-primary)]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
