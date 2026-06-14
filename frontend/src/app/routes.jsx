import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/layout/RootLayout.jsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.jsx";

import { HomePage } from "./pages/public/HomePage.jsx";
import { LoginPage } from "./pages/public/LoginPage.jsx";
import { SignUpPage } from "./pages/public/SignUpPage.jsx";

// Client Pages
import { ClientDashboard } from "./pages/client/ClientDashboard.jsx";
import { PostProject } from "./pages/client/PostProject.jsx";
import { ProjectDetail } from "./pages/client/ProjectDetail.jsx";
import { ProposalReview } from "./pages/client/ProposalReview.jsx";
import { ExpertList } from "./pages/client/ExpertList.jsx";
import { ClientProfile } from "./pages/client/ClientProfile.jsx";
import { EditClientProfile } from "./pages/client/EditClientProfile.jsx";
import { MyProjectsList } from "./pages/client/MyProjectsPage.jsx";
import { PublicExpertProfile } from "./components/shared/PublicExpertProfile.jsx";
import { Billing } from "./pages/client/Billing.jsx";
import { CreateContract } from "./pages/client/CreateContract.jsx";
import { ClientProposalDetail } from "./pages/client/ClientProposalDetail.jsx";

// Expert Pages
import { ExpertDashboard } from "./pages/expert/ExpertDashboard.jsx";
import { JobList } from "./pages/expert/JobList.jsx";
import { JobDetail } from "./pages/expert/JobDetail.jsx";
import { SendProposal } from "./pages/expert/SendProposal.jsx";
import { ProposalStatus } from "./pages/expert/ProposalStatus.jsx";
import { ProposalDetail } from "./pages/expert/ProposalDetail.jsx";
import { ExpertProjectDetail } from "./pages/expert/ExpertProjectDetail.jsx";
import { EditExpertProfile } from "./pages/expert/EditExpertProfile.jsx";
import { ExpertWallet } from "./pages/expert/ExpertWallet.jsx";
import { ExpertContractView } from "./pages/expert/ExpertContractView.jsx";

// Admin Pages
import { AdminDashboard } from "./pages/admin/AdminDashboard.jsx";
import { AdminUsers } from "./pages/admin/AdminUsers.jsx";
import { AdminDisputes } from "./pages/admin/AdminDisputes.jsx";
import { AdminRevenue } from "./pages/admin/AdminRevenue.jsx";
import { AdminProfile } from "./pages/admin/AdminProfile.jsx";
import { EditAdminProfile } from "./pages/admin/EditAdminProfile.jsx";
import { AdminReportDetail } from "./pages/admin/AdminReportDetail.jsx";
import { AdminProjects } from "./pages/admin/AdminProjects.jsx";
import { AdminReviews } from "./pages/admin/AdminReviews.jsx";
import { AdminJobPosts } from "./pages/admin/AdminJobPosts.jsx";
import { AdminCategoryTags } from "./pages/admin/AdminCategoryTags.jsx";

// Owner Pages
import { OwnerDashboard } from "./pages/owner/OwnerDashboard.jsx";
import { CreateAdmin } from "./pages/owner/CreateAdmin.jsx";
import { ManageAdmins } from "./pages/owner/ManageAdmins.jsx";
import { OwnerProfile } from "./pages/owner/OwnerProfile.jsx";
import { EditOwnerProfile } from "./pages/owner/EditOwnerProfile.jsx";
import OwnerUsers from "./pages/owner/OwnerUsers.jsx";
import OwnerProjects from "./pages/owner/OwnerProjects.jsx";
import OwnerReports from "./pages/owner/OwnerReports.jsx";
import OwnerReviews from "./pages/owner/OwnerReviews.jsx";
import OwnerJobPosts from "./pages/owner/OwnerJobPosts.jsx";
import OwnerCategoryTags from "./pages/owner/OwnerCategoryTags.jsx";

// Common Pages (shared components)
import { Messenger } from "./pages/common/Messenger.jsx";
import { TaskUpdatePage } from "./pages/common/TaskUpdatePage.jsx";
import { NotificationsPage } from "./pages/common/NotificationsPage.jsx";

