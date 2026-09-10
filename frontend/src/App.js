import React, { Suspense, lazy } from "react";
import { loadPage } from "@/lib/loadPage";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { getPostAuthDestination } from "@/lib/authPortal";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import RequirePerm from "@/components/RequirePerm";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SeoManager } from "@/components/SeoManager";
import { GoogleSiteTags } from "@/components/GoogleSiteTags";

const lazyPage = (loader, name) => lazy(() => loadPage(loader, name).then((m) => ({ default: m.default })).catch((err) => {
  console.error(`Failed to load chunk: ${name}`, err);
  throw err;
}));

// Marketing & public content
const Landing = lazyPage(() => import("@/pages/Landing"), "Landing");
const About = lazyPage(() => import("@/pages/About"), "About");
const Contact = lazyPage(() => import("@/pages/Contact"), "Contact");
const Solutions = lazyPage(() => import("@/pages/Solutions"), "Solutions");
const RealEstate = lazyPage(() => import("@/pages/solutions/RealEstate"), "RealEstate");
const StaffingAgency = lazyPage(() => import("@/pages/solutions/StaffingAgency"), "StaffingAgency");
const Legal = lazyPage(() => import("@/pages/solutions/Legal"), "Legal");
const HR = lazyPage(() => import("@/pages/solutions/HR"), "HR");
const FinancialServices = lazyPage(() => import("@/pages/solutions/FinancialServices"), "FinancialServices");
const Healthcare = lazyPage(() => import("@/pages/solutions/Healthcare"), "Healthcare");
const Charities = lazyPage(() => import("@/pages/solutions/Charities"), "Charities");
const Construction = lazyPage(() => import("@/pages/solutions/Construction"), "Construction");
const Education = lazyPage(() => import("@/pages/solutions/Education"), "Education");
const Sales = lazyPage(() => import("@/pages/solutions/Sales"), "Sales");
const Freelancers = lazyPage(() => import("@/pages/solutions/Freelancers"), "Freelancers");
const ManagePdfProduct = lazyPage(() => import("@/pages/ManagePdfProduct"), "ManagePdfProduct");
const IdVerificationProduct = lazyPage(() => import("@/pages/IdVerificationProduct"), "IdVerificationProduct");
const Pricing = lazyPage(() => import("@/pages/Pricing"), "Pricing");
const Blog = lazyPage(() => import("@/pages/Blog"), "Blog");
const BlogPost = lazyPage(() => import("@/pages/BlogPost"), "BlogPost");
const Resources = lazyPage(() => import("@/pages/Resources"), "Resources");
const Careers = lazyPage(() => import("@/pages/Careers"), "Careers");
const JobDetail = lazyPage(() => import("@/pages/JobDetail"), "JobDetail");
const PrivacyPolicy = lazyPage(() => import("@/pages/PrivacyPolicy"), "PrivacyPolicy");
const Terms = lazyPage(() => import("@/pages/Terms"), "Terms");
const CookiePolicy = lazyPage(() => import("@/pages/CookiePolicy"), "CookiePolicy");
const RefundPolicy = lazyPage(() => import("@/pages/RefundPolicy"), "RefundPolicy");
const NotFound = lazyPage(() => import("@/pages/NotFound"), "NotFound");

// Auth — eager imports so /login and /register feel instant (no chunk wait)
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
const AcceptInvite = lazyPage(() => import("@/pages/AcceptInvite"), "AcceptInvite");

// Signer & public forms (react-pdf)
const SignerFlow = lazyPage(() => import("@/pages/SignerFlow"), "SignerFlow");
const PublicForm = lazyPage(() => import("@/pages/PublicForm"), "PublicForm");

