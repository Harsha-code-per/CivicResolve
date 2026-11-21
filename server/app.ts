import type { IncomingMessage, ServerResponse } from 'node:http';
import { computeAnalytics } from '../src/domain/analytics.js';
import {
  adminLoginSchema,
  adminUpdateIssueSchema,
  createIssueSchema,
  triagePreviewSchema,
} from '../src/domain/schemas.js';
import { filterAndSortIssues } from '../src/domain/workflow.js';
import type { AiTriageClient } from './ai/triage.js';
import {
  buildSessionCookie,
  constantTimeMatch,
  createSessionToken,
  readCookie,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from './lib/auth.js';
import { getClientIp, HttpError, readJsonBody, sendJson, serveStaticAsset } from './lib/http.js';
import { createRateLimiter, type RateLimiter } from './lib/rate-limit.js';
import {
  applySecurityHeaders,
  hasValidImageMagicBytes,
  isSameOriginRequest,
} from './lib/security.js';
import type { IssueStore } from './store/issues.js';

const MAX_STANDARD_JSON_BYTES = 16 * 1024;
const MAX_UPLOAD_JSON_BYTES = 2 * 1024 * 1024;

export interface AppDependencies {
  readonly store: IssueStore;
  readonly ai: AiTriageClient;
  readonly adminPasscode: string;
  readonly sessionSecret: string;
  readonly isProduction: boolean;
  readonly staticDir?: string;
  readonly publicOrigin?: string;
  readonly rateLimiter?: RateLimiter;
}

/**
 * Validates optional image upload data URL against authentic binary magic bytes.
 *
 * @param imageDataUrl - Optional base64 image data URL.
 */
function assertSafeImage(imageDataUrl?: string): void {
  if (imageDataUrl && !hasValidImageMagicBytes(imageDataUrl)) {
    throw new HttpError(400, 'Uploaded image failed binary signature validation.');
  }
}

/**
 * Handles POST /api/triage to preview Gemini classification, priority, and department routing.
 *
 * @param req - Incoming HTTP request.
 * @param res - Outgoing HTTP response.
 * @param deps - Application dependencies.
 */
async function handleTriage(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDependencies,
): Promise<void> {
  const raw = await readJsonBody(req, MAX_UPLOAD_JSON_BYTES);
  const parsed = triagePreviewSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid triage payload.');
  }
  assertSafeImage(parsed.data.imageDataUrl);
  const triage = await deps.ai.analyze(parsed.data);
  sendJson(res, 200, { triage });
}

/**
 * Handles POST /api/issues to create and auto-triage a new citizen grievance.
 *
 * @param req - Incoming HTTP request.
 * @param res - Outgoing HTTP response.
 * @param deps - Application dependencies.
 */
async function handleCreateIssue(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDependencies,
): Promise<void> {
  const raw = await readJsonBody(req, MAX_UPLOAD_JSON_BYTES);
  const parsed = createIssueSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid issue payload.');
  }
  assertSafeImage(parsed.data.imageDataUrl);
  const triage = await deps.ai.analyze(parsed.data);
  const issue = deps.store.create(parsed.data, triage);
  sendJson(res, 201, { issue, triage });
}

/**
 * Handles admin authentication and protected issue status updates.
 *
 * @param req - Incoming HTTP request.
 * @param res - Outgoing HTTP response.
 * @param pathname - Parsed request pathname.
 * @param deps - Application dependencies.
 */
async function handleAdminRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  deps: AppDependencies,
): Promise<boolean> {
  if (req.method === 'GET' && pathname === '/api/admin/session') {
    const authenticated = verifySessionToken(
      readCookie(req, SESSION_COOKIE_NAME),
      deps.sessionSecret,
    );
    sendJson(res, 200, { authenticated });
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/admin/login') {
    const raw = await readJsonBody(req, MAX_STANDARD_JSON_BYTES);
    const parsed = adminLoginSchema.safeParse(raw);
    if (!parsed.success || !constantTimeMatch(parsed.data.passcode, deps.adminPasscode)) {
      throw new HttpError(401, 'Invalid administrator passcode.');
    }
    const token = createSessionToken(deps.sessionSecret);
    res.setHeader('Set-Cookie', buildSessionCookie(token, deps.isProduction));
    sendJson(res, 200, { authenticated: true });
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    res.setHeader('Set-Cookie', buildSessionCookie('', deps.isProduction, true));
    sendJson(res, 200, { authenticated: false });
    return true;
  }
  const patchMatch = /^\/api\/admin\/issues\/([A-Z0-9-]+)$/.exec(pathname);
  if (req.method === 'PATCH' && patchMatch?.[1]) {
    if (!verifySessionToken(readCookie(req, SESSION_COOKIE_NAME), deps.sessionSecret)) {
      throw new HttpError(401, 'Administrator authentication required.');
    }
    const raw = await readJsonBody(req, MAX_STANDARD_JSON_BYTES);
    const parsed = adminUpdateIssueSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid admin update payload.');
    }
    const updated = deps.store.updateByAdmin(patchMatch[1], parsed.data);
    if (!updated) throw new HttpError(404, 'Civic issue not found.');
    sendJson(res, 200, { issue: updated });
    return true;
  }
  return false;
}

/**
 * Routes public API requests for health checks, listing, triage, and submission.
 *
 * @param req - Incoming HTTP request.
 * @param res - Outgoing HTTP response.
 * @param pathname - Parsed URL pathname.
 * @param deps - Application dependencies.
 */
async function routeApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  deps: AppDependencies,
): Promise<boolean> {
  if (req.method === 'GET' && pathname === '/healthz') {
    sendJson(res, 200, { status: 'ok', service: 'civicresolve' });
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/issues') {
    const issues = filterAndSortIssues(deps.store.list(), {});
    sendJson(res, 200, { issues, analytics: computeAnalytics(issues) });
    return true;
  }
  const detailMatch = /^\/api\/issues\/([A-Z0-9-]+)$/.exec(pathname);
  if (req.method === 'GET' && detailMatch?.[1]) {
    const issue = deps.store.getById(detailMatch[1]);
    if (!issue) throw new HttpError(404, 'Civic issue not found.');
    sendJson(res, 200, { issue });
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/triage') {
    await handleTriage(req, res, deps);
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/issues') {
    await handleCreateIssue(req, res, deps);
    return true;
  }
  return handleAdminRoute(req, res, pathname, deps);
}

/**
 * Creates the main Node HTTP request handler with security headers, rate limiting, and routing.
 *
 * @param deps - Injected store, AI client, auth secrets, and optional static directory.
 * @returns Async Node HTTP request listener.
 */
export function createApp(
  deps: AppDependencies,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const limiter = deps.rateLimiter ?? createRateLimiter(60, 60_000);

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    applySecurityHeaders(res);
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

    try {
      if (pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && !isSameOriginRequest(req, deps.publicOrigin)) {
          throw new HttpError(403, 'Cross-origin state-changing requests are blocked.');
        }
        const limit = limiter.check(getClientIp(req));
        if (!limit.allowed) {
          res.setHeader('Retry-After', String(limit.retryAfterSeconds));
          throw new HttpError(429, 'Rate limit exceeded. Please try again shortly.');
        }
      }

      if (await routeApi(req, res, pathname, deps)) return;
      if (deps.staticDir && req.method === 'GET') {
        if (await serveStaticAsset(deps.staticDir, pathname, res)) return;
      }
      sendJson(res, 404, { error: 'Not found.' });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof HttpError ? error.message : 'Internal server error.';
      sendJson(res, status, { error: message });
    }
  };
}
