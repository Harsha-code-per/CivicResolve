# Testing

| Suite      | Tool                    | What it covers                                                                                                                                                                                                                                                                                              |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain     | Vitest + fast-check     | Routing, urgency bounds (property), priority bands, `moreUrgent` symmetry (property), the safety floor, SLA countdown and breach, transitions, filters, analytics and median.                                                                                                                               |
| Server     | Vitest + real HTTP      | Every route and error path: 400/401/403/404/409/413/415/429/500, CSRF, rate limiting, static caching, SPA fallback, traversal, the image endpoint, production config checks.                                                                                                                                |
| Identity   | Vitest + jose           | Real RS256 tokens signed with a generated key: Google and guest claims, wrong audience, missing subject, malformed tokens; bearer parsing; the admin allow-list; sign-in-required filing and "My reports" isolation over HTTP.                                                                              |
| Stores     | Vitest + fake Firestore | Both adapters run the same contract tests (`describe.each`): seeding, sequential ids, photo separation, transitions, seeding retry after a transient failure.                                                                                                                                               |
| AI         | Vitest + injected fakes | Cascade fall-through on bad JSON or schema misses, cooldown and recovery, cache eviction, photo forwarding, fence stripping, and the Gemini SDK call shape (SDK mocked).                                                                                                                                    |
| UI         | Testing Library + axe   | Hash routing, the collapsible sidebar and mobile drawer, theme, load errors, Firebase sign-in (Google, guest, failures) with the SDK mocked, My reports states, report → preview → submit with an ID token, photo validation, admin passcode and Google sign-in, tracker filters, table view, axe in jsdom. |
| Quality    | Vitest + git ls-files   | Layer boundaries (the domain imports no React, Node or server code) and repository hygiene: no tracked keys, private keys or `.env` files, no `eval`/`innerHTML`, no browser `console`, no TODO markers.                                                                                                    |
| End-to-end | Playwright + axe-core   | 5 journeys × 3 projects (desktop light, desktop dark, Pixel 7): WCAG 2.2 AA scans on the landing page and each console view, report → triage → track → admin resolve, focused error alert, sidebar focus and `aria-current`.                                                                                |

## Numbers

- **115** unit and integration tests in 18 files.
- **100%** statements, branches, functions and lines. The thresholds are enforced in `vite.config.ts`,
  so coverage cannot drop.
- **15** Playwright runs against the production build and server, failing on any console error or CSP
  violation.

## Run

```bash
npm test            # unit + integration
npm run coverage    # with the 100% thresholds
npm run e2e         # Playwright + axe (builds and starts the production server)
```