// Portal (recharts on dashboard/reports; react-pdf on manage/prepare)
const Dashboard = lazyPage(() => import("@/pages/Dashboard"), "Dashboard");
const NewEnvelope = lazyPage(() => import("@/pages/NewEnvelope"), "NewEnvelope");
const Documents = lazyPage(() => import("@/pages/Documents"), "Documents");
const Templates = lazyPage(() => import("@/pages/Templates"), "Templates");
const Contacts = lazyPage(() => import("@/pages/Contacts"), "Contacts");
const ManagePdf = lazyPage(() => import("@/pages/ManagePdf"), "ManagePdf");
const Reports = lazyPage(() => import("@/pages/Reports"), "Reports");
const Usage = lazyPage(() => import("@/pages/Usage"), "Usage");
const OrganisationPortal = lazyPage(() => import("@/pages/OrganisationPortal"), "OrganisationPortal");
const Settings = lazyPage(() => import("@/pages/Settings"), "Settings");
const PrepareStudio = lazyPage(() => import("@/pages/PrepareStudio"), "PrepareStudio");
const SendReview = lazyPage(() => import("@/pages/SendReview"), "SendReview");
const EnvelopeDetail = lazyPage(() => import("@/pages/EnvelopeDetail"), "EnvelopeDetail");

// Admin
const AdminShell = lazy(() => import("@/components/AdminShell").then((m) => ({ default: m.AdminShell })));
const AdminOverview = lazyPage(() => import("@/pages/admin/AdminOverview"), "AdminOverview");
const AdminLogin = lazyPage(() => import("@/pages/admin/AdminLogin"), "AdminLogin");
const AdminUsers = lazyPage(() => import("@/pages/admin/AdminUsers"), "AdminUsers");
const AdminUserDetail = lazyPage(() => import("@/pages/admin/AdminUserDetail"), "AdminUserDetail");
const AdminContacts = lazyPage(() => import("@/pages/admin/AdminContacts"), "AdminContacts");
const AdminBilling = lazyPage(() => import("@/pages/admin/AdminBilling"), "AdminBilling");
const AdminAuditLog = lazyPage(() => import("@/pages/admin/AdminAuditLog"), "AdminAuditLog");
const AdminBlog = lazyPage(() => import("@/pages/admin/AdminBlog"), "AdminBlog");
const AdminTeam = lazyPage(() => import("@/pages/admin/AdminTeam"), "AdminTeam");
const AdminOrganizations = lazyPage(() => import("@/pages/admin/AdminOrganizations"), "AdminOrganizations");
const AdminCareers = lazyPage(() => import("@/pages/admin/AdminCareers"), "AdminCareers");
const StaffLanding = lazyPage(() => import("@/pages/admin/StaffLanding"), "StaffLanding");

const FullLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--c-paper)]">
    <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
  </div>
);

const SessionUnavailable = () => {
  const { checkAuth } = useAuth();
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
    <h1 className="text-xl font-semibold">Unable to connect right now</h1>
    <p>Your session could not be checked. Please try again.</p>
    <button className="rounded-lg bg-[var(--c-ink-solid)] px-5 py-3 text-white" onClick={checkAuth}>Try again</button>
  </div>;
};

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center bg-[var(--c-paper)]">
    <Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" />
  </div>
);

function Protected({ children }) {
  const { user, authReady, authError } = useAuth();
  const location = useLocation();
  if (!authReady) return <FullLoader />;
  if (authError) return <SessionUnavailable />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  if (user) {
    const dest = getPostAuthDestination(params.get("next"), user);
    return <Navigate to={dest} replace />;
  }
  return children;
}

function AdminProtected({ children }) {
  const { user, authReady, authError } = useAuth();
  if (!authReady) return <FullLoader />;
  if (authError) return <SessionUnavailable />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin" && user.role !== "staff") {
    return <Navigate to="/admin/login" replace state={{ reason: "internal_only" }} />;
  }
  return children;
}

function AdminIndex() {
  const { user } = useAuth();
  if (user?.role === "staff") return <StaffLanding />;
  return <AdminOverview />;
}

function IdleLogoutGuard() {
  useIdleLogout({ idleMs: 10 * 60 * 1000, warnMs: 60 * 1000 });
  return null;
}

function AppRoutes() {
  return (
    <>
      <IdleLogoutGuard />
      <Suspense fallback={<RouteLoader />}>
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
          <Route path="/product/id-verification" element={<IdVerificationProduct />} />
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
      </Suspense>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <SeoManager />
        <GoogleSiteTags />
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;