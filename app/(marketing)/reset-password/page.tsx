"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Missing or invalid reset token");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(json.error || "Unable to reset password");
      }

      setMessage(json.message || "Password updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 pt-20 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>This link expires after one hour.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="password"
              >
                New password
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
            {message && <p className="text-sm text-success">{message}</p>}

            <Button type="submit" className="w-full" isLoading={loading}>
              Update password
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
