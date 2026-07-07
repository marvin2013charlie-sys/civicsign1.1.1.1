import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { ADMIN_PANEL_SLIDES } from "@/data/adminPanelSlides";
import { AuthLayout } from "@/components/AuthLayout";
import { BrandAccent } from "@/components/BrandText";
import {
  AuthFormCard,
  AuthField,
  AuthTextInput,
  AuthPasswordInput,
} from "@/components/auth/AuthFormPrimitives";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Lock,
  ArrowRight,
  Users,
  ScrollText,
  KeyRound,
  Mail,
} from "lucide-react";

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const signingInRef = useRef(false);

  useEffect(() => {
    if (user === null || signingInRef.current) return;
    if (user.role === "admin" || user.role === "staff") {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;

    signingInRef.current = true;
    setLoading(true);
    try {
      if (user && user.role === "user") {
        await logout();
      }

      const data = await login(trimmedEmail, password);
      if (data?.user?.role === "admin" || data?.user?.role === "staff") {
        toast.success(
          data.user.role === "admin"
            ? "Welcome to the admin console"
            : "Welcome to the internal portal",
        );
        window.location.replace("/admin");
        return;
      }

      await logout();
      toast.error("This portal is for internal team members only.");
    } catch (err) {
      toast.error(formatApiError(err) || "Login failed");
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      showAssistant={false}
      panelMarquee
      panelReviews
      reviewSlides={ADMIN_PANEL_SLIDES}
      reviewsLabel="Internal safeguards"
      reviewShowStars={false}
      backTo="/"
      backLabel="Back to civicsign.com"
      panelBadge="Internal console"
      panelTitle={
        <>
          Run CivicSign <BrandAccent>behind the scenes</BrandAccent>.
        </>
      }
      panelSubtitle="Authorized admins and staff only. All access is logged and monitored."
      panelBullets={[
        { icon: Users, text: "User support, diagnostics & impersonation controls" },
        { icon: ScrollText, text: "Billing, refunds & immutable audit log" },
        { icon: KeyRound, text: "Role-based access for staff accounts" },
      ]}
    >
      <AuthFormCard
        testId="admin-login-card"
        title="Admin sign in"
        subtitle="Sign in with your internal team credentials."
        footer="Access restricted · Monitored · Audit-logged"
      >
        <form onSubmit={submit} className="mt-7 space-y-5">
          <AuthField id="admin-email" label="Work email" icon={Mail}>
            <AuthTextInput
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              icon={Mail}
              data-testid="admin-login-email"
            />
          </AuthField>

          <AuthField id="admin-password" label="Password">
            <AuthPasswordInput
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPwd}
              onToggle={() => setShowPwd((s) => !s)}
              placeholder="Enter your password"
              autoComplete="current-password"
              testId="admin-login-password"
              toggleTestId="admin-login-toggle-password"
            />
          </AuthField>

          <Button
            type="submit"
            disabled={loading}
            className="cs-auth-submit group"
            data-testid="admin-login-submit"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Sign in to console
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  );
}