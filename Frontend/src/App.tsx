import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { router } from "./router";
import { GOOGLE_CLIENT_ID } from "./config";

export default function App() {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID is missing; Google login will be disabled."
      );
    }
  }, []);

  return (
    <AuthProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="text-zinc-900 dark:text-zinc-100 antialiased">
          <RouterProvider router={router} />
        </div>
      </GoogleOAuthProvider>
    </AuthProvider>
  );
}
