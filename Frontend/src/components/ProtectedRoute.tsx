import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BYPASS_AUTH } from "@/config";

export function ProtectedRoute() {
  const { authToken, isReady } = useAuth();

  if (BYPASS_AUTH) {
    return <Outlet />;
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Checking authentication…
        </p>
      </div>
    );
  }

  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
