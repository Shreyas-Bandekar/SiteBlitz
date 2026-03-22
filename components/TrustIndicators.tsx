"use client";

import type { TrustBreakdown, TrustLevel } from "../lib/audit-types";
import { trustBadgeLabel } from "../lib/trust";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Info, Shield } from "lucide-react";

const LEVEL_STYLES: Record<TrustLevel, string> = {
  VERIFIED: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  ESTIMATED: "bg-amber-500/20 text-amber-100 border-amber-400/40",
  INFERRED: "bg-violet-500/20 text-violet-100 border-violet-400/40",
  FALLBACK: "bg-rose-500/20 text-rose-100 border-rose-400/40",
};

export function TrustLevelBadge({ level, className = "" }: { level: TrustLevel; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LEVEL_STYLES[level]} ${className}`}
      title={level}
    >
      {trustBadgeLabel(level)}
    </span>
  );
}

const LEGEND = [
  { level: "VERIFIED" as const, text: "Real measured data" },
  { level: "ESTIMATED" as const, text: "Based on benchmarks" },
  { level: "INFERRED" as const, text: "AI-generated" },
  { level: "FALLBACK" as const, text: "Limited due to scan issues" },
];

export function TrustScoreCard(props: {
  overallTrustScore: number;
  trustBreakdown: TrustBreakdown;
  scanBlockedOrDegraded?: boolean;
}) {
  const { overallTrustScore, trustBreakdown, scanBlockedOrDegraded } = props;
  const sub =
    overallTrustScore >= 75
      ? "Based primarily on live measurements."
      : overallTrustScore >= 55
        ? "Based on live measurements and partial estimations."
        : "Based on limited live data — several signals used fallback paths.";

  return (
    <Card className="border-white/15 bg-gradient-to-br from-white/10 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Shield className="h-5 w-5 text-cyan-300" />
          Trust Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {overallTrustScore}
            <span className="text-lg font-medium text-muted-foreground">/100</span>
          </p>
          <div className="group relative inline-flex">
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Trust legend"
            >
              <Info className="h-4 w-4" />
            </button>
            <div className="invisible absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg group-hover:visible group-focus-within:visible">
              <p className="mb-2 font-semibold text-foreground">Reliability labels</p>
              <ul className="space-y-1.5">
                {LEGEND.map((row) => (
                  <li key={row.level} className="flex items-start gap-2">
                    <TrustLevelBadge level={row.level} />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{sub}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>Live {trustBreakdown.verified}%</span>
          <span>·</span>
          <span>Est. {trustBreakdown.estimated}%</span>
          <span>·</span>
          <span>AI {trustBreakdown.inferred}%</span>
          <span>·</span>
          <span>Limited {trustBreakdown.fallback}%</span>
        </div>
        {scanBlockedOrDegraded ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Some data could not be verified due to site restrictions or degraded scan paths.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
