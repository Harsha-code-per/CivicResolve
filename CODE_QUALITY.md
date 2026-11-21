# Code quality

`npm run check` fails the build on any of the problems below, and CI runs it on every push.

## Structure

| Layer          | Responsibility                                                                                                                                                       | Depends on          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `src/domain`   | Pure rules: types, zod schemas, field limits, priority and safety floor, SLA, workflow, analytics.                                                                   | nothing (zod only)  |
| `src/app`      | Shell: hash routing (`routes.ts`), shared state hooks (`hooks.ts`), console layout and sidebar.                                                                      | ui, auth, domain    |
| `src/auth`     | `AuthService` port over Firebase Auth (lazy-loaded) and the `AuthProvider` context.                                                                                  | `src/lib`           |
| `src/landing`  | Public landing page and the CSS-3D city scene.                                                                                                                       | ui                  |
| `src/ui`       | React views. State lives in hooks (`useReportDraft`, `useMyIssues`); views only render.                                                                              | domain, `src/lib`   |
| `server/`      | Config, request pipeline (`app.ts`) and a route table (`routes.ts`) built from `routes/public.ts` and `routes/admin.ts`, which share helpers in `routes/context.ts`. | domain, ports below |
| `server/ai`    | `TriageModel` port, Gemini adapter, fenced prompts, cascade.                                                                                                         | domain              |
| `server/store` | `IssueStore` port with in-memory and Firestore adapters.                                                                                                             | domain              |

`tests/quality/architecture.test.ts` enforces that `src/domain` never imports React, Node I/O, `fetch` or the server.

## Principles, and where they show

| Principle                 | Where                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single responsibility** | `sla.ts` only does SLA maths; `images.ts` only validates and decodes photos; each route handler is a few lines.                                                                                                                                                                                                                |
| **Open/closed**           | A new storage backend implements `IssueStore`; a new AI model implements `TriageModel`; a new identity provider implements `IdentityVerifier` (server) or `AuthService` (client). None needs changes elsewhere.                                                                                                                |
| **Dependency inversion**  | `createApp`, `createAiTriageClient`, both stores, `createFirebaseVerifier` (key set) and `AuthProvider` (service loader) take their dependencies as arguments, so tests inject fakes instead of mocking modules.                                                                                                               |
| **DRY**                   | One zod schema validates the request **and** generates Gemini's JSON schema. `FIELD_LIMITS` feeds both zod and the form's `maxLength`. `buildIssueRecord` is shared by both stores. One generic `SelectField` serves every dropdown and narrows its value back to the option type, so no component casts `event.target.value`. |
| **Fail safe**             | `toPublicError` maps every failure to one status and a safe message; unknown errors become a generic 500. Every AI failure falls back to the rule engine.                                                                                                                                                                      |
| **KISS / YAGNI**          | No router (a 30-line hash router), no state library, no chart library (native `<progress>` and `<meter>`), no 3D library (CSS transforms). Only the two Firebase packages auth needs, not the whole SDK.                                                                                                                       |

## Enforced rules

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUnused*`.
- ESLint `strictTypeChecked` + `stylisticTypeChecked`, jsx-a11y **strict**, react-hooks, with **zero warnings**.
- `complexity ≤ 8`, `max-depth ≤ 3`, `max-params ≤ 3`, `max-lines ≤ 200` per file, `max-lines-per-function ≤ 60` (seed data exempt), `eqeqeq`, `no-console` (except info/warn/error).
- JSDoc on every exported function, explaining _why_ rather than restating the signature.
- Named constants for every threshold (`PRIORITY_SCORE_FLOOR`, `HTTP_STATUS`, `MAX_IMAGE_EDGE`, …).
- knip: no unused files, exports, types or dependencies.
- Prettier formatting checked in CI.
