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

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
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

      <div className="flex items-start justify-center bg-[var(--c-paper)] px-5 py-8 sm:p-6 lg:items-center">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden"><Logo /></div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Create your account</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Free to start. No credit card required.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
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
