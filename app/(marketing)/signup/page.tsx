"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setMessage(data.message || "Signup successful. Redirecting...");
      setPassword("");
      // Redirect to dashboard after a delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-8 h-56 w-56 rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-lime-500/10 blur-[100px]" />
      </div>
      <Card className="liquid-glass-soft w-full border border-emerald-300/20">
        <CardHeader>
          <CardTitle className="text-emerald-100">Create account</CardTitle>
          <CardDescription className="text-emerald-100/65">
            Sign up with your email and password.
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
              placeholder="Password (min 8 chars)"
              required
              minLength={8}
              className="w-full rounded-lg border border-emerald-300/25 bg-black/45 px-3 py-2 text-emerald-50 outline-none transition focus:border-emerald-300/55"
            />
            <Button
              type="submit"
              className="w-full bg-emerald-400 text-black hover:bg-emerald-300"
              isLoading={isLoading}
            >
              Sign up
            </Button>
          </form>

          {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <p className="mt-6 text-sm text-emerald-100/65">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-300 underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
