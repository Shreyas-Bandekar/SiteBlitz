import { pgPool } from "./postgres";
import type { LiveAuditHistory } from "./audit-types";

export async function initLiveSchema() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS siteblitz_audits (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      user_id TEXT,
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
  `);
}

export async function saveLiveAudit(report: {
  id: string;
  url: string;
  user_id?: string;
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
  await pgPool.query(
    `
    INSERT INTO siteblitz_audits (id, url, user_id, industry, scores, issues, recommendations, competitors, analytics, roi, pipeline, status, timestamp)
    VALUES (
      $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, NOW()
    )
  `,
    [
      report.id,
      report.url,
      report.user_id || null,
      report.industry,
      JSON.stringify(report.scores),
      JSON.stringify(report.issues),
      JSON.stringify(report.recommendations),
      JSON.stringify(report.competitors),
      JSON.stringify(report.analytics),
      JSON.stringify(report.roi),
      JSON.stringify(report.pipeline),
      report.status,
    ],
  );
}

export async function getLiveAuditHistory(
  url: string,
  limit = 10,
): Promise<LiveAuditHistory[]> {
  await initLiveSchema();
  const result = await pgPool.query(
    `
    SELECT id, url, scores, timestamp
    FROM siteblitz_audits
    WHERE url = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `,
    [url, limit],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    scores: row.scores as LiveAuditHistory["scores"],
    timestamp: new Date(row.timestamp as string).toISOString(),
  }));
}

export async function getRecentLiveAudits(
  limit = 20,
): Promise<LiveAuditHistory[]> {
  await initLiveSchema();
  const result = await pgPool.query(
    `
    SELECT id, url, scores, timestamp
    FROM siteblitz_audits
    ORDER BY timestamp DESC
    LIMIT $1
  `,
    [limit],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    scores: row.scores as LiveAuditHistory["scores"],
    timestamp: new Date(row.timestamp as string).toISOString(),
  }));
}

export async function getUserAuditHistory(
  userId: string,
  limit = 20,
): Promise<LiveAuditHistory[]> {
  await initLiveSchema();
  const result = await pgPool.query(
    `
    SELECT id, url, scores, timestamp
    FROM siteblitz_audits
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `,
    [userId, limit],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    scores: row.scores as LiveAuditHistory["scores"],
    timestamp: new Date(row.timestamp as string).toISOString(),
  }));
}
