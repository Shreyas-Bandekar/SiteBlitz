# SiteBlitz: Features and Data Status

This file explains:
1. What features currently exist
2. How each feature works
3. Whether data is real/live or dummy/estimated

## Core Product Flow

1. User enters a URL in the audit UI.
2. Frontend calls POST /api/audit.
3. Backend runs live scan stages (Playwright, axe, Lighthouse, HTML parsing).
4. Backend computes deterministic scores and recommendations.
5. Optional enrichments run (AI insights, competitors, ROI estimate).
6. Report is saved to Postgres and returned to UI.
7. UI renders dashboard cards, diagnostics, and export options.

## Feature-by-Feature Breakdown

### 1) Live Website Scan
How it works:
- Uses Playwright to open the target site in headless browser contexts.
- Collects rendered HTML from desktop and mobile emulation.
- Includes timeout and stage-trace metadata.

Data type:
- Real/live data from the target URL.

### 2) Accessibility Scan
How it works:
- Runs axe-core against the rendered page from Playwright.
- Converts violations into issue entries.

Data type:
- Real/live scan output.

### 3) Lighthouse Metrics
How it works:
- Runs Lighthouse CLI with headless Chrome.
- Reads performance, SEO, and accessibility category scores.

Data type:
- Real/live scan output.

### 4) Structural/SEO/UX Signal Extraction
How it works:
- Parses live HTML with Cheerio.
- Extracts title/meta/H1/forms/CTAs/alt coverage/word count and related signals.
- Runs rule-based issue detection and recommendations.

Data type:
- Real/live page content.

### 5) Deterministic Scoring Engine
How it works:
- Combines Lighthouse scores and extracted signals using fixed weighted logic.
- Produces category scores and overall score.

Data type:
- Computed from real/live scan inputs.
- Logic is deterministic (same inputs -> same score).

### 6) Screenshot Capture
How it works:
- Captures visual snapshots via screenshot pipeline.
- UI displays desktop/mobile captures if available.

Data type:
- Real/live capture of target page at audit time.

### 7) Industry Detection
How it works:
- Keyword and structure based classification from page content/signals.
- Returns category + confidence.

Data type:
- Based on real/live page text and metadata.
- Classification itself is heuristic/rule-based (inferred, not external verified).

### 8) Competitor Benchmarking
How it works:
- Uses industry top-site list.
- Attempts fresh audits of benchmark sites.
- Uses local benchmark cache when fresh/live benchmark runs are not available.
- Source is labeled as live or pre-audited.

Data type:
- Mixed:
  - Real/live when fresh benchmark audits succeed
  - Cached/pre-audited when served from existing cache

### 9) ROI Section
How it works:
- API route currently uses free ROI path with industry defaults and variance.
- Computes uplift from score gap and estimated traffic/conversion/AOV assumptions.
- Returns source/confidence metadata.

Data type:
- Estimated/model-driven, not purely first-party analytics.
- Includes randomized variance in assumptions.

### 10) Live Analytics Signal Extraction
How it works:
- Parses page scripts for detectable tokens (e.g., GA4 ID, monthlyUsers, avgOrderValue, conversionRate if present).

Data type:
- Real only if those signals are publicly present in page source.
- Often partial or missing on most sites.

### 11) AI Insights (Optional)
How it works:
- Calls Ollama model endpoint with structured prompt.
- Produces executive summary, top fixes, narrative, 30-day plan.
- Does not alter deterministic numeric scores.

Data type:
- Generated AI text from live report context.
- Not a direct measurement source.

### 12) Audit History and Persistence
How it works:
- Saves each audit payload to Vercel Postgres.
- Fetches recent history for same URL.

Data type:
- Real persisted run history.

### 13) PDF Export
How it works:
- Builds report export from current in-memory payload.
- Falls back to TXT export if PDF generation fails.

Data type:
- Real current report payload; fallback is export-format fallback only.

## Real vs Dummy/Estimated Summary

Mostly real/live:
- Live scan, Lighthouse, accessibility, HTML extraction, issues, deterministic scoring, screenshots, DB history.

Mixed:
- Competitor benchmark data (live + cached/pre-audited mix).

Estimated/model-driven:
- ROI assumptions in active route flow.
- AI narrative text.

Static/demo content:
- Marketing page testimonials/pricing copy is static UI content.
- Sample report files exist in reports/ but active audit runtime is live API flow.

## Practical Truth

SiteBlitz is a live technical auditing system with strong real-time scan coverage.
Business context layers (especially ROI) are currently estimate-driven rather than fully first-party analytics-grounded.
