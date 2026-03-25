"use client";

import { useEffect, useState } from "react";
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

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState(
    "Use the verification link sent to your email.",
  );
  const [verificationUrl, setVerificationUrl] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    let mounted = true;
    const verify = async () => {
      setStatus("loading");
      const response = await fetch(
        `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      );
      const json = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!mounted) return;

      if (!response.ok) {
        setStatus("error");
        setMessage(json.error || "Verification failed");
        return;
      }

      setStatus("success");
      setMessage(
        json.message ||
          "Email verified successfully. You can now use all features.",
      );
    };

    void verify();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const resend = async () => {
    setStatus("loading");
    setVerificationUrl("");
    const response = await fetch("/api/auth/request-verification", {
      method: "POST",
    });
    const json = (await response.json()) as {
      error?: string;
      message?: string;
      verificationUrl?: string;
    };
    if (!response.ok) {
      setStatus("error");
      setMessage(json.error || "Unable to send verification link");
      return;
    }

    setStatus("idle");
    setMessage(json.message || "Verification link sent.");
    if (json.verificationUrl) {
      setVerificationUrl(json.verificationUrl);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 pt-20 pb-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            Verification is required before running audits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/90">{message}</p>

          {verificationUrl && (
            <p className="break-all text-xs text-muted-foreground">
              Dev verification link:{" "}
              <a className="underline" href={verificationUrl}>
                {verificationUrl}
              </a>
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={resend} isLoading={status === "loading"}>
              Resend verification email
            </Button>
            <Link href="/audit">
              <Button variant="outline">Go to dashboard</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Back to login</Button>
            </Link>
          </div>

          {status === "success" && (
            <p className="text-sm text-success">Email verified successfully.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">
              Verification failed. Request a new link.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
