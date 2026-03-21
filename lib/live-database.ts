import { sql } from "@vercel/postgres";
import type { LiveAuditHistory } from "./audit-types";

export async function initLiveSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS siteblitz_audits (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      industry TEXT NOT NULL,
      scores JSONB NOT NULL,
      issues JSONB NOT NULL,
      recommendations JSONB NOT NULL,
      competitors JSONB,
      analytics JSONB,
      roi JSONB,
      pipeline JSONB NOT NULL,
      status TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function saveLiveAudit(report: {
  id: string;
  url: string;
  industry: string;
  scores: unknown;
  issues: unknown;
  recommendations: unknown;
  competitors: unknown;
  analytics: unknown;
  roi: unknown;
  pipeline: unknown;
  status: string;
}) {
  await initLiveSchema();
  await sql`
    INSERT INTO siteblitz_audits (id, url, industry, scores, issues, recommendations, competitors, analytics, roi, pipeline, status, timestamp)
    VALUES (
      ${report.id},
      ${report.url},
      ${report.industry},
      ${JSON.stringify(report.scores)}::jsonb,
      ${JSON.stringify(report.issues)}::jsonb,
      ${JSON.stringify(report.recommendations)}::jsonb,
      ${JSON.stringify(report.competitors)}::jsonb,
      ${JSON.stringify(report.analytics)}::jsonb,
      ${JSON.stringify(report.roi)}::jsonb,
      ${JSON.stringify(report.pipeline)}::jsonb,
      ${report.status},
      NOW()
    )
  `;
}

export async function getLiveAuditHistory(url: string, limit = 10): Promise<LiveAuditHistory[]> {
  await initLiveSchema();
  const result = await sql`
    SELECT id, url, scores, timestamp
    FROM siteblitz_audits
    WHERE url = ${url}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    scores: row.scores as LiveAuditHistory["scores"],
    timestamp: new Date(row.timestamp as string).toISOString(),
  }));
}
