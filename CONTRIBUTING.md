# Contributing

1. `npm ci`, then `npm run check` must pass (formatting, lint with zero warnings, types, knip, 100% coverage, build, bundle budget).
2. Run `npm run e2e` for UI changes; new views need an axe scan.
3. Keep `src/domain` pure: no React, Node I/O or network calls.
4. Name every threshold as a constant and document exported functions with JSDoc that explains why.
5. Use small, descriptive commits.
