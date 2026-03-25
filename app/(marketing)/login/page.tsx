"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = (await response.json()) as {
        error?: string;
        user?: { emailVerified?: boolean };
      };
      if (!response.ok) {
        throw new Error(json.error || "Unable to login");
      }

      if (json.user?.emailVerified === false) {
        router.push("/verify-email");
        return;
      }

      const nextPath = searchParams.get("next") || "/audit";
      window.location.href = nextPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 pt-20 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Access your account and personal audit history.
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Log in
            </Button>

            <p className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-foreground underline"
              >
                Forgot password?
              </Link>
            </p>

            <p className="text-center text-sm text-muted-foreground">
              Need an account?{" "}
              <Link href="/signup" className="text-foreground underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
