import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,

  Eye,
  Gauge,
  History as HistoryIcon,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

function SectionHeading({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <p className="mb-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
        {badge}
      </p>
      <h2 className="text-balance text-3xl font-black tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-muted-foreground md:text-lg">{subtitle}</p>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <main className="flex min-h-screen flex-col pt-14">
      <section className="relative overflow-hidden border-b border-emerald-300/10 bg-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-green-700/20 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-lime-500/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-5 inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <Activity className="mr-2 h-3.5 w-3.5" />
              AI Website Auditor for Teams and Agencies
            </p>
            <h1 className="text-balance text-5xl font-black tracking-tight text-foreground md:text-7xl">
              Audit, Compare, Improve.
              <span className="block text-emerald-300">
                All in One Workspace.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              SiteBlitz scans real websites, calculates actionable score
              breakdowns, compares competitors, and creates clear fix roadmaps
              with AI-powered business insights.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/audit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-400 px-8 text-sm font-medium text-black shadow-sm transition-colors hover:bg-emerald-300"
              >
                Start Auditing Now
              </Link>
            </div>
          </div>

          <div className="liquid-glass liquid-highlight rounded-2xl p-6">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-emerald-300">
              Live Platform Snapshot
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Score Dimensions", value: "6+" },
                { label: "Live Metrics", value: "50+" },
                { label: "Audit Modes", value: "3" },
                { label: "Export Ready", value: "PDF" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-emerald-200/15 bg-black/35 p-4"
                >
                  <p className="text-2xl font-black text-emerald-200">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-emerald-100/70">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Performance, SEO, accessibility, UI/UX, mobile, and lead conversion",
                "Competitor comparison with side-by-side deltas",
                "History-backed iterative optimization",
              ].map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2 text-sm text-emerald-100/85"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-b border-emerald-300/10 bg-card/30 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            badge="Features"
            title="What SiteBlitz Does"
            subtitle="Everything required to evaluate website quality, benchmark against competition, and execute improvements quickly."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ScanLine,
                title: "Real Website Audit",
                desc: "Run live scans against actual URLs with deterministic scores and evidence-backed issues.",
              },
              {
                icon: Bot,
                title: "AI Business Insights",
                desc: "Get plain-language recommendations that connect technical fixes to business outcomes.",
              },
              {
                icon: ArrowRight,
                title: "Action Roadmaps",
                desc: "Prioritized next steps grouped by impact so teams can execute without confusion.",
              },
              {
                icon: TrendingUp,
                title: "Competitor Compare",
                desc: "Compare two sites instantly and view metric-by-metric advantages and gaps.",
              },
              {
                icon: HistoryIcon,
                title: "Audit History",
                desc: "Track previous runs to validate whether your optimizations are improving results.",
              },
              {
                icon: ShieldCheck,
                title: "Secure Access",
                desc: "Authentication-protected workflows with verified accounts and session control.",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title}>
                  <Card className="h-full border-emerald-300/15 bg-black/45">
                    <CardHeader>
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-b border-emerald-300/10 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            badge="Workflow"
            title="How It Works"
            subtitle="A simple 4-step process from scan to execution."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Gauge,
                title: "1. Enter URL",
                text: "Paste any website URL to begin a comprehensive audit.",
              },
              {
                icon: Gauge,
                title: "2. Run Audit",
                text: "Scan your website to collect performance, SEO, UX, and conversion signals.",
              },
              {
                icon: Target,
                title: "3. Compare & Analyze",
                text: "Review score breakdowns and run competitor comparisons.",
              },
              {
                icon: Sparkles,
                title: "4. Improve",
                text: "Follow roadmap recommendations and track progress over time.",
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-emerald-300/15 bg-black/35 p-5"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="use-cases"
        className="border-b border-emerald-300/10 bg-card/20 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            badge="Use Cases"
            title="Who Uses SiteBlitz"
            subtitle="Built for teams that need speed, confidence, and measurable improvements."
          />

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Agencies",
                text: "Generate client audit reports quickly and communicate improvement priorities clearly.",
                icon: BarChart3,
              },
              {
                title: "Product Teams",
                text: "Track UX and conversion quality before launches and after releases.",
                icon: Eye,
              },
              {
                title: "Founders",
                text: "Identify high-impact fixes without needing a full in-house performance team.",
                icon: Clock3,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="border-emerald-300/15 bg-black/40"
                >
                  <CardHeader>
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.text}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-emerald-300/10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            badge="Pricing"
            title="Simple Plans"
            subtitle="Start with core capabilities and scale when your audit volume grows."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-emerald-300/15 bg-black/45">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>
                  For individual builders and small projects.
                </CardDescription>
                <p className="mt-3 text-4xl font-black text-foreground">
                  $0
                  <span className="ml-1 text-lg text-muted-foreground">
                    /mo
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Core website audits</p>
                <p>• Basic competitor compare</p>
                <p>• 7-day history</p>
                <Link
                  href="/audit"
                  className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Start Free
                </Link>
              </CardContent>
            </Card>

            <Card className="border-emerald-400/25 bg-emerald-500/10">
              <CardHeader>
                <div className="mb-2 inline-flex w-fit rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-black">
                  Popular
                </div>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>
                  For agencies and teams shipping frequently.
                </CardDescription>
                <p className="mt-3 text-4xl font-black text-foreground">
                  $29
                  <span className="ml-1 text-lg text-muted-foreground">
                    /mo
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-emerald-100/85">
                <p>• Unlimited audits</p>
                <p>• Advanced AI insights</p>
                <p>• Extended history and exports</p>
                <Link
                  href="/audit"
                  className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  Upgrade to Pro
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        id="testimonials"
        className="border-b border-emerald-300/10 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            badge="Testimonials"
            title="Teams Trust SiteBlitz"
            subtitle="Used to speed up audits and make optimization decisions with confidence."
          />

          <div className="grid gap-5 md:grid-cols-3">
            {[
              "SiteBlitz gave us audit-ready reports in minutes and cut our prep time dramatically.",
              "The compare mode helped us identify exactly where competitors were beating us.",
              "Our team now has a repeatable workflow for weekly quality checks.",
            ].map((quote, idx) => (
              <Card key={quote} className="border-emerald-300/15 bg-black/35">
                <CardContent className="p-6">
                  <p className="text-sm text-emerald-200/80">{quote}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Team {idx + 1}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading
            badge="FAQ"
            title="Common Questions"
            subtitle="Everything you need before starting your first audit."
          />

          <div className="space-y-3">
            {[
              {
                q: "Do I need to log in before running audits?",
                a: "No. All audit features are available without any login. Just enter a URL and start.",
              },
              {
                q: "Can I compare my site with a competitor?",
                a: "Yes. Compare mode runs both websites and shows direct score deltas.",
              },
              {
                q: "Does SiteBlitz save my past audits?",
                a: "Yes. Each successful run is stored and visible in audit history.",
              },
              {
                q: "Can non-technical users understand results?",
                a: "Yes. Reports include plain-language summaries and prioritized action steps.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-emerald-300/15 bg-black/40 p-4"
              >
                <p className="font-semibold text-foreground">{item.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-100">
              Ready to audit your website properly?
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/audit"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Start Auditing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
