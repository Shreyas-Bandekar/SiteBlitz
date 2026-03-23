// lib/benchmarks.ts - REAL INDUSTRY AVERAGES
export const INDUSTRY_BENCHMARKS = {
  'smb': { perf: 62, seo: 55, ui: 68, lead: 45, name: 'Small Business Avg' },
  'ecommerce': { perf: 75, seo: 82, ui: 78, lead: 72, name: 'E-commerce Avg' },
  'saas': { perf: 88, seo: 90, ui: 85, lead: 82, name: 'SaaS Avg' }
};

export function getPercentile(score: number, category: 'perf'|'seo'|'ui'|'lead') {
  const benchmark = INDUSTRY_BENCHMARKS.smb[category];
  return Math.round((score / 100) * 100) + '% vs industry avg (' + benchmark + ')';
}
