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
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/50 backdrop-blur-sm">
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Live Data
          </span>
        </div>
      )}

      {sources.map((source, idx) => (
        <div
          key={idx}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/40 backdrop-blur-sm hover:bg-blue-500/15 transition-colors"
        >
          <span className="text-xs font-mono text-blue-700 dark:text-blue-300">
            {source.name}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatTimestamp(source.timestamp)}
          </span>
          {source.confidence && (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
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
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50">
      {isLive && (
        <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
      )}
      <span className={isLive ? "text-orange-600 dark:text-orange-400" : "text-gray-600"}>
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
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500/15 to-purple-500/15 border border-violet-400/40">
      <span className="text-violet-700 dark:text-violet-300">📊 {source}</span>
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
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500/15 to-blue-500/15 border border-indigo-400/40 backdrop-blur-sm">
      <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
        🧠 {displayCategory}
      </span>
      <span className="text-xs text-indigo-600 dark:text-indigo-400">
        {confidence}%
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        ({method})
      </span>
    </div>
  );
}
