import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/layout/RootLayout.jsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.jsx";

import { HomePage } from "./pages/public/HomePage.jsx";
import { LoginPage } from "./pages/public/LoginPage.jsx";
import { SignUpPage } from "./pages/public/SignUpPage.jsx";
import { ResetPasswordPage } from "./pages/public/ResetPasswordPage.jsx";

// Client Pages
import { ClientDashboard } from "./pages/client/ClientDashboard.jsx";
import { PostProject } from "./pages/client/PostProject.jsx";
import ProjectDetail from "./pages/client/ClientProjectManagement.jsx";
import { ProposalReview } from "./pages/client/ProposalReview.jsx";
import { ExpertList } from "./pages/client/ExpertList.jsx";
import { ClientProfile } from "./pages/client/ClientProfile.jsx";
import { EditClientProfile } from "./pages/client/EditClientProfile.jsx";
import { MyProjectsList } from "./pages/client/MyProjectsPage.jsx";
import { PublicExpertProfile } from "./components/shared/PublicExpertProfile.jsx";
import { Billing } from "./pages/client/Billing.jsx";

// Expert Pages
import { ExpertDashboard } from "./pages/expert/ExpertDashboard.jsx";
import { JobList } from "./pages/expert/JobList.jsx";
import { JobDetail } from "./pages/expert/JobDetail.jsx";
import { SendProposal } from "./pages/expert/SendProposal.jsx";
import { ProposalStatus } from "./pages/expert/ProposalStatus.jsx";
import { ProposalDetail } from "./pages/expert/ProposalDetail.jsx";
import ExpertProjectDetail from "./pages/expert/ExpertProjectManagement.jsx";
import { EditExpertProfile } from "./pages/expert/EditExpertProfile.jsx";
import { ExpertWallet } from "./pages/expert/ExpertWallet.jsx";
import { ExpertProfile } from "./pages/expert/ExpertProfile.jsx";
import PaymentResult from "./pages/common/PaymentResult";

// Admin Pages
import { AdminDashboard } from "./pages/admin/AdminDashboard.jsx";
import { AdminUsers } from "./pages/admin/AdminUsers.jsx";
import { AdminDisputes } from "./pages/admin/AdminDisputes.jsx";
import { AdminRevenue } from "./pages/admin/AdminRevenue.jsx";
import { AdminProfile } from "./pages/admin/AdminProfile.jsx";
import { AdminReportDetail } from "./pages/admin/AdminReportDetail.jsx";
import { AdminProjects } from "./pages/admin/AdminProjects.jsx";
import { AdminReviews } from "./pages/admin/AdminReviews.jsx";
import { AdminJobPosts } from "./pages/admin/AdminJobPosts.jsx";
import { AdminCategoryTags } from "./pages/admin/AdminCategoryTags.jsx";

// Owner Pages
import { OwnerDashboard } from "./pages/owner/OwnerDashboard.jsx";
import { CreateAdmin } from "./pages/owner/CreateAdmin.jsx";
import { OwnerProfile } from "./pages/owner/OwnerProfile.jsx";
import { OwnerRevenue } from "./pages/owner/OwnerRevenue.jsx";
import { OwnerWallet } from "./pages/owner/OwnerWallet.jsx";


// Layouts
import { AdminLayout } from "./components/layout/AdminLayout.jsx";
import { OwnerLayout } from "./components/layout/OwnerLayout.jsx";
import OwnerUsers from "./pages/owner/OwnerUsers.jsx";
import OwnerProjects from "./pages/owner/OwnerProjects.jsx";
import OwnerReports from "./pages/owner/OwnerReports.jsx";
import OwnerReviews from "./pages/owner/OwnerReviews.jsx";
import OwnerJobPosts from "./pages/owner/OwnerJobPosts.jsx";
import OwnerCategoryTags from "./pages/owner/OwnerCategoryTags.jsx";

// Common Pages (shared components)
import { Messenger } from "./pages/common/Messenger.jsx";
import { TaskUpdatePage } from "./pages/common/TaskUpdatePage.jsx";
import TaskDetailPage from "./pages/common/TaskDetailPage.jsx";
import { NotificationsPage } from "./pages/common/NotificationsPage.jsx";

// Public / fallback pages
import { NotFound } from "./pages/public/NotFound.jsx";

