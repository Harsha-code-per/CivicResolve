# ADR 0004: A single Node service on Cloud Run

**Status:** accepted

**Context.** The challenge asks for a Cloud Run deployment, and the app is small.

**Decision.** One container serves both the Vite build and the JSON API from Node's built-in `http`
module (no framework). Same origin means a strict CSP, `SameSite=Strict` cookies and no CORS setup.

**Consequences.** One deploy and one URL, a small dependency surface, and scale-to-zero billing.
