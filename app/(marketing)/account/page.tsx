"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function AccountPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Logout failed");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative mx-auto w-full max-w-xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-12 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-[110px]" />
      </div>
      <Card className="liquid-glass-soft border border-emerald-300/20">
        <CardHeader>
          <CardTitle className="text-emerald-100">Account</CardTitle>
          <CardDescription className="text-emerald-100/65">
            Manage your active session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onLogout}
            isLoading={isLoading}
            className="bg-emerald-400 text-black hover:bg-emerald-300"
          >
            Logout
          </Button>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
