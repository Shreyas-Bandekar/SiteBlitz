"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await response.json()) as {
        error?: string;
        message?: string;
        resetUrl?: string;
      };
      if (!response.ok) {
        throw new Error(json.error || "Unable to request reset");
      }
      setMessage(
        json.message || "If the account exists, a reset link has been sent.",
      );
      if (json.resetUrl) {
        setResetUrl(json.resetUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 pt-20 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>
            Enter your account email to receive a reset link.
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

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-foreground/80">{message}</p>}
            {resetUrl && (
              <p className="break-all text-xs text-muted-foreground">
                Dev reset link:{" "}
                <a className="underline" href={resetUrl}>
                  {resetUrl}
                </a>
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={loading}>
              Send reset link
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Back to{" "}
              <Link href="/login" className="underline text-foreground">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
