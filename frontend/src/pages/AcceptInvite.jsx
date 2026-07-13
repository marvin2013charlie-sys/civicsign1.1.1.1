import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import {
  AuthFormCard,
  AuthField,
  AuthTextInput,
  AuthPasswordInput,
  PasswordStrengthMeter,
} from "@/components/auth/AuthFormPrimitives";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { validatePassword } from "@/lib/password";
import { authQueryString } from "@/lib/authPortal";
import {
  Loader2,
  Building2,
  CircleCheck,
  CircleAlert,
  ArrowRight,
  Mail,
  User,
} from "lucide-react";

const PWD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "1 capital letter", test: (p) => /[A-Z]/.test(p) },
  { label: "1 number", test: (p) => /\d/.test(p) },
  { label: "1 special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const token = params.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState(null);
  const [invalid, setInvalid] = useState(null);
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const returnPath = token ? `/accept-invite?token=${encodeURIComponent(token)}` : "/accept-invite";
  const authReady = user !== null;
  const loggedInMatch = authReady && user && user !== false && info
    && user.email?.toLowerCase() === info.email?.toLowerCase();

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!token) {
        setInvalid("This invitation link is missing its token.");
        setChecking(false);
        return;
      }
      try {
        const { data } = await api.get("/org/invite-info", { params: { token } });
        if (active) {
          setInfo(data);
          setName(data.name || "");
        }
      } catch (err) {
        if (active) setInvalid(formatApiError(err) || "This invitation link is invalid.");
      } finally {
        if (active) setChecking(false);
      }
    };
    check();
    return () => { active = false; };
  }, [token]);

  const accept = async (e) => {
    e?.preventDefault?.();
    const payload = { token };
    if (info?.requires_registration) {
      if (!name.trim() || name.trim().length < 2) {
        toast.error("Enter your full name");
        return;
      }
      const pwdError = validatePassword(pwd);
      if (pwdError) {
        toast.error(pwdError);
        return;
      }
      if (pwd !== confirm) {
        toast.error("Passwords do not match");
        return;
      }
      payload.name = name.trim();
      payload.password = pwd;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/org/accept-invite", payload);
      if (data.access_token) setSession(data.user, data.access_token);
      else setSession(data.user);
      setDone(true);
      toast.success(`Welcome to ${info?.org_name || "your organisation"}`);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <AuthLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
        </div>
      </AuthLayout>
    );
  }

  if (invalid) {
    return (
      <AuthLayout>
        <AuthFormCard className="max-w-md">
          <div className="text-center">
            <CircleAlert className="mx-auto h-10 w-10 text-amber-600" />
            <h1 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">Invitation unavailable</h1>
            <p className="mt-2 text-sm text-[var(--c-muted-fg)]">{invalid}</p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </div>
        </AuthFormCard>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <AuthFormCard className="max-w-md text-center">
          <CircleCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 font-heading text-xl font-bold text-[var(--c-ink)]">You&apos;re in!</h1>
          <p className="mt-2 text-sm text-[var(--c-muted-fg)]">
            Taking you to your dashboard…
          </p>
        </AuthFormCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthFormCard className="max-w-md" data-testid="accept-invite-page">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--c-primary)]/15">
            <Building2 className="h-6 w-6 text-[var(--c-primary)]" />
          </span>
          <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--c-ink)]">
            Join <BrandAccent>{info?.org_name}</BrandAccent>
          </h1>
          <p className="mt-2 text-sm text-[var(--c-muted-fg)]">
            {info?.invited_by
              ? `${info.invited_by} invited you to collaborate on CivicSign.`
              : "You've been invited to join your organisation on CivicSign."}
          </p>
        </div>

        {authReady && info?.requires_login && !loggedInMatch ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[var(--c-muted-fg)]">
              Sign in as <span className="font-medium text-[var(--c-ink)]">{info.email}</span> to accept this invitation.
            </p>
            <Button asChild style={{ background: "var(--c-primary)", color: "#fff" }}>
              <Link to={`/login${authQueryString({ next: returnPath, email: info.email })}`}>
                Sign in to accept <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : !authReady ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" />
          </div>
        ) : (
          <form onSubmit={accept} className="space-y-4">
            <AuthField id="invite-email" label="Work email" icon={Mail}>
              <AuthTextInput id="invite-email" icon={Mail} value={info?.email || ""} readOnly disabled />
            </AuthField>

            {info?.requires_registration ? (
              <>
                <AuthField id="invite-name" label="Your name" icon={User}>
                  <AuthTextInput
                    id="invite-name"
                    icon={User}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    data-testid="accept-invite-name"
                  />
                </AuthField>
                <AuthField id="invite-password" label="Choose a password" icon={User}>
                  <AuthPasswordInput
                    id="invite-password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    show={showPwd}
                    onToggle={() => setShowPwd(!showPwd)}
                    autoComplete="new-password"
                    testId="accept-invite-password"
                  />
                  <PasswordStrengthMeter password={pwd} rules={PWD_RULES} />
                </AuthField>
                <AuthField id="invite-confirm" label="Confirm password">
                  <AuthPasswordInput
                    id="invite-confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    show={showPwd}
                    onToggle={() => setShowPwd(!showPwd)}
                    autoComplete="new-password"
                  />
                </AuthField>
              </>
            ) : (
              <p className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-3 py-2 text-sm text-[var(--c-muted-fg)]">
                Signed in as <span className="font-medium text-[var(--c-ink)]">{user?.email}</span>.
                Accept to join your organisation workspace.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={saving}
              data-testid="accept-invite-submit"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Accept invitation
            </Button>
          </form>
        )}
      </AuthFormCard>
    </AuthLayout>
  );
}