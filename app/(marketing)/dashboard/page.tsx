import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import {
  ArrowRightLeft,
  Gauge,
  History,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { getCurrentUser } from "../../../lib/auth/current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.emailVerified) {
    redirect("/verify-email?required=1");
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="float-slow absolute -top-16 left-12 h-60 w-60 rounded-full bg-emerald-500/20 blur-[110px]" />
        <div className="float-slow absolute right-4 top-20 h-72 w-72 rounded-full bg-green-700/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-lime-500/10 blur-[120px]" />
      </div>

      <section className="liquid-glass liquid-highlight relative overflow-hidden rounded-2xl p-8">
        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Badge className="mb-4 border border-emerald-300/20 bg-emerald-500/15 text-emerald-200">
            Verified Account
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-emerald-50 md:text-4xl">
            Welcome back, {user.email}
          </h1>
          <p className="mt-2 max-w-2xl text-emerald-100/70">
            Run audits, compare competitors, and review history from one
            workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/audit?mode=main"
              className="group inline-flex items-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300"
            >
              Run Main Audit
              <ArrowUpRight className="ml-1 h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/audit?mode=compare"
              className="rounded-md border border-emerald-300/25 bg-black/40 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/20"
            >
              Open Compare Mode
            </Link>
            <Link
              href="/audit?mode=history"
              className="rounded-md border border-emerald-300/25 bg-black/40 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/20"
            >
              View Audit History
            </Link>
            <Link
              href="/account"
              className="rounded-md border border-emerald-300/25 bg-black/40 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/20"
            >
              Manage Account
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <Card className="liquid-glass-soft animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-100">
              <Gauge className="h-5 w-5" /> Main Audit
            </CardTitle>
            <CardDescription className="text-emerald-100/65">
              Deep single-site health checks with AI-enhanced summaries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/audit?mode=main"
              className="text-sm font-semibold text-emerald-300 underline"
            >
              Start now
            </Link>
          </CardContent>
        </Card>

        <Card className="liquid-glass-soft animate-in fade-in slide-in-from-bottom-2 duration-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-100">
              <ArrowRightLeft className="h-5 w-5" /> Competitor Compare
            </CardTitle>
            <CardDescription className="text-emerald-100/65">
              Side-by-side metric deltas between two websites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/audit?mode=compare"
              className="text-sm font-semibold text-emerald-300 underline"
            >
              Compare two sites
            </Link>
          </CardContent>
        </Card>

        <Card className="liquid-glass-soft animate-in fade-in slide-in-from-bottom-2 duration-1000">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-100">
              <ShieldCheck className="h-5 w-5" /> Session
            </CardTitle>
            <CardDescription className="text-emerald-100/65">
              Authenticated and email-verified access is active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-emerald-100/70">
            <p>Email: {user.email}</p>
            <p>Created: {new Date(user.createdAt).toLocaleString()}</p>
            <p>Verified: Yes</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-1">
        <Card className="liquid-glass-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-emerald-100">
              <History className="h-5 w-5" /> Account Actions
            </CardTitle>
            <CardDescription className="text-emerald-100/65">
              Quick access to core account operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/account"
              className="rounded-md border border-emerald-300/25 bg-black/50 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800/20"
            >
              Open account
            </Link>
            <Link
              href="/audit?mode=history"
              className="rounded-md border border-emerald-300/25 bg-black/50 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800/20"
            >
              Open audit history
            </Link>
            <Link
              href="/forgot-password"
              className="rounded-md border border-emerald-300/25 bg-black/50 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800/20"
            >
              Reset password
            </Link>
            <Link
              href="/audit"
              className="rounded-md border border-emerald-300/25 bg-black/50 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800/20"
            >
              Go to audit workspace
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-900/30 to-black p-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="flex items-center gap-2 text-emerald-200">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm font-medium">Liquid Glass Theme Active</p>
        </div>
      </section>
    </main>
  );
}
