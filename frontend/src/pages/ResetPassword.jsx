import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import {
  AuthFormCard,
  AuthField,
  AuthPasswordInput,
  PasswordStrengthMeter,
} from "@/components/auth/AuthFormPrimitives";
import api, { formatApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import {
  Loader2,
  KeyRound,
  Lock,
  CircleCheck,
  CircleAlert,
  ArrowRight,
  Clock,
} from "lucide-react";

const PWD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "1 capital letter", test: (p) => /[A-Z]/.test(p) },
  { label: "1 number", test: (p) => /\d/.test(p) },
  { label: "1 special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState(null);
  const [invalid, setInvalid] = useState(null);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!token) {
        setInvalid("This reset link is missing its token.");
        setChecking(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/reset-info", { params: { token } });
        if (active) setInfo(data);
      } catch (err) {
        if (active) {
          setInvalid(formatApiError(err) || "This reset link is invalid.");
        }
      } finally {
        if (active) setChecking(false);
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    const pwdError = validatePassword(pwd);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }
    if (pwd !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pwd });
      setDone(true);
      toast.success("Password reset successfully");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const cardMeta = (() => {
    if (checking) {
      return {
        icon: KeyRound,
        title: "Verifying your link",
        subtitle: "Hang tight, we're checking that your reset link is valid.",
      };
    }
    if (invalid) {
      return {
        icon: CircleAlert,
        iconDanger: true,
        title: "Link not valid",
        subtitle: invalid,
      };
    }
    if (done) {
      return {
        icon: CircleCheck,
        title: "Password updated",
        subtitle: "Your password has been changed. You can now sign in with your new password.",
      };
    }
    return {
      icon: Lock,
      title: "Set a new password",
      subtitle: (
        <>
          Choose a strong password for{" "}
          <span className="font-semibold text-[var(--c-ink)]" data-testid="reset-email">
            {info?.email}
          </span>
        </>
      ),
    };
  })();

  return (
    <AuthLayout
      showAssistant={false}
      panelMarquee
      panelReviews
      backTo="/login"
      backLabel="Back to sign in"
      panelTitle={
        <>
          Set a new <BrandAccent>password</BrandAccent>.
        </>
      }
      panelSubtitle="Choose a strong password to secure your CivicSign account. Reset links expire one hour after they're issued."
      panelBullets={[
        { icon: Lock, text: "Encrypted, tamper-evident workflows" },
        { icon: KeyRound, text: "One-time, single-use reset links" },
        { icon: Clock, text: "Links expire after 60 minutes for your security" },
      ]}
    >
      <AuthFormCard
        testId="reset-password-card"
        icon={cardMeta.icon}
        iconDanger={cardMeta.iconDanger}
        title={cardMeta.title}
        subtitle={cardMeta.subtitle}
        footer="Single-use links · Encrypted in transit"
      >
        {checking ? (
          <div
            className="flex items-center justify-center gap-2 py-10 text-[var(--c-muted-fg)]"
            data-testid="reset-checking"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Verifying your link…</span>
          </div>
        ) : invalid ? (
          <div className="mt-7 space-y-4" data-testid="reset-invalid">
            <p className="text-sm text-[var(--c-muted-fg)]">
              Request a new reset link and we'll send fresh instructions to your email.
            </p>
            <Link to="/forgot-password">
              <Button className="cs-auth-submit group" data-testid="reset-request-new">
                <span className="inline-flex items-center gap-2">
                  Request new reset link
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Button>
            </Link>
          </div>
        ) : done ? (
          <div className="mt-7" data-testid="reset-success">
            <div className="cs-auth-success-banner">
              You're all set, sign in with your new password.
            </div>
            <Button
              className="cs-auth-submit group mt-4"
              onClick={() => navigate("/login")}
              data-testid="reset-go-login"
            >
              <span className="inline-flex items-center gap-2">
                Go to sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <AuthField id="new-pwd" label="New password">
              <AuthPasswordInput
                id="new-pwd"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                show={showPwd}
                onToggle={() => setShowPwd((s) => !s)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                testId="reset-new-password"
                toggleTestId="reset-toggle-password"
              />
              <PasswordStrengthMeter password={pwd} rules={PWD_RULES} />
            </AuthField>

            <AuthField id="confirm-pwd" label="Confirm new password">
              <AuthPasswordInput
                id="confirm-pwd"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                show={showPwd}
                onToggle={() => setShowPwd((s) => !s)}
                placeholder="Repeat your new password"
                autoComplete="new-password"
                testId="reset-confirm-password"
                toggleTestId="reset-toggle-confirm-password"
              />
            </AuthField>

            <Button
              type="submit"
              disabled={saving}
              className="cs-auth-submit group"
              data-testid="reset-submit"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-2">
                  Reset password
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>
        )}
      </AuthFormCard>
    </AuthLayout>
  );
}