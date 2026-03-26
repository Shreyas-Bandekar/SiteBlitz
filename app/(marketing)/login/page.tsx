"use client";

import Link from "next/link";
import { Suspense, type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          router.push(
            `/verify-email?required=1&email=${encodeURIComponent(email)}`,
          );
          return;
        }
        setError(data.error || "Login failed");
        return;
      }

      router.push(redirectTo as never);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-16 left-8 h-56 w-56 rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-lime-500/10 blur-[100px]" />
      </div>
      <Card className="liquid-glass-soft w-full border border-emerald-300/20">
        <CardHeader>
          <CardTitle className="text-emerald-100">Log in</CardTitle>
          <CardDescription className="text-emerald-100/65">
            Access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-lg border border-emerald-300/25 bg-black/45 px-3 py-2 text-emerald-50 outline-none transition focus:border-emerald-300/55"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full rounded-lg border border-emerald-300/25 bg-black/45 px-3 py-2 text-emerald-50 outline-none transition focus:border-emerald-300/55"
            />
            <Button
              type="submit"
              className="w-full bg-emerald-400 text-black hover:bg-emerald-300"
              isLoading={isLoading}
            >
              Log in
            </Button>
          </form>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <p className="mt-6 text-sm text-emerald-100/65">
            No account?{" "}
            <Link href="/signup" className="text-emerald-300 underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-sm text-emerald-100/65">
            Forgot password?{" "}
            <Link
              href="/forgot-password"
              className="text-emerald-300 underline"
            >
              Reset it
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md items-center px-4 py-10" />}>
      <LoginForm />
    </Suspense>
  );
}
