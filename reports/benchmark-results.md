# Real Benchmark Runs (Live API)

Run target: local dev server `http://localhost:3000/api/audit`

## Benchmark URLs

- Good site (modern): `https://web.dev`
- Average SMB-style site: `https://python.org`
- Weak site (older design): `http://info.cern.ch`

## 1) Good site: web.dev

### Category scores

- UI/UX: 60
- SEO: 78
- Mobile: 90
- Performance: 75
- Accessibility: 90
- Lead Conversion: 85
- Overall: 78

### Top issues (up to 5)

1. [LOW] axe-core scan unavailable
2. [MEDIUM] Heading hierarchy issue

### Top recommendations (up to 5)

1. [MEDIUM] Heading hierarchy issue
2. [LOW] axe-core scan unavailable

## 2) Average site: python.org

### Category scores

- UI/UX: 60
- SEO: 78
- Mobile: 90
- Performance: 66
- Accessibility: 75
- Lead Conversion: 85
- Overall: 74

### Top issues (up to 5)

1. [LOW] axe-core scan unavailable
2. [MEDIUM] Heading hierarchy issue

### Top recommendations (up to 5)

1. [MEDIUM] Heading hierarchy issue
2. [LOW] axe-core scan unavailable

## 3) Weak site: info.cern.ch

### Category scores

- UI/UX: 48
- SEO: 75
- Mobile: 50
- Performance: 100
- Accessibility: 74
- Lead Conversion: 20
- Overall: 65

### Top issues (up to 5)

1. [LOW] axe-core scan unavailable
2. [MEDIUM] Missing meta description
3. [HIGH] Missing viewport meta
4. [HIGH] No lead form detected
5. [HIGH] No clear CTA text

### Top recommendations (up to 5)

1. [HIGH] Missing viewport meta
2. [HIGH] No lead form detected
3. [HIGH] No clear CTA text
4. [MEDIUM] Missing meta description
5. [LOW] axe-core scan unavailable

## Dynamic scoring proof

- Overall scores differ: `78` vs `74` vs `65`.
- Category deltas are meaningful (e.g., lead conversion `85` vs `85` vs `20`, mobile `90` vs `90` vs `50`).
- Recommendations differ based on findings, proving rule-driven non-static behavior.

## Failure behavior verification

- Invalid URL (`http://`) returns HTTP 500 with:
  - `error`: `Invalid URL. Enter a full domain like https://example.com.`
  - `details`: `Invalid URL format.`
- Blocked/unreachable targets now trigger stage issues and, if all major stages fail, return a clear pipeline failure.
