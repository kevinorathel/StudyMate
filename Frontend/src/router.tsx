import { createBrowserRouter } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-2">
    <h1 className="text-3xl font-semibold">404</h1>
    <p className="text-muted-foreground">Page not found</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
