# SiteBlitz

Live website auditing platform built with Next.js. SiteBlitz scans a target URL in real time, computes deterministic scores, optionally enriches with AI and competitor context, and stores audit history in Postgres.

This project now includes account authentication (signup/login) and user-scoped audit history.

## What It Does

- Runs live audit scans from a browser context (Playwright).
- Collects accessibility findings (axe-core).
- Collects Lighthouse category scores.
- Extracts SEO and UX signals from rendered HTML.
- Computes deterministic category and overall scores.
- Estimates ROI using industry benchmark assumptions.
- Optionally enriches output with Gemini insights.
- Persists run history in Vercel Postgres.

## Product Routes

- `/`: Marketing page.
- `/audit`: Audit UI.
- `/api/audit`: Main audit API.
- `/api/ai-insights`: AI-only insights API.
- `/login`: User login page.
- `/signup`: User registration page.
- `/verify-email`: Email verification page.
- `/forgot-password`: Password reset request page.
- `/reset-password`: Password reset completion page.
- `/account/history`: Account-wide audit history page.

## Tech Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- Playwright
- Lighthouse
- axe-core
- Hosted Postgres (`postgres` client; works with Supabase, Neon, Railway, etc.)
- Gemini integration (`@google/generative-ai`, `@ai-sdk/google`)
- Optional Flask/OpenCV microservice for visual CV scoring

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Install Playwright browsers

```bash
npx playwright install
```

### 3. Configure environment

Create `.env.local` in the project root:

```env
# Gemini (either key works)
GEMINI_API_KEY=AIza...
# GOOGLE_API_KEY=AIza...

# Optional local model endpoint
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b

# Logging
LOG_LEVEL=info

# Required for persistence/history (use your hosted Postgres URL)
DATABASE_URL=postgres://...
# Backward-compatible alias also supported:
# POSTGRES_URL=postgres://...

# Required for secure auth sessions (>= 32 chars)
AUTH_SECRET=change-this-to-a-long-random-secret

# Optional Flask CV service
# FLASK_CV_URL=http://127.0.0.1:5000
```

### 4. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: Start dev server.
- `npm run build`: Build production bundle.
- `npm run start`: Run built app.
- `npm run lint`: Type-check with TypeScript.
- `npm run test`: Run Node test suite under `tests/`.

## API Usage

### `POST /api/audit`

Request body:

```json
{
  "url": "https://example.com",
  "enrichCompetitors": false,
  "enrichAi": false,
  "strictDb": false
}
```

Notes:

- Requires an authenticated session cookie.
- `enrichAi: false` and `enrichCompetitors: false` is the fast path used by the UI toggle.
- `strictDb: true` makes DB write failures fail the request.
- Response contains `stageTrace` for debugging failed stages.

Example:

```bash
curl -X POST http://localhost:3000/api/audit \
	-H "Content-Type: application/json" \
	-d '{"url":"https://example.com","enrichAi":true,"enrichCompetitors":true,"strictDb":false}'
```

### `POST /api/ai-insights`

Request body:

```json
{
  "auditData": {
    "issues": ["Missing meta description"]
  },
  "trust": {
    "trustScore": 72,
    "grade": "B",
    "badgeText": "72% TRUST",
    "factors": ["Live scan", "Deterministic scoring"]
  }
}
```

### Auth Endpoints

- `POST /api/auth/signup`: create account with `email` and `password`.
- `POST /api/auth/login`: login with `email` and `password`.
- `POST /api/auth/logout`: clear session cookie.
- `GET /api/auth/me`: returns current authenticated user.
- `POST /api/auth/request-verification`: create/resend verification link.
- `GET /api/auth/verify-email?token=...`: verify email token.
- `POST /api/auth/request-password-reset`: create password reset link.
- `POST /api/auth/reset-password`: reset password with token.
- `GET /api/account/history`: account-wide history list (all URLs for logged-in user).

Notes:

- Passwords are hashed using bcrypt.
- Sessions are signed JWTs in httpOnly cookies.
- Audit history is isolated per account in Postgres.
- Middleware protects `/audit/*` and `/account/*` and redirects unauthenticated users to `/login`.
- Database storage uses a hosted online Postgres service via `DATABASE_URL`.

## Optional Flask CV Service

SiteBlitz can call a small Flask service for screenshot-based visual scoring if `FLASK_CV_URL` is set.

### Run locally

```bash
cd flask-cv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Service default: `http://127.0.0.1:5000`.

## System Flow

1. Validate request URL.
2. Run live pipeline (Playwright, Lighthouse, axe, HTML extraction).
3. Detect industry from content and metrics.
4. Optionally fetch competitor benchmark context.
5. Extract live analytics hints from HTML.
6. Compute ROI estimate using score gap + industry assumptions.
7. Save report and fetch recent history from Postgres.
8. Return report payload with scores, issues, trust, and stage trace.

## Repository Structure

- `app/`: App Router pages, layouts, and API routes.
- `components/`: Dashboard and UI components.
- `lib/`: Audit pipeline, scoring, AI, trust, ROI, persistence logic.
- `tests/`: Deterministic and integration-like unit tests.
- `docs/`: Status and feature documentation.
- `flask-cv/`: Optional computer-vision service.

## Testing

Run tests:

```bash
npm run test
```

The test suite focuses on deterministic scoring behavior, sanitization, trust calculations, AI fallback consistency, and ROI logic.

## Troubleshooting

- Playwright errors:
  - Run `npx playwright install`.
  - Ensure system dependencies required by Playwright are installed.
- Lighthouse timeouts:
  - Retry the target URL and verify the site is reachable from your machine.
- DB persistence failures:
  - Verify `DATABASE_URL` (or `POSTGRES_URL`) and network access.
  - Use `strictDb: false` during local experimentation.
- AI insights unavailable:
  - Ensure `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) is valid.
  - Fast mode skips AI by design.

## Data Confidence Notes

- Core scan metrics are live and deterministic where applicable.
- Competitor benchmarks may include cached/pre-audited entries.
- ROI is estimate-driven (industry assumptions), not first-party analytics.

## License

No license file is currently included in this repository.
