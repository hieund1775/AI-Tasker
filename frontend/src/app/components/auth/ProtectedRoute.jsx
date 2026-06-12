import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";

/**
 * ProtectedRoute — guards routes behind authentication and optional role check.
 *
 * Behaviour:
 * - If the user is NOT authenticated → redirect to /login
 * - If `role` prop is provided and doesn't match → redirect to /unauthorized
 *   EXCEPTION: Owner can access Admin routes (Owner has all Admin permissions).
 * - If `roles` (array) prop is provided → user must match one of the roles
 * - Otherwise → render children via <Outlet />
 *
 * Usage in routes.jsx:
 *   <Route element={<ProtectedRoute role="client">}>
 *     <Route path="client/dashboard" ... />
 *   </Route>
 *   <Route element={<ProtectedRoute roles={["admin", "owner"]}>}>
 *     // accessible by both Admin and Owner
 *   </Route>
 */
export function ProtectedRoute({ role, roles, children }) {
  const { isAuthenticated, role: userRole, loading } = useAuth();

  // While the AuthProvider is restoring session from localStorage,
  // show nothing (or a spinner). This prevents a flash of the login page.
  if (loading) {
    return null;
  }

  // Not logged in — send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Resolve allowed roles: if `role` is "admin", also allow "owner"
  const allowedRoles = roles
    ? roles
    : role
      ? role === "admin"
        ? ["admin", "owner"]
        : [role]
      : null;

  // Role check — normalize to lowercase for case-insensitive comparison
  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole?.toLowerCase())) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Authorised — render the route's content
  return children ? children : <Outlet />;
}
