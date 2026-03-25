import type { TrustData } from "./audit-types";

export function calculateTrust(leadScore: number, uxScore: number, lighthouseScore: number): TrustData {
  const weights = { lead: 0.4, ux: 0.3, lh: 0.3 }
  const rawTrust = (leadScore * weights.lead) + (uxScore * weights.ux) + (lighthouseScore * weights.lh)
  const grade: TrustData["grade"] = rawTrust >= 90 ? "A" : rawTrust >= 75 ? "B" : "C";
  
  return {
    trustScore: Math.round(rawTrust),  // Single number 0-100
    grade,
    badgeText: `${Math.round(rawTrust)}% TRUST`,
    factors: [
      `Lead Gen: ${leadScore}/100`,
      `Manual UX: ${uxScore}/100`, 
      `Lighthouse: ${lighthouseScore}/100`
    ]
  }
}
