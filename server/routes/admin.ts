import type { ServerResponse } from 'node:http';
import { adminLoginSchema, adminUpdateIssueSchema } from '../../src/domain/schemas.js';
import {
  buildSessionCookie,
  constantTimeMatch,
  createSessionToken,
  readCookie,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '../lib/auth.js';
import { HTTP_STATUS, HttpError, sendJson } from '../lib/http.js';
import { isAdminIdentity } from '../lib/identity.js';
import {
  found,
  identify,
  MAX_JSON_BYTES,
  parseBody,
  type Route,
  type RouteContext,
  type RouteDependencies,
} from './context.js';

const isAdmin = ({ req, deps }: RouteContext): boolean =>
  verifySessionToken(readCookie(req, SESSION_COOKIE_NAME), deps.sessionSecret);

/**
 * Issues the HttpOnly admin session cookie.
 *
 * @param res - Response.
 * @param deps - Route dependencies (secret and environment).
 */
function startSession(res: ServerResponse, deps: RouteDependencies): void {
  res.setHeader(
    'Set-Cookie',
    buildSessionCookie(createSessionToken(deps.sessionSecret), deps.isProduction),
  );
  sendJson(res, HTTP_STATUS.ok, { authenticated: true });
}

/** Admin sign-in (passcode or allow-listed Google account), sign-out and status updates. */
const ROUTES: readonly Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/admin\/session$/,
    handle: (ctx) => {
      sendJson(ctx.res, HTTP_STATUS.ok, { authenticated: isAdmin(ctx) });
      return Promise.resolve();
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/login$/,
    handle: async ({ req, res, deps }) => {
      const { passcode } = await parseBody(req, adminLoginSchema, MAX_JSON_BYTES);
      if (!constantTimeMatch(passcode, deps.adminPasscode)) {
        throw new HttpError(HTTP_STATUS.unauthorized, 'Invalid administrator passcode.');
      }
      startSession(res, deps);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/google$/,
    handle: async (ctx) => {
      if (!isAdminIdentity(await identify(ctx), ctx.deps.adminEmails ?? [])) {
        throw new HttpError(HTTP_STATUS.forbidden, 'This Google account is not an administrator.');
      }
      startSession(ctx.res, ctx.deps);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/logout$/,
    handle: ({ res, deps }) => {
      res.setHeader('Set-Cookie', buildSessionCookie('', deps.isProduction, true));
      sendJson(res, HTTP_STATUS.ok, { authenticated: false });
      return Promise.resolve();
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/admin\/issues\/([A-Z0-9-]+)$/,
    handle: async (ctx) => {
      if (!isAdmin(ctx)) {
        throw new HttpError(HTTP_STATUS.unauthorized, 'Administrator authentication required.');
      }
      const input = await parseBody(ctx.req, adminUpdateIssueSchema, MAX_JSON_BYTES);
      const issue = found(await ctx.deps.store.update(ctx.id, input));
      sendJson(ctx.res, HTTP_STATUS.ok, { issue });
    },
  },
];

/**
 * Lists this module's endpoints for the route table.
 *
 * @returns Routes.
 */
export function adminRoutes(): readonly Route[] {
  return ROUTES;
}
