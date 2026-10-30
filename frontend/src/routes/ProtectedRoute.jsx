/**
 * ProtectedRoute Component — Guards private application routes.
 *
 * Rules:
 * - Unauthenticated users are redirected to /login
 * - Role mismatch redirects user to their authorized role dashboard
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RouteFallback from "./RouteFallback";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback label="Checking your session" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    // Every authenticated user has customer capability
    const hasCustomerCap = true;
    const hasProviderCap = user.role === "provider" || user.is_provider || user.role === "admin";
    const hasAdminCap = user.role === "admin";

    const isAuthorized =
      (allowedRoles.includes("customer") && hasCustomerCap) ||
      (allowedRoles.includes("provider") && hasProviderCap) ||
      (allowedRoles.includes("admin") && hasAdminCap) ||
      allowedRoles.includes(user.role);

    if (!isAuthorized) {
      if (user.role === "admin") {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.role === "provider" || user.is_provider) {
        return <Navigate to="/provider/dashboard" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
}
