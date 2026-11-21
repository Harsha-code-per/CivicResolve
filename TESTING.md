# Testing

| Suite      | Tool                    | What it covers                                                                                                                                                                     |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain     | Vitest + fast-check     | Routing, urgency bounds (property), priority bands, `moreUrgent` symmetry (property), the safety floor, SLA countdown and breach, transitions, filters, analytics and median.      |
| Server     | Vitest + real HTTP      | Every route and error path: 400/401/403/404/409/413/415/429/500, CSRF, rate limiting, static caching, SPA fallback, traversal, the image endpoint, production config checks.       |
| Stores     | Vitest + fake Firestore | Both adapters run the same contract tests (`describe.each`): seeding, sequential ids, photo separation, transitions, seeding retry after a transient failure.                      |
| AI         | Vitest + injected fakes | Cascade fall-through on bad JSON or schema misses, cooldown and recovery, cache eviction, photo forwarding, fence stripping, and the Gemini SDK call shape (SDK mocked).           |
| UI         | Testing Library + axe   | Keyboard tabs, theme, load errors, report → preview → submit, photo validation and downscaling, admin sign-in/update/sign-out failures, tracker filters, table view, axe in jsdom. |
| End-to-end | Playwright + axe-core   | 4 journeys × 3 projects (desktop light, desktop dark, Pixel 7): WCAG 2.2 AA scans on each view, report → triage → track → admin resolve, focused error alert, keyboard tabs.       |

## Numbers

- **77** unit and integration tests in 12 files.
- **100%** statements, branches, functions and lines. The thresholds are enforced in `vite.config.ts`,
  so coverage cannot drop.
- **12** Playwright runs against the production build and server, failing on any console error or CSP
  violation.

## Run

```bash
npm test            # unit + integration
npm run coverage    # with the 100% thresholds
npm run e2e         # Playwright + axe (builds and starts the production server)
```
