# 5. Firebase Authentication with server-side token verification

## Status

Accepted

## Context

Citizens need to follow their own reports, and admins need a stronger sign-in than a shared
passcode. Judges and first-time citizens must still be able to try the app in one click.

## Decision

- Citizens sign in with **Google** or as an **anonymous guest** through Firebase Authentication. The
  web SDK (`@firebase/app` and `@firebase/auth` only) is loaded lazily after `GET /api/config`
  reports that sign-in is configured.
- The server never trusts the client's claim of who it is. It verifies the Firebase **ID token** on
  each request with `jose` against Google's published keys, checking signature, issuer, audience and
  expiry (`server/lib/identity.ts`). No service-account key or Admin SDK is needed.
- The reporter's uid is stored in a separate `issue_owners` collection, so public issue documents
  never reveal who filed them. `GET /api/me/issues` returns only the caller's reports.
- Admins sign in with a Google account on the `ADMIN_EMAILS` allow-list (verified emails only), or
  with the demo passcode, and both lead to the same HttpOnly session cookie.
- Without Firebase config (local development, tests) sign-in is off and reports are anonymous.

## Consequences

- One more runtime dependency pair (about 45 kB gzip, off the critical path) and a slightly wider CSP
  (`apis.google.com`, Firebase Auth endpoints, COOP `same-origin-allow-popups`).
- Guest accounts are per-browser; a guest who clears storage loses their "My reports" list, but the
  reports stay public in the tracker.
