# Architecture

```mermaid
flowchart TB
  subgraph Browser
    UI[React views] --> API[src/lib/api.ts]
    UI --> D1[src/domain<br/>analytics, SLA]
    IMG[src/lib/image.ts<br/>downscale + strip EXIF] --> API
    AUTH[src/auth<br/>Firebase Auth, lazy] -->|ID token| API
  end
  subgraph Cloud Run
    P[app.ts pipeline<br/>headers, CSRF, rate limit] --> RT[routes.ts]
    RT --> AI[server/ai<br/>cascade]
    RT --> ST[IssueStore port]
    RT --> D2[src/domain<br/>schemas, workflow]
    RT --> ID[lib/identity.ts<br/>verify ID token]
  end
  AUTH --> FA[Firebase Authentication]
  ID -.public keys.-> GK[Google JWKS]
  API --> P
  AI --> GEM[Gemini 3.x]
  ST --> FS[(Firestore)]
  ST -.tests/local.-> MEM[(Memory)]
```

## Request lifecycle: filing a complaint

1. The browser downscales the photo, then POSTs JSON to `/api/issues` with the citizen's Firebase ID
   token (Google or guest) as a bearer credential.
2. `app.ts` sets security headers, checks the origin and the per-IP rate limit, and finds the route.
3. The route verifies the ID token (signature, issuer, audience, expiry), then validates the body with `createIssueSchema` and checks the photo's magic bytes.
4. `AiTriageClient.analyze` computes the rule-engine triage, then asks the Gemini cascade; the answer is
   validated with zod and merged by `reconcileTriage`.
5. `IssueStore.create` assigns `CR-2026-####` in a Firestore transaction and stores the photo and the
   reporter's uid in their own collections, apart from the public record.
6. The response returns the issue and its triage; the tracker updates immediately.

## Decisions

- [ADR 0001: The engine owns the rules, Gemini owns the understanding](adr/0001-engine-owns-rules.md)
- [ADR 0002: A resilient Gemini cascade](adr/0002-gemini-cascade.md)
- [ADR 0003: Firestore behind a storage port](adr/0003-firestore-storage-port.md)
- [ADR 0004: A single Node service on Cloud Run](adr/0004-single-service-cloud-run.md)
- [ADR 0005: Firebase Authentication with server-side token verification](adr/0005-firebase-auth.md)

## Front end

- `src/landing`: the public landing page with a CSS-3D isometric city whose report pins cycle from
  Reported to Resolved. No WebGL, and static under reduced motion.
- `src/app`: a hash router (`#/dashboard`, `#/report`, `#/track`, `#/mine`, `#/admin`) and the console
  layout with a collapsible sidebar (icon rail on desktop, drawer on phones).
- `src/auth`: an `AuthService` port; the Firebase implementation is dynamically imported.
