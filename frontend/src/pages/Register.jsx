import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import { AuthPortalNav } from "@/components/AuthPortalNav";
import {
  AuthFormCard,
  AuthField,
  AuthTextInput,
  AuthPasswordInput,
  PasswordStrengthMeter,
} from "@/components/auth/AuthFormPrimitives";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import { getAuthNext, nextQueryString, persistAuthNext, clearAuthNext } from "@/lib/authPortal";
import {
  Loader2,
  Link2,
  PenLine,
  Fingerprint,
  User,
  Mail,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { requestProductTour } from "@/lib/productTour";

const PWD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "1 capital letter", test: (p) => /[A-Z]/.test(p) },
  { label: "1 number", test: (p) => /\d/.test(p) },
  { label: "1 special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const FREE_PERKS = [
  "2 documents per month (resets on your signup date)",
  "Unlimited signers",
  "Audit trail included",
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = getAuthNext(params);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("next")) persistAuthNext(params.get("next"));
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    const pwdError = validatePassword(password);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }
    setLoading(true);
    try {
      const data = await register(name, email, password);
      if (data?.verification_required) {
        sessionStorage.setItem("cs_verify_email", data.email || email);
        if (data.dev_code) sessionStorage.setItem("cs_verify_dev_code", data.dev_code);
        if (data.dev_mode) sessionStorage.setItem("cs_verify_dev_mode", "1");
        toast.success(
          data.dev_mode
            ? "Account created — your verification code is on the next screen."
            : "Almost there — check your email for a verification code.",
        );
        navigate(`/verify-email${nextQueryString(next)}`, {
          state: { email: data.email, dev_code: data.dev_code, dev_mode: data.dev_mode },
        });
      } else {
        requestProductTour("app");
        clearAuthNext();
        navigate(next || "/dashboard", { replace: true });
      }
    } catch (err) {
      toast.error(formatApiError(err) || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      showAssistant={false}
      panelMarquee
      panelReviews
      panelTitle={
        <>
          Start sending in <BrandAccent>minutes</BrandAccent>.
        </>
      }
      panelBullets={[
        { icon: PenLine, text: "Unlimited fields & recipients on every envelope" },
        { icon: Link2, text: "Secure tokenized signing links, no account needed for signers" },
        { icon: Fingerprint, text: "Certificate of Completion on every finished document" },
      ]}
    >
      <AuthFormCard
        testId="register-card"
        showLogo
        nav={<AuthPortalNav active="register" />}
        badge="Free plan · No card required"
        title="Create your account"
        subtitle="Join teams across the UK who send contracts, offers, and agreements with CivicSign."
        footer={
          <>
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--c-accent)" }} />
            Most teams send their first envelope in under 3 minutes
          </>
        }
      >
        <form onSubmit={submit} className="mt-7 space-y-5">
          <AuthField id="name" label="Full name" icon={User}>
            <AuthTextInput
              id="name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Rivera"
              icon={User}
              data-testid="register-name-input"
            />
          </AuthField>

          <AuthField id="email" label="Work email" icon={Mail}>
            <AuthTextInput
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              icon={Mail}
              data-testid="register-email-input"
            />
          </AuthField>

          <AuthField id="password" label="Password" hint="Use a strong password you don't reuse elsewhere.">
            <AuthPasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPwd}
              onToggle={() => setShowPwd((s) => !s)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              testId="register-password-input"
              toggleTestId="register-toggle-password"
            />
            <PasswordStrengthMeter password={password} rules={PWD_RULES} />
          </AuthField>

          <div className="flex flex-wrap gap-2">
            {FREE_PERKS.map((perk) => (
              <span key={perk} className="cs-auth-benefit-chip">
                <CheckCircle2 className="h-3 w-3" style={{ color: "var(--c-primary)" }} />
                {perk}
              </span>
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="cs-auth-submit group"
            data-testid="register-submit-button"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-[var(--c-muted-fg)]">
          By creating an account you agree to our{" "}
          <Link to="/legal/terms" className="font-medium underline-offset-2 hover:text-[var(--c-ink)] hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/legal/privacy" className="font-medium underline-offset-2 hover:text-[var(--c-ink)] hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/legal/refunds" className="font-medium underline-offset-2 hover:text-[var(--c-ink)] hover:underline">
            Refund Policy
          </Link>
          .
        </p>
      </AuthFormCard>
    </AuthLayout>
  );
}