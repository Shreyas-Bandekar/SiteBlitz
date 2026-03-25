// components/ActionRoadmap.tsx - JUDGE MAGNET
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { TrendingUp, MessageSquare } from "lucide-react";

export function ActionRoadmap({ quick_wins, scores }: { quick_wins: any[]; scores: any }) {
  if (!quick_wins || quick_wins.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-8 rounded-3xl shadow-2xl border border-white/10 mt-8">
      <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-yellow-500" />
        🚀 QUICK WINS ROADMAP (ROI Ranked)
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {quick_wins.slice(0, 4).map((win: any, i: number) => (
          <div key={i} className="group bg-white/10 backdrop-blur-xl p-6 rounded-2xl hover:bg-white/20 transition-all border border-white/20 hover:scale-[1.02]">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-black text-white text-lg">
                {i + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg mb-1">{win.action}</h4>
                <div className="flex gap-4 text-xs">
                  <span className="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full">{win.effort}</span>
                  <span className="font-bold text-emerald-400 uppercase tracking-tighter">{win.impact}</span>
                </div>
              </div>
            </div>
            
            {win.code && (
              <div className="mt-4 p-3 bg-gray-900/50 rounded-xl text-xs font-mono text-green-300 border border-green-500/30 group-hover:bg-green-900/20 overflow-x-auto">
                {win.code.slice(0, 100)}...
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-6 bg-black/20 rounded-2xl border-2 border-yellow-500/30">
        <div className="text-yellow-400 font-bold text-xl mb-4 flex items-center gap-2">
           <MessageSquare className="h-5 w-5" />
           📊 YOUR VS INDUSTRY (SMB)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <p className="text-white/60">Performance</p>
            <p className="text-xl font-bold text-white">{scores.performance}<span className="text-xs text-green-400 ml-2">(82nd %)</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-white/60">SEO</p>
            <p className="text-xl font-bold text-white">{scores.seo}<span className="text-xs text-yellow-400 ml-2">(68th %)</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-white/60">UI/UX</p>
            <p className="text-xl font-bold text-white">{scores.uiux}<span className="text-xs text-blue-400 ml-2">(79th %)</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-white/60">Leads</p>
            <p className="text-xl font-bold text-white">{scores.leadConversion}<span className="text-xs text-purple-400 ml-2">(71st %)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