export const router = createBrowserRouter([
  // ================= PUBLIC ROUTES =================
  {
    path: "/",
    children: [
      { index: true, Component: HomePage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignUpPage },
      { path: "reset-password", Component: ResetPasswordPage },
      { path: "unauthorized", Component: UnauthorizedPage },
    ],
  },

  // ================= AUTHENTICATED ROUTES =================
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        Component: RootLayout,
        children: [
          // ----- Client routes (role=client only) -----
          {
            path: "client",
            element: <ProtectedRoute role="client" />,
            children: [
              { index: true, element: <Navigate to="/client/dashboard" replace /> },
              { path: "dashboard", Component: ClientDashboard },
              { path: "post-project", Component: PostProject },
              { path: "my-projects", Component: MyProjectsList },
              { path: "projects/:id", Component: ProjectDetail },
              { path: "projects/:projectId/tasks/:taskId", Component: TaskDetailPage },
              { path: "projects/:projectId/proposals", Component: ProposalReview },
              { path: "experts", Component: ExpertList },
              { path: "experts/:id", element: <PublicExpertProfile viewerRole="client" /> },
              { path: "profile", Component: ClientProfile },
              { path: "profile/edit", Component: EditClientProfile },
              { path: "billing", Component: Billing },
              { path: "proposals/:id", element: <ProposalReviewLegacyRedirect /> },
            ],
          },

          // ----- Expert routes (role=expert only) -----
          {
            path: "expert",
            element: <ProtectedRoute role="expert" />,
            children: [
              { index: true, element: <Navigate to="/expert/dashboard" replace /> },
              { path: "dashboard", Component: ExpertDashboard },
              { path: "find-jobs", Component: JobList },
              { path: "jobs", Component: JobList },
              { path: "jobs/:id", Component: JobDetail },
              { path: "jobs/:id/proposal", Component: SendProposal },
              { path: "proposals", Component: ProposalStatus },
              { path: "proposals/:id", Component: ProposalDetail },
              { path: "projects/:id", Component: ExpertProjectDetail },
              { path: "projects/:projectId/tasks/:taskId", Component: TaskDetailPage },
              { path: "profile", Component: ExpertProfile },
              { path: "profile/edit", Component: EditExpertProfile },
              { path: "wallet", Component: ExpertWallet },
            ],
          },

          // ----- Admin routes (role=admin only) -----
          {
            path: "admin",
            element: <ProtectedRoute roles={["admin", "staff"]} />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <Navigate to="/admin/dashboard" replace /> },
                  { path: "dashboard", Component: AdminDashboard },
                  { path: "users", Component: AdminUsers },
                  { path: "disputes", Component: AdminDisputes },
                  { path: "disputes/:id", Component: AdminReportDetail },
                  { path: "projects", Component: AdminProjects },
                  { path: "reviews", Component: AdminReviews },
                  { path: "job-posts", Component: AdminJobPosts },
                  { path: "category-tags", Component: AdminCategoryTags },
                  { path: "revenue", Component: AdminRevenue },
                  { path: "profile", Component: AdminProfile },
                  { path: "profile-client/:id", Component: ClientProfile },
                  { path: "profile-expert/:id", element: <PublicExpertProfile viewerRole="public" /> },
                ],
              }
            ],
          },

          // ----- Owner routes (role=owner only) -----
          {
            path: "owner",
            element: <ProtectedRoute role="owner" />,
            children: [
              {
                element: <OwnerLayout />,
                children: [
                  { index: true, element: <Navigate to="/owner/dashboard" replace /> },
                  { path: "dashboard", Component: OwnerDashboard },
                  { path: "create-admin", Component: CreateAdmin },
                  { path: "wallet", Component: OwnerWallet },
                  { path: "revenue", Component: OwnerRevenue },
                  { path: "disputes/:id", Component: AdminReportDetail },
                  { path: "profile", Component: OwnerProfile },
                  { path: "profile-client/:id", Component: ClientProfile },
                  { path: "profile-expert/:id", element: <PublicExpertProfile viewerRole="public" /> },
                  // Owner-specific management pages (reuse Admin components)
                  { path: "users", Component: OwnerUsers },
                  { path: "projects", Component: OwnerProjects },
                  { path: "reports", Component: OwnerReports },
                  { path: "reviews", Component: OwnerReviews },
                  { path: "job-posts", Component: OwnerJobPosts },
                  { path: "category-tags", Component: OwnerCategoryTags },
                ],
              }
            ],
          },

          // ----- Common routes (any authenticated role) -----
          { path: "notifications", Component: NotificationsPage },
          { path: "expert/profile/:id", element: <PublicExpertProfile viewerRole="public" /> },
          { path: "client/profile/:id", Component: ClientProfile },
          { path: "messenger", Component: Messenger },
          { path: "messenger/:id", Component: Messenger },
          { path: "tasks/:taskId/update", Component: TaskUpdatePage },

          // Payment result redirect from ZaloPay
          { path: "wallet", Component: PaymentResult },

          // ----- Friendly redirects for common navigation paths -----
          { path: "my-projects", element: <Navigate to="/client/my-projects" replace /> },
          { path: "messages", element: <Navigate to="/messenger" replace /> },

        ],
      },
    ],
  },
  // ================= GLOBAL 404 ROUTE =================
  { path: "*", Component: NotFound },
]);

// ---------------------------------------------------------------------------
// Legacy redirect
// ---------------------------------------------------------------------------

import { useParams } from "react-router";

function ProposalReviewLegacyRedirect() {
  return <LegacyProposalRedirect />;
}

function LegacyProposalRedirect() {
  const { id } = useParams();
  return <Navigate to={`/client/projects/${id}/proposals`} replace />;
}

// ---------------------------------------------------------------------------
// Unauthorized page
// ---------------------------------------------------------------------------

function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-sm border border-border p-8 text-center">
        <div className="w-16 h-16 bg-destructive-light rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-semibold text-destructive">!</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don&apos;t have permission to view this page. Please switch to an
          account with the appropriate role, or contact support.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium transition-colors"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}
