# Efficiency

CivicResolve minimizes bundle weight, cold-start latency, memory footprint, and redundant upstream AI calls.

## Optimizations

- **Zero-Bloat Frontend & Bundle Budget (`scripts/bundle-budget.mjs`):** Uses React 19 + pure CSS tokens without heavy UI component libraries; Vite splits `react` and `zod` into cacheable chunks and enforces strict gzip ceilings (`<= 120 kB` JS, `<= 25 kB` CSS).
- **AI Triage Caching & Fast-Model Cascade (`server/ai/triage.ts`):** Caches triage responses by SHA-256 input digest (bounded LRU at 200 entries) and prioritizes low-latency `gemini-2.5-flash-lite` before falling back to `gemini-2.5-flash` or the zero-latency deterministic engine.
- **Bounded Memory Structures (`server/lib/rate-limit.ts`):** Evicts oldest IP keys above `maxKeys = 2000` to prevent unbounded heap growth.
- **Static Asset Caching & Fast Container Cold Start (`server/lib/http.ts`, `Dockerfile`):** Serves hashed `/assets/*` bundles with `Cache-Control: public, max-age=31536000, immutable` from a minimal multi-stage `node:22-alpine` image with zero native binary dependencies.
