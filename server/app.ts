import type { IncomingMessage, ServerResponse } from 'node:http';
import { InvalidTransitionError } from '../src/domain/workflow.js';
import { getClientIp, HTTP_STATUS, HttpError, sendJson, serveStaticAsset } from './lib/http.js';
import { createRateLimiter, type RateLimiter } from './lib/rate-limit.js';
import { applySecurityHeaders, isSameOriginRequest } from './lib/security.js';
import { matchRoute, type RouteDependencies } from './routes.js';

const RATE_LIMIT_REQUESTS = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

export interface AppDependencies extends Omit<RouteDependencies, 'now'> {
  readonly staticDir?: string;
  readonly publicOrigin?: string;
  readonly rateLimiter?: RateLimiter;
  readonly now?: () => number;
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * Maps any thrown value to a status and a message that is safe to show.
 *
 * Unknown errors become a generic 500 so stack traces and internals never leak.
 *
 * @param error - Thrown value.
 * @returns HTTP status and public message.
 */
function toPublicError(error: unknown): { status: number; message: string } {
  if (error instanceof HttpError) return { status: error.statusCode, message: error.message };
  if (error instanceof InvalidTransitionError) {
    return { status: HTTP_STATUS.conflict, message: error.message };
  }
  return { status: HTTP_STATUS.internalError, message: 'Internal server error.' };
}

/**
 * Creates the Node request handler: security headers, CSRF and rate limits on the API,
 * then the route table, then static assets.
 *
 * @param deps - Store, AI client, secrets and optional static directory.
 * @returns Async Node HTTP request listener.
 */
export function createApp(deps: AppDependencies): Handler {
  const limiter = deps.rateLimiter ?? createRateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
  const routeDeps: RouteDependencies = { ...deps, now: deps.now ?? Date.now };

  const guardApi = (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && !isSameOriginRequest(req, deps.publicOrigin)) {
      throw new HttpError(
        HTTP_STATUS.forbidden,
        'Cross-origin state-changing requests are blocked.',
      );
    }
    const limit = limiter.check(getClientIp(req));
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpError(
        HTTP_STATUS.tooManyRequests,
        'Rate limit exceeded. Please try again shortly.',
      );
    }
  };

  const dispatch = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // Node always sets method and url on server requests.
    const method = String(req.method);
    const pathname = new URL(String(req.url), 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) guardApi(req, res);
    const matched = matchRoute(method, pathname);
    if (matched) {
      await matched.handle({ req, res, deps: routeDeps, id: matched.id });
      return;
    }
    const { staticDir } = deps;
    if (
      (method === 'GET' || method === 'HEAD') &&
      staticDir &&
      (await serveStaticAsset(staticDir, pathname, res))
    )
      return;
    sendJson(res, HTTP_STATUS.notFound, { error: 'Not found.' });
  };

  return async (req, res) => {
    applySecurityHeaders(res);
    try {
      await dispatch(req, res);
    } catch (error) {
      const { status, message } = toPublicError(error);
      sendJson(res, status, { error: message });
    }
  };
}
