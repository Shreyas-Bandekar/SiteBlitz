# AI Website Audit Platform (Hackathon MVP)

Implement with zero paid services. Use only open-source tools and free tiers. Do not require any paid API keys. Prefer local LLM via Ollama or rule-based recommendation generation.

## Gap analysis (before -> after)

| Requirement | Previous state | Implemented fix |
|---|---|---|
| Live URL audit | Heuristic-only endpoint | Real pipeline with Playwright + Lighthouse + axe + Cheerio |
| Category scoring | Mock-like mixed signals | Deterministic rubric in `lib/scoring.ts` |
| Structured report | Basic scores/issues/fixes | `scores + issues + prioritized recommendations + summary + notes + pipeline` |
| Real tooling | Missing Lighthouse/Playwright/axe integration | Added full open-source stack, no paid APIs |
| AI summarization | None | Optional local Ollama summary, automatic rule-based fallback |
| Progress and errors | Animated loading only | Returns executed pipeline steps and elapsed time, API failure details |
| Env validation/logs | Minimal | Zod env validation + structured logger |
| Tests | None | Added tests for scoring + report recommendation mapping |

## Problem mapping

- Teams need quick, explainable website quality audits during demos.
- Judges expect concrete evidence, not black-box numbers.
- This project combines rendered checks, Lighthouse baselines, and deterministic scoring.

## Architecture

- **Frontend**: Next.js App Router page for input, progress, and report rendering.
- **API route**: `app/api/audit/route.ts` orchestrates the audit pipeline and error handling.
- **Pipeline**: `lib/audit-pipeline.ts`
  - Playwright desktop render
  - Playwright mobile render and tap-target checks
  - axe-core accessibility scan
  - Lighthouse (`performance`, `seo`, `accessibility`)
  - Cheerio DOM parsing (title/meta/H1/forms/CTA)
- **Scoring**: `lib/scoring.ts` deterministic, transparent, bounded (0-100).
- **Summary**:
  - Primary: local Ollama (`OLLAMA_HOST`, `OLLAMA_MODEL`)
  - Fallback: deterministic rule-based summary

## Scoring rubric

- UI/UX: heading clarity + CTA/form presence
- SEO: Lighthouse SEO baseline + title/meta/H1 checks
- Mobile usability: viewport + mobile tap target coverage
- Performance: Lighthouse performance score
- Accessibility: Lighthouse accessibility + axe violations surfaced in issues
- Lead conversion: form + CTA signal strength
- Overall: weighted aggregate from deterministic category scores
- One-page judging rubric: `docs/SCORING_RUBRIC.md`

## Run instructions

1. Install deps:
   - `npm install`
2. (Optional) run local Ollama:
   - Start Ollama locally
   - Optionally set `.env.local`:
     - `OLLAMA_HOST=http://127.0.0.1:11434`
     - `OLLAMA_MODEL=llama3.1:8b`
3. Start app:
   - `npm run dev`
4. Tests:
   - `npm run test`
5. Build:
   - `npm run build`

## Deployment (free-tier guidance)

- Frontend/API: Vercel free tier
- If headless audits are slow on hosted serverless, run backend locally for demo day
- No DB required for MVP (report returned directly in response)
- Offline demo safety: use **Load Cached Sample Report** button on the homepage

## Benchmark demo URLs

- Good (modern): `https://web.dev`
- Average SMB style: `https://python.org`
- Weak/older: `http://info.cern.ch`
- Captured benchmark outputs: `reports/benchmark-results.md`

## Final submission package

- README with coverage matrix: this file
- Architecture diagram: `docs/ARCHITECTURE_DIAGRAM.md`
- Sample report JSON: `reports/sample-report.json`
- Human-readable report: `reports/sample-report.md`
- 3-minute demo script: `docs/DEMO_SCRIPT_3_MIN.md`
- Video walkthrough: record from script above (screen + narration)

## Limitations / future scope

- Some websites block headless browsers or bot traffic.
- Lighthouse in serverless environments can be resource-constrained.
- Current progress UI is request-level, not streamed per pipeline step.
- Add queueing, caching, retry policies, and persisted report history for scale.

## Requirement coverage matrix

| Requirement | Status |
|---|---|
| Accept live URL and run automated analysis | ✅ |
| Analyze UI/UX, SEO, mobile, performance, accessibility, lead conversion | ✅ |
| Structured report with category scores/issues/prioritized recommendations/summary | ✅ |
| Use real tooling (Lighthouse, Playwright, axe-core, DOM parsing) | ✅ |
| AI summarization with deterministic scoring separation | ✅ (Ollama optional, rule-based fallback) |
| Frontend progress + report preview + graceful errors | ✅ |
| Replace fake API flow with real pipeline/failure handling | ✅ |
| Env validation, logs, basic tests | ✅ |
| README with architecture/rubric/demo/limits | ✅ |
# SiteBlitz
