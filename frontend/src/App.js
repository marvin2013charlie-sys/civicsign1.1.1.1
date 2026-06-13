import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import NewEnvelope from "@/pages/NewEnvelope";
import PrepareStudio from "@/pages/PrepareStudio";
import SendReview from "@/pages/SendReview";
import EnvelopeDetail from "@/pages/EnvelopeDetail";
import SignerFlow from "@/pages/SignerFlow";
import Templates from "@/pages/Templates";
import Settings from "@/pages/Settings";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import { AdminShell } from "@/components/AdminShell";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";
import AdminEnvelopes from "@/pages/admin/AdminEnvelopes";
import AdminContacts from "@/pages/admin/AdminContacts";
import AdminBilling from "@/pages/admin/AdminBilling";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Terms from "@/pages/Terms";
import CookiePolicy from "@/pages/CookiePolicy";

const FullLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]">
    <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
  </div>
);

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === null) return <FullLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminProtected({ children }) {
  const { user } = useAuth();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  // Handle Emergent Google OAuth callback BEFORE any route/auth logic (race-safe).
  if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/sign/:token" element={<SignerFlow />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/new" element={<Protected><NewEnvelope /></Protected>} />
      <Route path="/templates" element={<Protected><Templates /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminProtected><AdminShell /></AdminProtected>}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="envelopes" element={<AdminEnvelopes />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="contacts" element={<AdminContacts />} />
      </Route>
      <Route path="/prepare/:id" element={<Protected><PrepareStudio /></Protected>} />
      <Route path="/send/:id" element={<Protected><SendReview /></Protected>} />
      <Route path="/envelope/:id" element={<Protected><EnvelopeDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
