import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/config";
import { buildAuthUserProfile } from "@/lib/auth";

export function LoginPage() {
  const { setAuthToken, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    const credential = credentialResponse.credential;

    if (!credential) {
      setError("Google login did not return a credential. Please try again.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: credential }),
      });

      if (!response.ok) {
        throw new Error(`Backend authentication failed (${response.status}).`);
      }

      const data = await response.json();
      const userId =
        data?.user_id ?? data?.userId ?? data?.user?.id ?? data?.user?.user_id;
      const authToken =
        data?.authToken ??
        data?.token ??
        (userId !== undefined && userId !== null ? String(userId) : null);
      if (!authToken) {
        throw new Error("No auth token returned from backend.");
      }
      setAuthToken(authToken);
      const profile = buildAuthUserProfile(data?.user ?? data, {
        email: data?.user?.email ?? data?.email,
        fullName: data?.user?.full_name ?? data?.full_name,
        userId,
      });
      setUser(profile);
      if (userId !== undefined && userId !== null) {
        navigate("/dashboard", { state: { user_id: userId } });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Authentication Error:", err);
      setError(
        "We could not authenticate your Google account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Signin failed (${response.status}).`);
      }

      const data = await response.json();
      const userId =
        data?.user_id ?? data?.userId ?? data?.user?.id ?? data?.user?.user_id;
      const authToken =
        data?.authToken ??
        data?.token ??
        (userId !== undefined && userId !== null ? String(userId) : null);
      if (!authToken) {
        throw new Error("No auth token returned from backend.");
      }
      setAuthToken(authToken);
      const profile = buildAuthUserProfile(data?.user ?? data, {
        email: data?.user?.email ?? data?.email ?? email,
        fullName:
          data?.user?.full_name ??
          data?.full_name ??
          data?.user?.first_name ??
          undefined,
        userId,
      });
      setUser(profile);
      if (userId !== undefined && userId !== null) {
        navigate("/dashboard", { state: { user_id: userId } });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Error signing in...", err);
      setError(
        "Unable to sign in with those credentials. Please check and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

// Handle normal signup
const handleSignin = async () => {
  const email = (document.getElementById("email") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;

  try {
    const res = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Signin failed");

    const data = await res.json();
    console.log("Signed in successfully:", data);


    // redirect to dashboard (or login page)
    navigate("/dashboard");
  } catch (err) {
    console.error("Error signing in...", err);
  }
};


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSignin} className="grid gap-4">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
            <div className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <Link to="/signup" className="underline">
                Sign up
              </Link>
            </div>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex w-full justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError(
                    "Google sign-in failed. Please refresh the page and try again."
                  )
                }
                useOneTap
              />
            </div>
            {isSubmitting ? (
              <div className="pb-2 text-center text-xs text-muted-foreground">
                Verifying your account…
              </div>
            ) : null}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
