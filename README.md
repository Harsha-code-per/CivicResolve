# CivicResolve — AI-Powered Citizen Grievance Management & Resolution

CivicResolve is an end-to-end civic issue reporting, Google Gemini multimodal triage, department recommendation, and municipal resolution platform built for **PromptWars x GDG on-Campus PSG iTech**.

> **Core Architecture Principle:** _The deterministic engine owns the rules, SLAs, and status state machine; Google Gemini owns the multimodal complaint analysis and summaries._

## Features

1. **Citizen Issue Reporting:** Submit title, description, location, optional category hint, and optional PNG/JPEG/WebP photo evidence with binary magic-byte validation.
2. **AI-Powered Classification (Google Gemini):** Uses `@google/genai` (`gemini-2.5-flash-lite` → `gemini-2.5-flash` cascade) with structured JSON schema output and prompt-injection fencing, plus a deterministic rule fallback.
3. **Priority Detection & SLA Routing:** Computes a bounded urgency/public-impact score (`10–100`) mapped to `Critical (4h)`, `High (24h)`, `Medium (72h)`, or `Low (168h)` SLAs.
4. **Department Recommendation:** Routes every grievance to one of six municipal departments automatically.
5. **Public Issue Tracking Dashboard:** Search, filter by status/priority/department, toggle between editorial cards and an accessible data table, and inspect immutable status timelines (`Reported → In Progress → Resolved`).
6. **Administrator Command Center:** Protected by HMAC-SHA256 HttpOnly `SameSite=Strict` cookies with timing-safe verification to update statuses, reassign departments, and append audit notes.

## Evaluation Documentation

- [Code Quality](./CODE_QUALITY.md)
- [Security](./SECURITY.md)
- [Testing](./TESTING.md)
- [Efficiency](./EFFICIENCY.md)
- [Accessibility](./ACCESSIBILITY.md)
- [Problem Statement Alignment](./PROBLEM_ALIGNMENT.md)

## Local Quickstart

```bash
npm install
cp .env.example .env
# Optional: set GEMINI_API_KEY in .env (falls back cleanly to deterministic triage when unset)
npm run build
npm start
# Open http://localhost:8080 (Demo Admin Passcode: civic-admin-2026)
```

## Full Quality Gate

```bash
npm run check
npm run e2e
```

## Deployment

### Option A — Google Cloud Run (Always-Free Tier)

```bash
gcloud run deploy civicresolve \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,ADMIN_PASSCODE=civic-admin-2026,SESSION_SECRET=$(openssl rand -hex 32),GEMINI_API_KEY=your-key
```

### Option B — Free Docker Hosting Without Cloud Run Credits (Render Blueprint)

This repository includes [`render.yaml`](./render.yaml) using the same production `Dockerfile`:

1. Push this repository to GitHub.
2. Open [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint** → connect your GitHub repo.
3. Optionally add `GEMINI_API_KEY` in Environment Variables and deploy on the **Free** plan.
