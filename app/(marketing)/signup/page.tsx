"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = (await response.json()) as {
        error?: string;
        verificationUrl?: string;
      };
      if (!response.ok) {
        throw new Error(json.error || "Unable to create account");
      }

      if (json.verificationUrl) {
        setVerificationUrl(json.verificationUrl);
      }
      router.push("/verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 pt-20 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Sign up to store and access your audit history securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="confirmPassword"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {verificationUrl && (
              <p className="text-xs text-muted-foreground break-all">
                Dev verification link:{" "}
                <a className="underline" href={verificationUrl}>
                  {verificationUrl}
                </a>
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
