import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";

/**
 * ProtectedRoute — guards routes behind authentication, optional role check,
 * and expert profile-completion check.
 *
 * Behaviour:
 * - If the user is NOT authenticated → redirect to /login
 * - If `role` prop is provided and doesn't match the user's role → redirect to /unauthorized
 * - If the user is an expert with an incomplete profile and is NOT already on
 *   the edit-profile page → redirect to /expert/profile/edit
 * - Otherwise → render children via <Outlet />
 *
 * Usage in routes.jsx:
 *   <Route element={<ProtectedRoute role="client">}>
 *     <Route path="client/dashboard" ... />
 *   </Route>
 */
export function ProtectedRoute({ role, children }) {
  const { isAuthenticated, role: userRole, loading, user } = useAuth();
  const location = useLocation();

  // While the AuthProvider is restoring session from localStorage,
  // show nothing (or a spinner). This prevents a flash of the login page.
  if (loading) {
    return null;
  }

  // Not logged in — send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role — send to unauthorized
  if (role && userRole !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Expert with incomplete profile — redirect to profile completion
  // Skip if already on the edit-profile page to prevent infinite loop.
  if (
    userRole === "expert" &&
    user?.hasProfile === false &&
    location.pathname !== "/expert/profile/edit"
  ) {
    return <Navigate to="/expert/profile/edit" replace />;
  }

  // Authorised — render the route's content
  return children ? children : <Outlet />;
}
