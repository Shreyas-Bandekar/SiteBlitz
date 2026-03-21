"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <article className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{desc}</p>
    </article>
  );
}

export default function MarketingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    router.push(`/audit?url=${encodeURIComponent(target)}&autoStart=1`);
  };

  return (
    <main className="min-h-screen">
      <section className="hero-gradient min-h-screen">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center rounded-full bg-white/10 px-6 py-3 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">10K+ sites audited</span>
            </div>
            <h1 className="mb-8 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-6xl font-black leading-tight text-transparent md:text-7xl">
              AI Website Auditor
            </h1>
            <p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-white/90 md:text-2xl">
              Enter any URL. Get instant 6-category scores and a live business-impact roadmap in seconds.
            </p>

            <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl flex-col items-center gap-4 sm:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourwebsite.com"
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-lg text-white placeholder:text-white/70 outline-none backdrop-blur-sm"
              />
              <button className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-10 py-4 text-lg font-bold text-white shadow-2xl transition hover:shadow-emerald-500/30 sm:w-auto">
                ANALYZE LIVE
              </button>
            </form>
            <p className="mt-4 text-sm text-white/70">LIVE DATA ONLY - no mock, no fallback</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="📱" title="Mobile-First Audit" desc="Real iPhone rendering and tap-target checks." />
            <FeatureCard icon="⚡" title="Lighthouse Scores" desc="Performance, SEO, and accessibility from Chrome tooling." />
            <FeatureCard icon="🧠" title="AI Insights" desc="Local Ollama explains business impact in plain language." />
            <FeatureCard icon="🔎" title="Live DOM Parsing" desc="Title, meta, heading, form, and CTA extraction from target HTML." />
            <FeatureCard icon="📸" title="Visual Capture" desc="Full desktop and mobile screenshots per audit run." />
            <FeatureCard icon="🗄" title="Live Audit History" desc="Persisted audits in Postgres with time-stamped records." />
          </div>
        </div>
      </section>
    </main>
  );
}
