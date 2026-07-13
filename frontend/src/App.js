import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { getPostAuthDestination } from "@/lib/authPortal";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AcceptInvite from "@/pages/AcceptInvite";
import Dashboard from "@/pages/Dashboard";
import NewEnvelope from "@/pages/NewEnvelope";
import Documents from "@/pages/Documents";

import Reports from "@/pages/Reports";
import Usage from "@/pages/Usage";
import OrganisationPortal from "@/pages/OrganisationPortal";
import PrepareStudio from "@/pages/PrepareStudio";
import SendReview from "@/pages/SendReview";
import EnvelopeDetail from "@/pages/EnvelopeDetail";
import SignerFlow from "@/pages/SignerFlow";
import Templates from "@/pages/Templates";
import ManagePdf from "@/pages/ManagePdf";
import ManagePdfProduct from "@/pages/ManagePdfProduct";
import Pricing from "@/pages/Pricing";
import Contacts from "@/pages/Contacts";
import PublicForm from "@/pages/PublicForm";
import Settings from "@/pages/Settings";
import ResetPassword from "@/pages/ResetPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import { AdminShell } from "@/components/AdminShell";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";


import AdminContacts from "@/pages/admin/AdminContacts";
import AdminBilling from "@/pages/admin/AdminBilling";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import AdminBlog from "@/pages/admin/AdminBlog";
import AdminTeam from "@/pages/admin/AdminTeam";
import AdminOrganizations from "@/pages/admin/AdminOrganizations";
import AdminCareers from "@/pages/admin/AdminCareers";
import StaffLanding from "@/pages/admin/StaffLanding";
import RequirePerm from "@/components/RequirePerm";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Careers from "@/pages/Careers";
import JobDetail from "@/pages/JobDetail";
import About from "@/pages/About";
import Solutions from "@/pages/Solutions";
import Contact from "@/pages/Contact";
import RealEstate from "@/pages/solutions/RealEstate";
import StaffingAgency from "@/pages/solutions/StaffingAgency";
import Legal from "@/pages/solutions/Legal";
import HR from "@/pages/solutions/HR";
import FinancialServices from "@/pages/solutions/FinancialServices";
import Healthcare from "@/pages/solutions/Healthcare";
import Charities from "@/pages/solutions/Charities";
import Construction from "@/pages/solutions/Construction";
import Education from "@/pages/solutions/Education";
import Sales from "@/pages/solutions/Sales";
import Freelancers from "@/pages/solutions/Freelancers";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Resources from "@/pages/Resources";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Terms from "@/pages/Terms";
import CookiePolicy from "@/pages/CookiePolicy";
import RefundPolicy from "@/pages/RefundPolicy";
import NotFound from "@/pages/NotFound";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SeoManager } from "@/components/SeoManager";


const FullLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]">
    <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
  </div>
);

function Protected({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <FullLoader />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  if (user === null) return <FullLoader />;
  if (user) {
    const dest = getPostAuthDestination(params.get("next"));
    return <Navigate to={dest} replace />;
  }
  return children;
}

function AdminProtected({ children }) {
  const { user } = useAuth();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin" && user.role !== "staff") {
    return <Navigate to="/admin/login" replace state={{ reason: "internal_only" }} />;
  }
  return children;
}

function AdminIndex() {
  // /admin -> Overview for super-admin, StaffLanding for staff.
  const { user } = useAuth();
  if (user?.role === "staff") return <StaffLanding />;
  return <AdminOverview />;
}

function IdleLogoutGuard() {
  // Auto-sign-out after 10 minutes of inactivity (only fires for authenticated sessions).
  useIdleLogout({ idleMs: 10 * 60 * 1000, warnMs: 60 * 1000 });
  return null;
}

function AppRoutes() {
  return (
    <>
      <IdleLogoutGuard />
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/solutions/real-estate" element={<RealEstate />} />
      <Route path="/solutions/staffing-agency" element={<StaffingAgency />} />
      <Route path="/solutions/legal" element={<Legal />} />
      <Route path="/solutions/hr" element={<HR />} />
      <Route path="/solutions/financial-services" element={<FinancialServices />} />
      <Route path="/solutions/healthcare" element={<Healthcare />} />
      <Route path="/solutions/charities" element={<Charities />} />
      <Route path="/solutions/construction" element={<Construction />} />
      <Route path="/solutions/education" element={<Education />} />
      <Route path="/solutions/sales" element={<Sales />} />
      <Route path="/solutions/freelancers" element={<Freelancers />} />
      <Route path="/product/manage-pdf" element={<ManagePdfProduct />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/careers/:slug" element={<JobDetail />} />
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/legal/cookies" element={<CookiePolicy />} />
      <Route path="/legal/refunds" element={<RefundPolicy />} />
      <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
      <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
      <Route path="/cookies" element={<Navigate to="/legal/cookies" replace />} />
      <Route path="/refunds" element={<Navigate to="/legal/refunds" replace />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/sign/:token" element={<SignerFlow />} />
      <Route path="/form/:slug" element={<PublicForm />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/new" element={<Protected><NewEnvelope /></Protected>} />
      <Route path="/documents" element={<Protected><Documents /></Protected>} />
      <Route path="/documents/verify" element={<Navigate to="/documents?tab=sealed" replace />} />
      <Route path="/templates" element={<Protected><Templates /></Protected>} />
      <Route path="/contacts" element={<Protected><Contacts /></Protected>} />
      <Route path="/manage-pdf" element={<Protected><ManagePdf /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/usage" element={<Protected><Usage /></Protected>} />
      <Route path="/organisation" element={<Protected><OrganisationPortal /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      {/* Internal team sign-in lives on an unlisted path (not linked from the public UI). */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminProtected><AdminShell /></AdminProtected>}>
        <Route index element={<AdminIndex />} />
        <Route path="users" element={<RequirePerm perm="users-read"><AdminUsers /></RequirePerm>} />
        <Route path="users/:userId" element={<RequirePerm perm="users-read"><AdminUserDetail /></RequirePerm>} />


        <Route path="billing" element={<RequirePerm perm="billing"><AdminBilling /></RequirePerm>} />
        <Route path="audit" element={<RequirePerm perm="audit"><AdminAuditLog /></RequirePerm>} />
        <Route path="contacts" element={<RequirePerm perm="contacts"><AdminContacts /></RequirePerm>} />
        <Route path="blog" element={<RequirePerm perm="blog"><AdminBlog /></RequirePerm>} />
        <Route path="careers" element={<RequirePerm perm="careers"><AdminCareers /></RequirePerm>} />
        <Route path="team" element={<RequirePerm perm="admin"><AdminTeam /></RequirePerm>} />
        <Route path="organizations" element={<RequirePerm perm="admin"><AdminOrganizations /></RequirePerm>} />
      </Route>
      <Route path="/prepare/:id" element={<Protected><PrepareStudio /></Protected>} />
      <Route path="/send/:id" element={<Protected><SendReview /></Protected>} />
      <Route path="/envelope/:id" element={<Protected><EnvelopeDetail /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <SeoManager />
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
