# Code Quality

CivicResolve enforces strict static analysis, modular layer boundaries, and zero dead code via `npm run check`.

## Automated Gates
- **Strict TypeScript (`tsconfig.json` & `tsconfig.server.json`):** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, and `noPropertyAccessFromIndexSignature`.
- **Zero-Warning ESLint (`eslint.config.js`):** `strictTypeChecked`, `stylisticTypeChecked`, `eslint-plugin-jsx-a11y/strict`, `eslint-plugin-react-hooks`, `eslint-plugin-jsdoc`, `complexity <= 8`, `max-depth <= 3`, `max-params <= 3`, `max-lines <= 200`, and `explicit-module-boundary-types`.
- **Dead-Code Detection (`knip.json`):** `npm run knip` fails on unused files, exports, or dependencies.
- **Formatting (`.prettierrc.json` & `.editorconfig`):** Verified in CI via `npm run format:check`.
- **Architecture Boundary Tests (`tests/quality/architecture.test.ts`):** Verifies that `src/domain/` contains pure TypeScript with zero React, Node I/O, `fetch`, or `server/` imports.
