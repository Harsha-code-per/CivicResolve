# Accessibility

Target: **WCAG 2.2 AA**, verified by axe-core in jsdom (unit tests) and in real Chromium on desktop and
mobile, light and dark themes (Playwright).

| Need             | How CivicResolve meets it                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard         | Skip link; WAI-ARIA tabs with roving `tabindex`, where Left/Right wrap, Home/End jump and **focus follows selection**. Every control is native and focusable.       |
| Screen readers   | Landmarks (`header`, `nav`, `main`, `footer`), labelled regions, `aria-labelledby` on every card, a table with a caption and row headers.                           |
| Forms            | Every input has a visible `<label>`; hints are linked with `aria-describedby`; errors render in `role="alert"` and **receive focus**; success uses `role="status"`. |
| Live updates     | The triage inspector and result counts are `aria-live="polite"`; the form sets `aria-busy` while Gemini works.                                                      |
| Charts           | Native `<progress>` elements with accessible names and the numbers written beside them; the tracker also has a table view.                                          |
| Colour           | Priority, status and SLA always appear as text, never only as colour. Text meets 4.5:1 contrast in both themes (e2e found and fixed one badge).                     |
| Label in name    | The theme toggle is a real toggle button (`aria-pressed`) whose name matches its visible text (WCAG 2.5.3).                                                         |
| Small screens    | Responsive layout tested on Pixel 7; the wide table scrolls inside a focusable, labelled region.                                                                    |
| Motion and theme | `prefers-reduced-motion` disables transitions; the theme follows `prefers-color-scheme` and can be toggled.                                                         |
| Images           | Citizen photos have descriptive `alt` text built from the issue title.                                                                                              |
| Language         | `<html lang="en">`; dates use `<time datetime>` and are formatted in the reader's locale.                                                                           |
