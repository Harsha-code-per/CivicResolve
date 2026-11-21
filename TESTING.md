# Testing

CivicResolve validates domain invariants, HTTP security controls, component accessibility, and end-to-end user journeys.

## Test Layers

1. **Domain Unit & Property-Based Tests (`tests/domain/domain.test.ts`):** Uses Vitest and `fast-check` to verify category classification, bounded urgency scoring `[10, 100]`, SLA invariants, status state-machine guards, filtering, and analytics math.
2. **Architecture Boundary Tests (`tests/quality/architecture.test.ts`):** Guarantees `src/domain/` remains pure and framework-agnostic.
3. **HTTP API & Security Integration Tests (`tests/server/api.test.ts`):** Boots the real Node HTTP handler to test `/healthz`, security headers, magic-byte validation, citizen submission, `401` unauthenticated admin rejection, HMAC login + `PATCH` transition, `403` CSRF blocking, and `429` rate limiting.
4. **Component & `axe-core` Tests (`tests/ui/app.test.tsx`):** Validates React 19 rendering, tab navigation, table toggle, and zero `axe-core` violations.
5. **Playwright E2E (`e2e/civicresolve.spec.ts`):** Runs against the compiled production server across Desktop Chrome (light & dark) and Mobile Pixel 7, verifying zero console errors, WCAG 2.2 AA compliance via `@axe-core/playwright`, and full citizen-to-admin workflows.

## Coverage Gate

`vite.config.ts` configures `@vitest/coverage-v8` with **100% thresholds** for lines, statements, functions, and branches.
