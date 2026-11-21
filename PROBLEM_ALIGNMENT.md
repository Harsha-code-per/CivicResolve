# Problem statement alignment

| Requirement                                                   | Implementation                                                                                                 | Tests                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Submit title, description, location, category, optional image | `src/ui/ReportForm.tsx`, `useReportDraft.ts`, `createIssueSchema`, `POST /api/issues`                          | `tests/ui/report.test.tsx`, `tests/server/api.test.ts`, e2e |
| Gemini identifies the category                                | `server/ai/model.ts` (Gemini SDK, JSON schema output, inline photo), `server/ai/prompts.ts`                    | `tests/server/triage.test.ts`                               |
| Priority by urgency and public impact                         | Gemini priority + `computeUrgencyScore` + `reconcileTriage` safety floor; SLA per priority                     | `tests/domain/domain.test.ts`                               |
| Recommend the department                                      | `CATEGORY_TO_DEPARTMENT`, Gemini's department choice, admin reassignment                                       | domain, triage and admin tests                              |
| Tracking dashboard: Reported, In Progress, Resolved           | `src/ui/IssueTracker.tsx`, `IssueCard`, `IssueTable`, status timeline, SLA countdown, filters                  | `tests/ui/tracker.test.tsx`, e2e                            |
| Admin reviews, updates status, manages issues                 | `src/ui/AdminDashboard.tsx`, `AdminIssueRow.tsx`, `PATCH /api/admin/issues/:id`, workflow state machine        | `tests/ui/admin.test.tsx`, `tests/server/api.test.ts`, e2e  |
| End-to-end workflow                                           | Report → Gemini triage → Firestore → tracker → admin → resolved, with an audit trail                           | `e2e/civicresolve.spec.ts`                                  |
| Visualise progress toward resolution                          | `src/ui/ResolutionProgress.tsx`: resolution rate, open past SLA, median time to resolve, pipeline, departments | `tests/ui/tracker.test.tsx`, analytics tests                |
| Use Google Gemini and Google Cloud                            | Gemini 3.x cascade, Cloud Run hosting, Firestore persistence, Secret Manager for the key                       | `tests/server/store.test.ts`, live deployment               |

## Beyond the brief

- **Preview before filing:** citizens see how Gemini triaged their complaint before submitting it.
- **Photo understanding:** Gemini uses the photo to confirm or correct the text.
- **Safety floor:** the AI cannot under-rate a life-threatening hazard.
- **SLA accountability:** every issue shows a due time, and late resolutions stay recorded as breaches.
- **Transparency:** each issue states whether Gemini or the rule engine triaged it.
- **Privacy:** photos are re-encoded in the browser, which removes EXIF location data.
