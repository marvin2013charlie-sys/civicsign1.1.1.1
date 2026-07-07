import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AuthFormCard,
  AuthField,
  AuthTextInput,
} from "@/components/auth/AuthFormPrimitives";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { getRememberedEmail, nextQueryString, getAuthNext } from "@/lib/authPortal";
import {
  Loader2,
  KeyRound,
  Lock,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  Mail,
  MailCheck,
  Clock,
} from "lucide-react";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [params] = useSearchParams();
  const next = getAuthNext(params);
  const loginHref = `/login${nextQueryString(next)}`;

  const [email, setEmail] = useState(params.get("email") || getRememberedEmail() || "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prefill = params.get("email");
    if (prefill) setEmail(prefill);
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }
    setSending(true);
    try {
      const data = await forgotPassword(email.trim());
      setResult(data);
      toast.success(data.message || "If an account exists, a reset link is on its way.");
    } catch (err) {
      toast.error(formatApiError(err) || "Could not send reset link");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    try {
      const ok = await copyToClipboard(result.dev_link);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Couldn't copy, select and copy manually");
      }
    } catch {
      toast.error("Couldn't copy, select and copy manually");
    }
  };

  return (
    <AuthLayout
      showAssistant={false}
      panelMarquee
      panelReviews
      backTo={loginHref}
      backLabel="Back to sign in"
      panelTitle={
        <>
          Reset your <BrandAccent>password</BrandAccent>.
        </>
      }
      panelSubtitle="We'll email you a secure, single-use link. Reset links expire one hour after they're issued."
      panelBullets={[
        { icon: Lock, text: "Encrypted account recovery" },
        { icon: KeyRound, text: "One-time, single-use reset links" },
        { icon: Clock, text: "Links expire after 60 minutes for your security" },
      ]}
    >
      <AuthFormCard
        testId="forgot-password-card"
        icon={result ? MailCheck : KeyRound}
        title={result ? "Check your inbox" : "Forgot your password?"}
        subtitle={
          result
            ? "If an account exists for that email, you'll receive reset instructions shortly."
            : "Enter the email on your CivicSign account and we'll send reset instructions."
        }
        footer="Single-use links · Encrypted in transit"
      >
        {result ? (
          <div className="mt-7 space-y-4" data-testid="forgot-password-result">
            <div className="cs-auth-success-banner">
              {result.message}
            </div>

            {result.dev_mode && result.dev_link && (
              <div className="cs-auth-dev-panel">
                <p className="text-xs font-medium text-[var(--c-muted-fg)]">
                  Email is in skip-mode, open this link to reset your password:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    readOnly
                    value={result.dev_link}
                    className="cs-auth-input h-10 flex-1 font-mono text-xs"
                    data-testid="forgot-dev-link"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 shrink-0 rounded-lg border-[var(--c-border)]"
                    onClick={copyLink}
                    data-testid="forgot-copy-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" style={{ color: "var(--c-primary)" }} />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <a
                  href={result.dev_link}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-primary)] hover:opacity-80"
                  data-testid="forgot-open-link"
                >
                  Open reset page
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            <Link to={loginHref}>
              <Button
                className="cs-auth-submit group mt-2"
                variant="outline"
                data-testid="forgot-back-login"
                style={{
                  background: "var(--card)",
                  color: "var(--c-ink)",
                  border: "1px solid var(--c-border)",
                  boxShadow: "none",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </span>
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <AuthField id="forgot-email" label="Work email" icon={Mail}>
              <AuthTextInput
                id="forgot-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                icon={Mail}
                data-testid="forgot-email-input"
              />
            </AuthField>

            <Button
              type="submit"
              disabled={sending}
              className="cs-auth-submit group"
              data-testid="forgot-send-button"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-2">
                  Send reset link
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