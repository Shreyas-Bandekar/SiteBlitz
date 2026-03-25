"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Zap } from "lucide-react";
import { Badge } from "./ui/Badge";

type ScoreTableProps = {
  uxIssues: string[];
  leadIssues: string[];
  deviceResults?: Array<{ device: string; tapTargetsOk: boolean; smallTargets: number }>;
  uxScore?: number;
  leadScore?: number;
};

export function ScoreTable({ uxIssues, leadIssues, deviceResults, uxScore, leadScore }: ScoreTableProps) {
  const allIssues = [
    ...uxIssues.map((i) => ({ source: "UX Rules", detail: i })),
    ...leadIssues.map((i) => ({ source: "Lead Gen", detail: i })),
  ];

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-indigo-500/20 flex flex-wrap items-center gap-3">
        <Shield className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest">
          Manual Rules — Score Table
        </span>
        <Badge variant="outline" className="border-indigo-400/40 text-indigo-400 text-[10px] ml-auto">
          No AI Dependency
        </Badge>
        <Badge variant="secondary">AI + 25 Manual Rules</Badge>
      </div>

      {/* Score summary row */}
      <div className="grid grid-cols-3 divide-x divide-indigo-500/20 border-b border-indigo-500/20">
        {[
          { label: "UX Score", value: uxScore ?? "—", unit: "/100" },
          { label: "Lead Gen Score", value: leadScore ?? "—", unit: "/100" },
          { label: "Issues Found", value: allIssues.length, unit: "" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center py-4 gap-1">
            <span className="text-2xl font-black text-foreground">
              {stat.value}
              <span className="text-xs font-normal text-muted-foreground">{stat.unit}</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Issues table */}
      {allIssues.length > 0 ? (
        <div className="divide-y divide-border/40">
          {allIssues.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 px-5 py-3 hover:bg-indigo-500/5 transition-colors">
              <Badge
                variant="outline"
                className={`mt-0.5 shrink-0 text-[9px] px-1.5 ${
                  item.source === "UX Rules"
                    ? "border-violet-500/40 text-violet-400"
                    : "border-emerald-500/40 text-emerald-400"
                }`}
              >
                {item.source}
              </Badge>
              <p className="text-sm text-foreground/80 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">No manual rule issues detected.</p>
      )}

      {/* Device Results */}
      {deviceResults && deviceResults.length > 0 && (
        <div className="border-t border-indigo-500/20 px-5 py-4">
          <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3">Device Tap Target Check</p>
          <div className="flex flex-wrap gap-3">
            {deviceResults.map((d) => (
              <div
                key={d.device}
                className={`flex flex-col rounded-lg px-3 py-2 text-center border ${
                  d.tapTargetsOk
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/5 text-rose-400"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">{d.device}</span>
                <span className="text-lg font-black leading-none mt-1">
                  {d.tapTargetsOk ? "✓" : `${d.smallTargets} small`}
                </span>
                <span className="text-[9px] opacity-70 mt-0.5">{d.tapTargetsOk ? "Pass" : "Fail"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ManualModeToggle({
  manualMode,
  onToggle,
}: {
  manualMode: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!manualMode)}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
        manualMode
          ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300 shadow-lg shadow-indigo-500/10"
          : "border-border bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      <Zap className={`h-4 w-4 ${manualMode ? "text-indigo-400" : "text-muted-foreground"}`} />
      {manualMode ? "Manual Rules Active" : "Manual Mode"}
      {manualMode ? (
        <ChevronUp className="h-3 w-3 opacity-60" />
      ) : (
        <ChevronDown className="h-3 w-3 opacity-60" />
      )}
    </button>
  );
}
