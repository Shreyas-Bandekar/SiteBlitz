# SiteBlitz Full Changes Summary

Date: March 25, 2026
Branch: shlok

## 1) Branch and commit state

- Active branch: shlok
- Latest pushed commit: 5f7a79d (Improve report generation and screenshot reliability)
- Previous session commit: 8709092 (Add session summary and repository updates)

## 2) Files changed in pushed commit 5f7a79d

- app/(audit)/audit/page.tsx
- app/api/audit/route.ts
- components/LiveAuditResults.tsx
- components/PDFReport.tsx
- lib/audit-pipeline.ts
- lib/screenshot.ts

## 3) Current local (not yet committed) changes

- app/api/audit/route.ts
- components/LiveAuditResults.tsx
- lib/audit-engine.ts
- lib/audit-pipeline.ts
- lib/audit-types.ts
- lib/live-benchmarks.ts
- tests/content-suggestions.test.ts
- data/benchmarks/ecommerce.json (untracked)

## 4) Full functional change log

### A. Report generation UX and PDF export

- Removed old single report button and introduced dedicated Report Generation section in results.
- Added two report modes:
  - Manual Report Generation (user chooses sections to include)
  - Automatic Report Generation (plain-language report for non-technical users)
- Added user inputs for personalization:
  - User Name
  - Company Name
- PDF now includes:
  - Professional heading
  - Prepared for (user name)
  - Company name
  - Company name shown as brand title in PDF header (fallback to SiteBlitz if empty)
- Added screenshot embedding into generated PDF when screenshot exists.
- Added robust handling for image mime/data-url formats while embedding.

### B. Screenshot reliability improvements

- Fast mode screenshot timing adjusted to be less aggressive:
  - Increased nav timeout and settle time for better real-world rendering.
- Added retry behavior in screenshot capture for slow JS-heavy pages.
- Added bounded fallback navigation timing to avoid excessive overruns.
- Added timeout protection for non-fast screenshot path as well.
- Added Lighthouse screenshot fallback if Puppeteer screenshot is unavailable.

### C. Competitor system improvements

- Improved industry mapping for competitor selection:
  - If detected category is other but service/agency signals are present, competitor industry is forced to agency.
- Expanded agency competitor data to include direct-style companies:
  - TatvaSoft
  - Hidden Brains
  - Schbang
  - Kinnect and other relevant entries
- Prevented empty competitor output:
  - If live/fresh data is missing, fallback baseline is used.
  - Added deterministic fallback competitor set in API route.
- Removed irrelevant platform competitors from comparison list (e.g., social/global platforms when not relevant).
- Added locality-priority ranking:
  - City match > State match > Country match > Overall score
- Applied one-row local competitor output behavior per latest requirement:
  - Returns strongest locality-matched competitor in table.

### D. AI content insights (made practical and real)

- Replaced metadata-centric suggestions (title/meta/h1 style emphasis) with business-actionable categories:
  - contentClarity
  - conversionPath
  - trustAndProof
- Suggestions now derive from actual page content signals such as:
  - CTA presence
  - form presence
  - trust/proof indicators
  - service-message clarity
- Added robust error-page handling in suggestions for blocked/degraded pages.
- Updated UI labels in Live Audit results to display user-friendly category names.
- Updated type definitions and tests accordingly.

## 5) File-by-file summary

### app/api/audit/route.ts

- Added competitorIndustry override resolution for service/agency cases.
- Added fallbackCompetitorsForIndustry deterministic map.
- Added irrelevant-host filtering.
- Added locality scoring and ranking helpers.
- Updated benchmark reduction to locality-priority and single-top competitor output.

### lib/live-benchmarks.ts

- Expanded agency TOP_SITES and pre-audited baselines with TatvaSoft/Hidden Brains.
- Improved no-data behavior to fallback to baseline instead of empty list.

### lib/audit-pipeline.ts

- Added timeout wrapping for non-fast screenshot stage.
- Increased fast screenshot budget and timing.
- Enabled Lighthouse screenshot fallback for all modes when Puppeteer screenshot missing.

### lib/screenshot.ts

- Added retry capture strategy with bounded fallback.
- Reduced long overrun risk while still improving success on slow sites.

### components/LiveAuditResults.tsx

- Added Report Generation panel with Manual/Automatic mode selector.
- Added section checkboxes for manual mode.
- Added User Name and Company Name inputs.
- Passed screenshot and screenshot variants into PDF payload.
- Mapped new content insight types to user-friendly labels.

### components/PDFReport.tsx

- Added support for mode-aware export sections.
- Added user/company personalization in header.
- Company name used as PDF brand title.
- Added embedded website screenshot section in PDF.

### app/(audit)/audit/page.tsx

- Removed old/duplicate static report download button from legacy area.

### lib/audit-engine.ts

- Reworked content suggestion engine to practical categories and realistic actions.
- Added stronger blocked/error response handling for safe recommendations.

### lib/audit-types.ts

- Updated ContentFix type category values to actionable insight types.

### tests/content-suggestions.test.ts

- Updated tests to validate new content insight categories and behavior.

## 6) Where competitor logic is located

Primary competitor logic files:

- app/api/audit/route.ts
  - Competitor selection, fallback, filtering, locality ranking, and final table payload.
- lib/live-benchmarks.ts
  - Competitor source pools, cached/live benchmark retrieval, and baseline fallback behavior.

Competitor display/UI files:

- components/CompetitorLiveTable.tsx
  - Competitor benchmark table rendering.
- components/LiveAuditResults.tsx
  - Integrates CompetitorLiveTable in audit results.
- components/ManualCompetitorCompare.tsx
  - Manual Site A vs Site B competitor comparison mode.

## 7) Validation status

- TypeScript compile checks were run and passing at each major patch point.
- Competitor availability and screenshot fallback paths were hardened to avoid empty outputs.

---

This file is the complete consolidated summary of all implemented changes in this session, including pushed and currently local updates.
