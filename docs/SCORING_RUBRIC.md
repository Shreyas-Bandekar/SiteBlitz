# One-Page Scoring Rubric (Judging Friendly)

## Deterministic Category Weights

- UI/UX: 20%
- SEO: 20%
- Mobile usability: 15%
- Performance: 20%
- Accessibility: 15%
- Lead conversion potential: 10%

## Why each category matters for leads and engagement

- UI/UX: clear hierarchy and CTA clarity reduce confusion and improve conversion flow.
- SEO: better indexing and snippets drive more qualified organic traffic.
- Mobile usability: most SMB traffic is mobile; poor tap/readability kills conversion.
- Performance: slower pages increase bounce and ad spend waste.
- Accessibility: improves usability trust and expands reachable audience.
- Lead conversion: form + CTA quality directly impacts inquiry volume.

## Scoring transparency

- Numeric scores are computed in `lib/scoring.ts`.
- Inputs come from:
  - Lighthouse (performance/seo/accessibility baseline)
  - Playwright rendered DOM + mobile checks
  - Cheerio DOM parsing (title/meta/headings/forms/CTAs)
  - axe-core violations when available
- LLM/Ollama summary is text-only and never modifies numeric scores.
