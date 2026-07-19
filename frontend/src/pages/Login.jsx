import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import { AuthPortalNav } from "@/components/AuthPortalNav";
import {
  AuthFormCard,
  AuthField,
  AuthTextInput,
  AuthPasswordInput,
} from "@/components/auth/AuthFormPrimitives";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import {
  getAuthNext,
  getPostAuthDestination,
  getRememberedEmail,
  setRememberedEmail,
  clearAuthNext,
  persistAuthNext,
  nextQueryString,
  authQueryString,
} from "@/lib/authPortal";
import {
  Loader2,
  Scale,
  PenLine,
  Fingerprint,
  Mail,
  ArrowRight,
} from "lucide-react";

const REASON_MESSAGES = {
  idle: "You were signed out automatically after 10 minutes of inactivity.",
  session_expired: "Your session expired. Please sign in again to continue.",
};

export default function Login() {
  const { login, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const next = getAuthNext(params);

  const [email, setEmail] = useState(getRememberedEmail());
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!getRememberedEmail());
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("next")) persistAuthNext(params.get("next"));
  }, [params]);

  useEffect(() => {
    const reason = params.get("reason");
    if (reason && REASON_MESSAGES[reason]) {
      toast.info(REASON_MESSAGES[reason], { id: `login-reason-${reason}` });
    }
  }, [params]);

  const goAfterAuth = (signedInUser) => {
    const dest = getPostAuthDestination(next, signedInUser);
    clearAuthNext();
    navigate(dest, { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.user?.role === "admin" || data?.user?.role === "staff") {
        toast.info("Internal team accounts use the admin console.");
        goAfterAuth(data.user);
        return;
      }
      setRememberedEmail(email, remember);
      toast.success("Welcome back!");
      goAfterAuth(data.user);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "";
      if (status === 403 && /verify your email/i.test(String(detail))) {
        try {
          const data = await resendVerification(email);
          sessionStorage.setItem("cs_verify_email", email);
          if (data.dev_code) sessionStorage.setItem("cs_verify_dev_code", data.dev_code);
          if (data.dev_mode) sessionStorage.setItem("cs_verify_dev_mode", "1");
          toast.info(
            data.dev_mode
              ? "Please verify your email — your code is on the next screen."
              : "Please verify your email — we sent you a fresh code.",
          );
          navigate(`/verify-email${nextQueryString(next)}`, {
            state: { email, dev_code: data.dev_code, dev_mode: data.dev_mode },
          });
          return;
        } catch {
          navigate(`/verify-email${nextQueryString(next)}`, { state: { email } });
          return;
        }
      }
      toast.error(formatApiError(err) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      showAssistant={false}
      panelMarquee
      panelTitle={
        <>
          Get legally binding <BrandAccent>signatures</BrandAccent>
          <span className="cs-auth-title-dot">.</span>
        </>
      }
      panelBullets={[
        { icon: PenLine, text: "Drag-and-drop document preparation" },
        { icon: Scale, text: "UK eIDAS & Electronic Communications Act 2000 aligned" },
        { icon: Fingerprint, text: "Tamper-evident audit trail on every doc" },
      ]}
      panelQuote={{
        text: "We replaced our clunky old tool in a day. CivicSign is faster and our clients love how clean the signing page is.",
        attribution: "Maya Chen · COO, Northwind Studio",
      }}
    >
      <AuthFormCard
        testId="login-card"
        nav={<AuthPortalNav active="login" />}
        script="Good to see you again"
        title="Welcome back"
        titleDot="coral"
        subtitle="Sign in to send, track and seal your documents."
        footer="Protected by encryption & rate limiting"
      >
        <form onSubmit={submit} noValidate className="mt-7 space-y-5">
          <AuthField id="email" label="Work email" icon={Mail}>
            <AuthTextInput
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              icon={Mail}
              data-testid="login-email-input"
            />
          </AuthField>

          <AuthField
            id="password"
            label="Password"
            action={
              <Link
                to={`/forgot-password${authQueryString({ next, email })}`}
                className="text-xs font-semibold text-[var(--c-primary)] transition-opacity hover:opacity-80"
                data-testid="login-forgot-password"
              >
                Forgot password?
              </Link>
            }
          >
            <AuthPasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPwd}
              onToggle={() => setShowPwd((s) => !s)}
              placeholder="Enter your password"
              autoComplete="current-password"
              testId="login-password-input"
              toggleTestId="login-toggle-password"
            />
          </AuthField>

          <label
            htmlFor="remember"
            className="cs-auth-remember flex cursor-pointer items-center gap-3"
          >
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(!!v)}
              data-testid="login-remember-email"
            />
            <span className="text-sm text-[var(--c-muted-fg)]">
              Remember my email on this device
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="cs-auth-submit group"
            data-testid="login-submit-button"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  );
}