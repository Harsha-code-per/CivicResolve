# Accessibility

CivicResolve targets **WCAG 2.2 Level AA** compliance across desktop, mobile, keyboard-only, screen-reader, and reduced-motion environments.

## Implemented Standards

- **Semantic Landmarks & Skip Navigation (`src/ui/App.tsx`):** Proper `<header>`, `<nav>`, `<main>`, `<footer>`, single `<h1>` per view, and a keyboard-focusable Skip to Main Content link.
- **ARIA Tabs & Full Keyboard Support:** Implements `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, roving `tabIndex`, and `ArrowLeft` / `ArrowRight` / `Home` / `End` navigation.
- **Non-Color-Only Status & Priority Indicators:** Every priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and status (`Reported`, `In Progress`, `Resolved`) pairs high-contrast color tokens (`>= 4.5:1`) with explicit text labels.
- **Accessible Data Alternative (`src/ui/IssueTracker.tsx`):** One-click toggle between card view and a semantic `<table>` with `scope="col"` headers.
- **Error Focus & Live Regions (`src/ui/ReportForm.tsx`):** Validation alerts use `role="alert"` with programmatic focus transfer; AI triage updates and submission confirmations announce via `aria-live="polite"`.
- **Light/Dark Themes & Reduced Motion (`src/styles/tokens.css`, `src/styles/app.css`):** Respects `prefers-color-scheme` and `prefers-reduced-motion: reduce`, plus a manual theme switcher.
- **Automated Verification:** Enforced via `eslint-plugin-jsx-a11y/strict`, `axe-core` unit tests, and `@axe-core/playwright` WCAG 2.2 AA scans.
