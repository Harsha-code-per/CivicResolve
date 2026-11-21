# Security

CivicResolve applies defense-in-depth across HTTP transport, authentication, file uploads, AI prompt handling, and container runtime.

## Controls
- **Strict HTTP Headers (`server/lib/security.ts`):** Enforces `Content-Security-Policy` (`default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `COOP: same-origin`, `CORP: same-origin`, and `Permissions-Policy`.
- **CSRF & Origin Protection (`server/app.ts`):** Blocks cross-origin state-changing requests (`POST`/`PATCH`) with `403`.
- **Rate Limiting & Payload Caps (`server/lib/rate-limit.ts`, `server/lib/http.ts`):** Bounded per-IP sliding-window rate limiter (`429` + `Retry-After`) and strict body size caps (`16 KB` standard JSON, `2 MB` image upload).
- **Binary Image Signature Validation (`server/lib/security.ts`):** Verifies authentic PNG, JPEG, and WebP magic bytes before storing or forwarding uploads to Gemini.
- **Admin Authentication (`server/lib/auth.ts`):** Constant-time passcode comparison (`crypto.timingSafeEqual`) and HMAC-SHA256 signed `HttpOnly; SameSite=Strict` session cookies.
- **AI Prompt-Injection Fencing (`server/ai/triage.ts`):** Wraps untrusted citizen text inside `<CITIZEN_REPORT>` delimiters, enforces Gemini structured `responseSchema`, and validates outputs with Zod (`aiTriageOutputSchema`).
- **Supply Chain & Container Hardening:** Multi-stage `node:22-alpine` container running as non-root `USER node`, plus GitHub Actions CodeQL, Dependabot, and `npm audit --audit-level=high`.