export const router = createBrowserRouter([
  // ================= PUBLIC ROUTES =================
  {
    path: "/",
    children: [
      { index: true, Component: HomePage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignUpPage },
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
            element: <ProtectedRoute role="client" />,
            children: [
              { path: "client/dashboard", Component: ClientDashboard },
              { path: "client/post-project", Component: PostProject },
              { path: "client/my-projects", Component: MyProjectsList },
              { path: "client/projects/:id", Component: ProjectDetail },
              { path: "client/projects/:projectId/proposals", Component: ProposalReview },
              { path: "client/experts", Component: ExpertList },
              { path: "client/experts/:id", element: <PublicExpertProfile viewerRole="client" /> },
              { path: "client/profile", Component: ClientProfile },
              { path: "client/profile/edit", Component: EditClientProfile },
              { path: "client/billing", Component: Billing },
              { path: "client/contracts/create", Component: CreateContract },
              { path: "client/proposals/:id", Component: ClientProposalDetail },
            ],
          },

          // ----- Expert routes (role=expert only) -----
          {
            element: <ProtectedRoute role="expert" />,
            children: [
              { path: "expert/dashboard", Component: ExpertDashboard },
              { path: "expert/find-jobs", Component: JobList },
              { path: "expert/jobs", Component: JobList },
              { path: "expert/jobs/:id", Component: JobDetail },
              { path: "expert/jobs/:id/proposal", Component: SendProposal },
              { path: "expert/proposals", Component: ProposalStatus },
              { path: "expert/proposals/:id", Component: ProposalDetail },
              { path: "expert/projects/:id", Component: ExpertProjectDetail },
              { path: "expert/profile", element: <PublicExpertProfile viewerRole="expert" /> },
              { path: "expert/profile/edit", Component: EditExpertProfile },
              { path: "expert/wallet", Component: ExpertWallet },
              { path: "expert/contracts/:contractId", Component: ExpertContractView },
            ],
          },

          // ----- Admin routes (role=admin only) -----
          {
            element: <ProtectedRoute role="admin" />,
            children: [
              { path: "admin/dashboard", Component: AdminDashboard },
              { path: "admin/users", Component: AdminUsers },
              { path: "admin/disputes", Component: AdminDisputes },
              { path: "admin/disputes/:id", Component: AdminReportDetail },
              { path: "admin/projects", Component: AdminProjects },
              { path: "admin/reviews", Component: AdminReviews },
              { path: "admin/job-posts", Component: AdminJobPosts },
              { path: "admin/category-tags", Component: AdminCategoryTags },
              { path: "admin/revenue", Component: AdminRevenue },
              { path: "admin/profile", Component: AdminProfile },
              { path: "admin/profile/edit", Component: EditAdminProfile },
            ],
          },

          // ----- Owner routes (role=owner only) -----
          {
            element: <ProtectedRoute role="owner" />,
            children: [
              { path: "owner/dashboard", Component: OwnerDashboard },
              { path: "owner/create-admin", Component: CreateAdmin },
              { path: "owner/manage-admins", Component: ManageAdmins },
              { path: "owner/profile", Component: OwnerProfile },
              { path: "owner/profile/edit", Component: EditOwnerProfile },
              // Owner-specific management pages (reuse Admin components)
              { path: "owner/users", Component: OwnerUsers },
              { path: "owner/projects", Component: OwnerProjects },
              { path: "owner/reports", Component: OwnerReports },
              { path: "owner/reviews", Component: OwnerReviews },
              { path: "owner/job-posts", Component: OwnerJobPosts },
              { path: "owner/category-tags", Component: OwnerCategoryTags },
            ],
          },

          // ----- Common routes (any authenticated role) -----
          { path: "notifications", Component: NotificationsPage },
          { path: "expert/profile/:id", element: <PublicExpertProfile viewerRole="public" /> },
          { path: "messenger", Component: Messenger },
          { path: "messenger/:id", Component: Messenger },
          { path: "tasks/:taskId/update", Component: TaskUpdatePage },

          // ----- Legacy redirect -----
          {
            path: "client/proposals/:id",
            element: <ProposalReviewLegacyRedirect />,
          },
        ],
      },
    ],
  },
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-red-500">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don&apos;t have permission to view this page. Please switch to an
          account with the appropriate role, or contact support.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium transition-colors"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}
