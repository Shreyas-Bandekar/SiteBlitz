"use client";

const stages = [
  "validate-url",
  "playwright-desktop",
  "axe-accessibility",
  "playwright-mobile",
  "puppeteer-screenshot",
  "lighthouse",
  "report-assembly",
  "ai:model",
];

export default function LiveScanningAnimation({ active }: { active: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h3 className="text-xl font-semibold text-white">Live Pipeline</h3>
      <div className="mt-4 space-y-3">
        {stages.map((stage, index) => {
          const done = index <= active;
          return (
            <div key={stage} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-white/85">{stage}</span>
                <span className={done ? "text-emerald-300" : "text-white/40"}>{done ? "done" : "pending"}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: done ? "100%" : "10%" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
