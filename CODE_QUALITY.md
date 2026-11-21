# Code quality

`npm run check` fails the build on any of the problems below, and CI runs it on every push.

## Structure

| Layer          | Responsibility                                                                                     | Depends on          |
| -------------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| `src/domain`   | Pure rules: types, zod schemas, field limits, priority and safety floor, SLA, workflow, analytics. | nothing (zod only)  |
| `src/ui`       | React views. State lives in hooks (`useReportDraft`); views only render.                           | domain, `src/lib`   |
| `server/`      | Config, request pipeline (`app.ts`) and a route table (`routes.ts`).                               | domain, ports below |
| `server/ai`    | `TriageModel` port, Gemini adapter, fenced prompts, cascade.                                       | domain              |
| `server/store` | `IssueStore` port with in-memory and Firestore adapters.                                           | domain              |

`tests/quality/architecture.test.ts` enforces that `src/domain` never imports React, Node I/O, `fetch` or the server.

## Principles, and where they show

| Principle                 | Where                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single responsibility** | `sla.ts` only does SLA maths; `images.ts` only validates and decodes photos; each route handler is a few lines.                                                                     |
| **Open/closed**           | A new storage backend implements `IssueStore`; a new AI model implements `TriageModel`. Neither needs changes elsewhere.                                                            |
| **Dependency inversion**  | `createApp`, `createAiTriageClient` and both stores take their dependencies (store, models, clock) as arguments, so tests inject fakes instead of mocking modules.                  |
| **DRY**                   | One zod schema validates the request **and** generates Gemini's JSON schema. `FIELD_LIMITS` feeds both zod and the form's `maxLength`. `buildIssueRecord` is shared by both stores. |
| **Fail safe**             | `toPublicError` maps every failure to one status and a safe message; unknown errors become a generic 500. Every AI failure falls back to the rule engine.                           |
| **KISS / YAGNI**          | Five runtime dependencies (React, React DOM, zod, the Gemini SDK, Firestore). No router, state library or chart library; native `<progress>` draws the charts.                      |

## Enforced rules

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUnused*`.
- ESLint `strictTypeChecked` + `stylisticTypeChecked`, jsx-a11y **strict**, react-hooks, with **zero warnings**.
- `complexity ≤ 8`, `max-depth ≤ 3`, `max-params ≤ 3`, `max-lines ≤ 200` per file, `eqeqeq`, `no-console` (except info/warn/error).
- JSDoc on every exported function, explaining _why_ rather than restating the signature.
- Named constants for every threshold (`PRIORITY_SCORE_FLOOR`, `HTTP_STATUS`, `MAX_IMAGE_EDGE`, …).
- knip: no unused files, exports, types or dependencies.
- Prettier formatting checked in CI.
