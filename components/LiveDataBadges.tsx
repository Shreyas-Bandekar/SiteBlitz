"use client";

import React from "react";

interface LiveDataSource {
  name: string;
  timestamp: string;
  method: string;
  confidence?: number;
}

interface LiveDataBadgesProps {
  sources: LiveDataSource[];
  isLive: boolean;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function LiveDataBadges({ sources, isLive }: LiveDataBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {isLive && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-300/45 backdrop-blur-sm">
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-semibold text-emerald-200">
            Live Data
          </span>
        </div>
      )}

      {sources.map((source, idx) => (
        <div
          key={idx}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-3 py-2 backdrop-blur-sm transition-colors hover:bg-emerald-500/15"
        >
          <span className="text-xs font-mono text-emerald-200">
            {source.name}
          </span>
          <span className="text-xs text-emerald-100/65">
            {formatTimestamp(source.timestamp)}
          </span>
          {source.confidence && (
            <span className="text-xs font-semibold text-emerald-300">
              {source.confidence}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Competitor Live Badge - Show when competitor audited with timestamp
 */
export function CompetitorLiveBadge({
  auditedDate,
  sourceType,
}: {
  auditedDate: string;
  sourceType: "live" | "pre-audited";
}) {
  const isLive = sourceType === "live";

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-emerald-300/35 bg-emerald-500/10 px-2 py-1 text-xs font-medium">
      {isLive && (
        <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
      )}
      <span className={isLive ? "text-emerald-200" : "text-emerald-100/75"}>
        {formatTimestamp(auditedDate)}
      </span>
    </div>
  );
}

/**
 * ROI Source Badge - Show PageSpeed/API source
 */
export function ROISourceBadge({ source }: { source: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-500/10 px-3 py-1 text-xs font-medium">
      <span className="text-emerald-200">📊 {source}</span>
    </div>
  );
}

/**
 * Industry Detection Badge - Show method and confidence
 */
export function IndustryBadge({
  category,
  confidence,
  method,
}: {
  category: string;
  confidence: number;
  method: string;
}) {
  const displayCategory = category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-3 py-2 backdrop-blur-sm">
      <span className="text-sm font-semibold text-emerald-200">
        🧠 {displayCategory}
      </span>
      <span className="text-xs text-emerald-300">{confidence}%</span>
      <span className="text-xs text-emerald-100/65">({method})</span>
    </div>
  );
}
