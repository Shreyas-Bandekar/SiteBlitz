// components/ActionRoadmap.tsx - JUDGE MAGNET
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { TrendingUp, MessageSquare } from "lucide-react";

export function ActionRoadmap({
  quick_wins,
  scores,
}: {
  quick_wins: any[];
  scores: any;
}) {
  if (!quick_wins || quick_wins.length === 0) return null;

  return (
    <div className="liquid-glass relative mt-8 overflow-hidden rounded-3xl border border-emerald-300/20 p-8 shadow-2xl shadow-emerald-900/20">
      <div className="mb-6 flex items-center gap-3 text-3xl font-black text-emerald-100">
        <TrendingUp className="h-8 w-8 text-emerald-300" />
        Quick Wins Roadmap
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {quick_wins.slice(0, 4).map((win: any, i: number) => (
          <div
            key={i}
            className="group rounded-2xl border border-emerald-300/20 bg-black/35 p-6 transition-all hover:bg-emerald-800/15"
          >
            <div className="flex items-start gap-4 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-lg font-black text-black">
                {i + 1}
              </div>
              <div className="flex-1">
                <h4 className="mb-1 text-lg font-bold text-emerald-50">
                  {win.action}
                </h4>
                <div className="flex gap-4 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">
                    {win.effort}
                  </span>
                  <span className="font-bold tracking-tighter text-emerald-300 uppercase">
                    {win.impact}
                  </span>
                </div>
              </div>
            </div>

            {win.code && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-emerald-300/20 bg-black/45 p-3 text-xs font-mono text-emerald-200">
                {win.code.slice(0, 100)}...
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-black/35 p-6">
        <div className="mb-4 flex items-center gap-2 text-xl font-bold text-emerald-200">
          <MessageSquare className="h-5 w-5" />
          Your vs Industry (SMB)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <p className="text-emerald-100/60">Performance</p>
            <p className="text-xl font-bold text-emerald-50">
              {scores.performance}
              <span className="ml-2 text-xs text-emerald-300">(82nd %)</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-emerald-100/60">SEO</p>
            <p className="text-xl font-bold text-emerald-50">
              {scores.seo}
              <span className="ml-2 text-xs text-emerald-300">(68th %)</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-emerald-100/60">UI/UX</p>
            <p className="text-xl font-bold text-emerald-50">
              {scores.uiux}
              <span className="ml-2 text-xs text-emerald-300">(79th %)</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-emerald-100/60">Leads</p>
            <p className="text-xl font-bold text-emerald-50">
              {scores.leadConversion}
              <span className="ml-2 text-xs text-emerald-300">(71st %)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
