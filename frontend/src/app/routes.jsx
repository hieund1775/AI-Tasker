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
