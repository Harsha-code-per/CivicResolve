# Efficiency

## Measured

| What                         | Result                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| First-load JavaScript (gzip) | **79.6 kB** (React 68 kB + app 14 kB), budget 95 kB, enforced by `npm run budget`                              |
| Firebase Auth (gzip)         | **45.5 kB**, loaded lazily only when sign-in is configured, never on the critical path; total JS budget 150 kB |
| CSS shipped (gzip)           | **7.6 kB** including the 3D landing scene, budget 12 kB                                                        |
| Runtime dependencies         | 9                                                                                                              |
| Photo upload                 | Downscaled to ≤ 1280 px JPEG in the browser: a 4–8 MB phone photo becomes about 150–300 KB                     |

## Where the savings come from

- **No validator in the browser.** Field limits live in a zod-free module (`src/domain/limits.ts`), so the
  client bundle does not include zod (−22 kB gzip).
- **Vendor chunk split.** React is cached separately from app code; hashed assets are served with
  `Cache-Control: immutable` for a year, and `index.html` revalidates.
- **Photos never travel with lists.** Issues carry a `hasImage` flag; the image is fetched lazily
  (`loading="lazy"`, `decoding="async"`) from `/api/issues/:id/image` with a 24 h immutable cache. In
  Firestore, photos live in a separate collection, so listing the dashboard never downloads them.
- **Fewer, cheaper AI calls.** Identical complaints (same text and photo hash) reuse a cached Gemini answer.
  Lite models are tried first. A model that fails is skipped for a minute instead of being retried on
  every request, and each call times out after 12 s.
- **Bounded memory.** The triage cache (200 entries) and rate limiter (2,000 keys) evict the oldest
  entries. The Firestore list query is limited to the 200 newest issues.
- **Transactional ids without hot reads.** A single counter document is updated in the same transaction
  that writes the issue.
- **Scale to zero.** Cloud Run runs with `min-instances 0`, `max-instances 2` and 512 MiB; the container is
  a multi-stage Alpine image with production dependencies only.
- **No chart library.** Progress bars are native `<progress>` elements styled with CSS.
- **No WebGL or 3D library.** The landing city is about 50 `div`s with CSS 3D transforms; it costs no JavaScript beyond rendering and stops animating under reduced motion.
- **Lazy sign-in.** `@firebase/app` and `@firebase/auth` are dynamically imported after `/api/config` says sign-in is on. Only these two packages are installed, not the full `firebase` SDK, which also keeps `npm audit` at 0.
- **Fonts.** Self-hosted Geist (variable) and Instrument Serif italic via Fontsource, split by `unicode-range` so only the Latin subset downloads.
