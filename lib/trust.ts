import type { TrustBreakdown, TrustLevel, TrustMeta } from "./audit-types";

/** Level weights for overall trust score (heavy penalty for FALLBACK). */
export const TRUST_LEVEL_WEIGHT: Record<TrustLevel, number> = {
  VERIFIED: 1,
  ESTIMATED: 0.7,
  INFERRED: 0.6,
  FALLBACK: 0.25,
};

const TRUST_CONFIDENCE_RANGE: Record<TrustLevel, [number, number]> = {
  VERIFIED: [0.9, 1.0],
  ESTIMATED: [0.6, 0.8],
  INFERRED: [0.5, 0.7],
  FALLBACK: [0.2, 0.4],
};

/** Clamp confidence into the allowed band for the trust level. */
export function clampTrustConfidence(level: TrustLevel, raw: number): number {
  const [min, max] = TRUST_CONFIDENCE_RANGE[level];
  return Math.max(min, Math.min(max, raw));
}

export function makeTrustMeta<T>(value: T, level: TrustLevel, source: string, confidenceHint: number): TrustMeta<T> {
  return {
    value,
    trustLevel: level,
    source,
    confidence: clampTrustConfidence(level, confidenceHint),
  };
}

/** Weighted mean of confidence × level weight, scaled to 0–100. */
export function calculateOverallTrustScore(metas: TrustMeta[]): number {
  if (metas.length === 0) return 0;
  let num = 0;
  let den = 0;
  for (const m of metas) {
    const w = TRUST_LEVEL_WEIGHT[m.trustLevel];
    num += m.confidence * w;
    den += w;
  }
  if (den <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
}

/**
 * Share of total level-weight mass per tier (sums to 100% within rounding).
 */
export function calculateTrustBreakdown(metas: TrustMeta[]): TrustBreakdown {
  if (metas.length === 0) {
    return { verified: 0, estimated: 0, inferred: 0, fallback: 0 };
  }
  let v = 0;
  let e = 0;
  let i = 0;
  let f = 0;
  for (const m of metas) {
    const w = TRUST_LEVEL_WEIGHT[m.trustLevel];
    if (m.trustLevel === "VERIFIED") v += w;
    else if (m.trustLevel === "ESTIMATED") e += w;
    else if (m.trustLevel === "INFERRED") i += w;
    else f += w;
  }
  const t = v + e + i + f;
  if (t <= 0) return { verified: 0, estimated: 0, inferred: 0, fallback: 0 };
  const p = (x: number) => (x / t) * 100;
  const verified = Math.round(p(v) * 10) / 10;
  const estimated = Math.round(p(e) * 10) / 10;
  const inferred = Math.round(p(i) * 10) / 10;
  const fallback = Math.max(0, Math.round((100 - verified - estimated - inferred) * 10) / 10);
  return { verified, estimated, inferred, fallback };
}

const TRUST_BADGE_LABELS: Record<TrustLevel, string> = {
  VERIFIED: "Live Data",
  ESTIMATED: "Estimated",
  INFERRED: "AI Insight",
  FALLBACK: "Limited Data",
};

export function trustBadgeLabel(level: TrustLevel): string {
  return TRUST_BADGE_LABELS[level];
}
