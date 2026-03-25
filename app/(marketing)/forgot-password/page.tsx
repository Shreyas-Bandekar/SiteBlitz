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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetToken(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process request");
        return;
      }

      setMessage(data.message || "Reset token generated");
      setResetToken(data.resetToken || null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-16 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-lime-500/10 blur-[100px]" />
      </div>
      <Card className="liquid-glass-soft w-full border border-emerald-300/20">
        <CardHeader>
          <CardTitle className="text-emerald-100">Forgot password</CardTitle>
          <CardDescription className="text-emerald-100/65">
            Generate a password reset token for your account.
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
            <Button
              type="submit"
              className="w-full bg-emerald-400 text-black hover:bg-emerald-300"
              isLoading={isLoading}
            >
              Generate reset token
            </Button>
          </form>

          {message && <p className="mt-4 text-sm text-success">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {resetToken && (
            <div className="mt-4 rounded-lg border border-emerald-300/20 bg-black/35 p-3 text-sm text-emerald-100/80">
              <p className="mb-2">Use this reset token:</p>
              <p className="break-all font-mono text-xs">{resetToken}</p>
              <Link
                href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                className="mt-3 inline-block text-sm text-emerald-300 underline"
              >
                Go to reset page
              </Link>
            </div>
          )}

          <p className="mt-6 text-sm text-emerald-100/65">
            Back to{" "}
            <Link href="/login" className="text-emerald-300 underline">
              login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
