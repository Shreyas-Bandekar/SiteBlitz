"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { Activity, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; email: string };

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const readSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!isMounted) return;

        if (!res.ok) {
          setAuthState({ status: "guest" });
          return;
        }

        const data = (await res.json()) as { user?: { email?: string } };
        if (data.user?.email) {
          setAuthState({ status: "authenticated", email: data.user.email });
          return;
        }

        setAuthState({ status: "guest" });
      } catch {
        if (!isMounted) return;
        setAuthState({ status: "guest" });
      }
    };

    void readSession();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const onLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthState({ status: "guest" });
      router.push("/login");
      router.refresh();
      setIsOpen(false);
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-emerald-300/15 bg-black/75 backdrop-blur supports-[backdrop-filter]:bg-black/55">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-400 text-black">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-emerald-100">
            SiteBlitz
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-emerald-100/70 transition-colors hover:text-emerald-200"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-emerald-100/70 transition-colors hover:text-emerald-200"
          >
            Pricing
          </Link>
          <Link
            href="#testimonials"
            className="text-sm font-medium text-emerald-100/70 transition-colors hover:text-emerald-200"
          >
            Testimonials
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          {authState.status === "authenticated" ? (
            <>
              <span className="hidden text-xs text-emerald-100/60 sm:inline">
                {authState.email}
              </span>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-sm"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </Button>
              <Button
                variant="default"
                className="text-sm bg-emerald-400 text-black hover:bg-emerald-300"
                onClick={onLogout}
              >
                Logout
              </Button>
            </>
          ) : authState.status === "loading" ? (
            <Button variant="ghost" className="text-sm" disabled>
              Loading...
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-sm"
                onClick={() => router.push("/login")}
              >
                Sign In
              </Button>
              <Button
                variant="default"
                className="text-sm bg-emerald-400 text-black hover:bg-emerald-300"
                onClick={() => router.push("/signup")}
              >
                Get Started
              </Button>
            </>
          )}
          <button
            type="button"
            className="md:hidden inline-flex p-2 text-emerald-100 focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden border-t border-emerald-300/15 bg-black/80 px-6 py-4 pb-6 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4">
            <Link
              href="#features"
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-emerald-100/70 transition-colors hover:text-emerald-200"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-emerald-100/70 transition-colors hover:text-emerald-200"
            >
              Pricing
            </Link>
            <Link
              href="#testimonials"
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-emerald-100/70 transition-colors hover:text-emerald-200"
            >
              Testimonials
            </Link>
            <div className="mt-2 flex flex-col gap-2 text-sm text-emerald-100/80">
              {authState.status === "authenticated" ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full text-sm"
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/dashboard");
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="default"
                    className="w-full text-sm bg-emerald-400 text-black hover:bg-emerald-300"
                    onClick={onLogout}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login");
                  }}
                >
                  Sign In
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
