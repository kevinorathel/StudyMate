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

export function SignupPage() {
  const { setAuthToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    const token = credentialResponse.credential;

    if (!token) {
      setError("Google sign up did not return a credential. Please try again.");
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
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`Backend authentication failed (${response.status}).`);
      }

      const data = await response.json();
      setAuthToken(data.authToken);
      navigate("/dashboard");
    } catch (err) {
      console.error("Authentication Error:", err);
      setError("We could not complete your Google sign up. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setManualError(null);
              setIsManualSubmitting(true);

              const formData = new FormData(event.currentTarget);
              const firstName = (formData.get("first-name") as string | null)?.trim() ?? "";
              const lastName = (formData.get("last-name") as string | null)?.trim() ?? "";
              const email = (formData.get("email") as string | null)?.trim() ?? "";
              const password = (formData.get("password") as string | null)?.trim() ?? "";

              if (!firstName || !lastName || !email || !password) {
                setManualError("Please complete all required fields.");
                setIsManualSubmitting(false);
                return;
              }

              window.alert(
                "Manual signup is not yet available. Please use Google sign up in the meantime."
              );
              setIsManualSubmitting(false);
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  name="first-name"
                  placeholder="John"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  name="last-name"
                  placeholder="Doe"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Create a strong password"
                required
              />
            </div>

            {manualError ? (
              <p className="text-sm text-destructive" role="alert">
                {manualError}
              </p>
            ) : null}

            <Button className="w-full" type="submit" disabled={isManualSubmitting}>
              {isManualSubmitting ? "Processing…" : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm">
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
        </CardFooter>
        {isSubmitting ? (
          <div className="pb-4 text-center text-xs text-muted-foreground">
            Creating your account…
          </div>
        ) : null}
      </Card>
    </div>
  );
}
