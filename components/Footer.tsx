import Link from "next/link";
import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-emerald-300/15 bg-black/65 py-12 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-300">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-emerald-100">
                SiteBlitz
              </span>
            </Link>
            <p className="max-w-xs text-sm text-emerald-100/60">
              The AI-powered website auditor that helps you ship faster, better,
              and with absolute confidence.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-emerald-100">Product</h4>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Features
            </Link>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Pricing
            </Link>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Changelog
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-emerald-100">Resources</h4>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Documentation
            </Link>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Blog
            </Link>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Support
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-emerald-100">Legal</h4>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-emerald-100/65 transition-colors hover:text-emerald-300"
            >
              Terms of Service
            </Link>
          </div>
        </div>
        <div className="mt-12 border-t border-emerald-300/15 pt-8 text-center text-sm text-emerald-100/55">
          © {new Date().getFullYear()} SiteBlitz by Shreyas. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
