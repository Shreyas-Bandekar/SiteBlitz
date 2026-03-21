# SiteBlitz - Live Website Auditor

SiteBlitz is a production-style Next.js app with:
- Premium marketing landing page at `/`
- Strict live audit app at `/audit`
- Live-only API flow at `/api/audit`

No sample report buttons, no cached mode, no runtime AI fallback templates.

## Architecture

- `app/(marketing)/page.tsx`: SaaS landing page with hero, features, and live CTA.
- `app/(audit)/audit/page.tsx`: live scanner UI and results view.
- `app/api/audit/route.ts`: live endpoint.
- `lib/audit-pipeline.ts`: Playwright + axe-core + Lighthouse + DOM parsing.
- `lib/live-analytics.ts`: extracts analytics signals from live page HTML.
- `lib/live-database.ts`: persists audits to Vercel Postgres.
- `lib/roi.ts`: computes ROI only from real extracted analytics values.

## Live API Flow

1. Validate URL.
2. Run live site audit pipeline.
3. Detect industry from live HTML.
4. Run 3 live competitor audits.
5. Extract live analytics signals.
6. Compute ROI from extracted analytics or return `roi: null` with reason.
7. Save audit to Postgres.
8. Return live report payload.

## Environment

Create `.env` (or `.env.local`) with:

- `OLLAMA_HOST=http://127.0.0.1:11434`
- `OLLAMA_MODEL=qwen2.5:3b-instruct` (or any installed model)
- `POSTGRES_URL=...` (from Vercel Postgres)

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run test`

## Notes

- Live-only mode increases failure probability for blocked sites and unavailable AI model/runtime.
- Competitor stage is strict in API flow.
