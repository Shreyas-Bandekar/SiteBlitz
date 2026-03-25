"use client";

import React from "react";
import * as Icons from "lucide-react";

export type MockupJson = {
  companyName: string;
  theme: "saas" | "ecommerce" | "agency" | "corporate";
  header: {
    navLinks: string[];
    ctaText: string;
  };
  hero: {
    badgeText: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaAction: string;
  };
  features: Array<{
    title: string;
    description: string;
    iconName?: string;
  }>;
  socialProof: {
    quote: string;
    author: string;
    role: string;
  };
  ctaSection: {
    headline: string;
    ctaText: string;
  };
};

const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  if (!name) return <Icons.CheckCircle className={className} />;
  const IconComponent = (Icons as any)[name] || Icons.CheckCircle;
  return <IconComponent className={className} />;
};

export default function MockupRenderer({ data }: { data?: MockupJson }) {
  if (!data) return null;

  const isEcom = data.theme === "ecommerce";

  const themeColors = isEcom 
    ? "bg-rose-50 text-rose-900 selection:bg-rose-500 selection:text-white"
    : "bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white";

  const primaryBtn = isEcom
    ? "bg-stone-900 hover:bg-stone-800 text-white shadow-stone-300"
    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200";

  const glowColor = isEcom ? "bg-rose-100" : "bg-indigo-100";
  const iconBg = isEcom ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600";
  const sectionBg = isEcom ? "bg-stone-50" : "bg-white";

  return (
    <div className={`w-full h-full overflow-y-auto font-sans pb-20 ${themeColors}`}>
      
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 md:px-10 md:py-5 border-b sticky top-0 z-50 backdrop-blur-md bg-white/70 border-white/20 shadow-sm`}>
        <div className="flex items-center gap-2 font-black text-xl md:text-2xl tracking-tight text-slate-900">
          {isEcom ? <Icons.ShoppingBag className="h-6 w-6" /> : <Icons.Layers className="h-6 w-6 text-indigo-600" />}
          <span className="truncate max-w-[150px] sm:max-w-none">{data.companyName || "Brand"}</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
          {data.header?.navLinks?.map((link, i) => (
             <a key={i} href="#" className="hover:text-slate-900 transition-colors">{link}</a>
          ))}
        </nav>
        <button className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 ${primaryBtn}`}>
          {data.header?.ctaText || "Get Started"}
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32 md:pt-36 md:pb-48 text-center max-w-6xl mx-auto flex flex-col items-center">
        <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] rounded-full blur-[100px] -z-10 opacity-60 ${glowColor}`} />
        
        {data.hero?.badgeText && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
            <span className={`flex h-2 w-2 rounded-full animate-pulse ${isEcom ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
            {data.hero.badgeText}
          </div>
        )}
        
        <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.05] max-w-5xl">
          {data.hero?.headline}
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          {data.hero?.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2 ${primaryBtn}`}>
            {data.hero?.ctaText}
            <Icons.ArrowRight className="h-5 w-5" />
          </button>
          {!isEcom && (
            <button className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg border border-slate-200 shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2">
              <Icons.PlayCircle className="h-5 w-5 text-slate-400" />
              Watch Demo
            </button>
          )}
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className={`px-6 py-24 md:py-32 ${sectionBg} border-y border-slate-200/50`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Everything you need</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Engineered for absolute performance and scale.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {data.features?.map((feature, idx) => (
              <div key={idx} className="group p-8 md:p-10 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${iconBg}`}>
                  <DynamicIcon name={feature.iconName} className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-24 md:py-32 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"1\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-10 flex justify-center text-amber-400 gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Icons.Star key={s} className="h-8 w-8 fill-current" />
            ))}
          </div>
          <blockquote className="text-3xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-16 tracking-tight">
            &quot;{data.socialProof?.quote}&quot;
          </blockquote>
          <div className="flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">
              {data.socialProof?.author?.charAt(0) || "U"}
            </div>
            <div className="font-bold text-xl">{data.socialProof?.author}</div>
            <div className="text-slate-400 font-medium">{data.socialProof?.role}</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 md:py-32 bg-white">
        <div className={`max-w-5xl mx-auto rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl ${
          isEcom ? "bg-gradient-to-br from-rose-600 to-rose-800" : "bg-gradient-to-br from-indigo-600 to-violet-800"
        }`}>
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            {isEcom ? <Icons.ShoppingBag className="w-96 h-96 text-white" /> : <Icons.Zap className="w-96 h-96 text-white" />}
          </div>
          <div className="relative z-10 text-white">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-8 max-w-3xl mx-auto tracking-tight leading-tight">
              {data.ctaSection?.headline}
            </h2>
            <button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-bold text-xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 mx-auto">
              {data.ctaSection?.ctaText}
              <Icons.ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </section>
      
    </div>
  );
}

