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

export function SignupPage() {
  const { setAuthToken, setUser } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google login handler
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      setError("Google sign-up did not return a credential. Please try again.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      });

      if (!response.ok) {
        throw new Error(`Backend authentication failed (${response.status}).`);
      }

      const data = await response.json();
      const authToken =
        data?.authToken ??
        data?.token ??
        (data?.user_id ? String(data.user_id) : null);
      if (!authToken) {
        throw new Error("No auth token returned from backend.");
      }
      setAuthToken(authToken);
      const profile = buildAuthUserProfile(data?.user ?? data, {
        email: data?.user?.email ?? data?.email,
        fullName:
          data?.user?.full_name ?? data?.full_name ?? data?.fullName ?? null,
        userId: data?.user_id ?? data?.user?.id ?? null,
      });
      setUser(profile);
      navigate("/dashboard");
    } catch (error) {
      console.error("Authentication Error:", error);
      setError(
        "We could not authenticate your Google account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle normal signup (send OTP)
  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fullName || !email || !password) {
      setError("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password }),
      });

      if (!response.ok) {
        throw new Error(`Signup failed (${response.status}).`);
      }

      const data = await response.json();
      const authToken =
        data?.authToken ??
        data?.token ??
        (data?.user_id ? String(data.user_id) : null);
      if (!authToken) {
        throw new Error("No auth token returned from backend.");
      }
      setAuthToken(authToken);
      const profile = buildAuthUserProfile(data?.user ?? data, {
        email: data?.user?.email ?? data?.email ?? email,
        fullName:
          data?.user?.full_name ?? data?.full_name ?? fullName,
        userId: data?.user_id ?? data?.user?.id ?? null,
      });
      setUser(profile);
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup Error:", err);
      setError(
        "We couldn't create your account. Please review your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSignup} className="grid gap-4">
          <CardHeader>
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription>
              Enter your information to create an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="underline">
                Login
              </Link>
            </div>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with
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
                    "Google sign-up failed. Please refresh the page and try again."
                  )
                }
                useOneTap
              />
            </div>
            {isSubmitting ? (
              <div className="pb-2 text-center text-xs text-muted-foreground">
                Creating your account…
              </div>
            ) : null}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
