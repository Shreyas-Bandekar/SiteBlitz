"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const mustVerify = searchParams.get("required") === "1";

  const [token, setToken] = useState(tokenFromUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const verifyToken = async (value: string) => {
    if (!value) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setMessage(data.message || "Email verified");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      void verifyToken(tokenFromUrl);
    }
    // tokenFromUrl is intentionally a one-time trigger for auto-verify.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyToken(token);
  };

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-16 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-lime-500/10 blur-[100px]" />
      </div>
      <Card className="liquid-glass-soft w-full border border-emerald-300/20">
        <CardHeader>
          <CardTitle className="text-emerald-100">Verify email</CardTitle>
          <CardDescription className="text-emerald-100/65">
            {mustVerify
              ? "Verify your email to access protected pages."
              : "Enter your verification token."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Verification token"
              required
              className="w-full rounded-lg border border-emerald-300/25 bg-black/45 px-3 py-2 text-emerald-50 outline-none transition focus:border-emerald-300/55"
            />
            <Button
              type="submit"
              className="w-full bg-emerald-400 text-black hover:bg-emerald-300"
              isLoading={isLoading}
            >
              Verify
            </Button>
          </form>

          {message && <p className="mt-4 text-sm text-success">{message}</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

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
