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

function AppRoutes() {
  // Handle Emergent Google OAuth callback BEFORE any route/auth logic (race-safe).
  if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/sign/:token" element={<SignerFlow />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/new" element={<Protected><NewEnvelope /></Protected>} />
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
