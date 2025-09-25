import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { authToken } = useAuth();

  if (!authToken) {
    // If no token, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  // If there's a token, render the child route (e.g., the dashboard)
  return <Outlet />;
}
