# ADR 0003: Firestore behind a storage port

**Status:** accepted

**Context.** Cloud Run instances are ephemeral, so in-memory data disappears on scale-down, yet tests and
local development should not need a database.

**Decision.** Define an `IssueStore` port with two adapters: memory (tests, local) and Firestore
(production, `FIRESTORE_ENABLED=true`). Both share `buildIssueRecord` and `applyAdminTransition` and pass
the same contract tests. Ids come from a transactional counter; photos live in their own collection.

**Consequences.** Data survives restarts and deploys within Firestore's free tier, and swapping the
database touches one file.
