import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ZodType } from 'zod';
import { computeAnalytics } from '../src/domain/analytics.js';
import {
  adminLoginSchema,
  adminUpdateIssueSchema,
  createIssueSchema,
  type CreateIssueInput,
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
import { HTTP_STATUS, HttpError, readJsonBody, sendBinary, sendJson } from './lib/http.js';
import { decodeImageDataUrl, hasValidImageMagicBytes } from './lib/images.js';
import type { IssueStore } from './store/issues.js';

/** Plain JSON bodies stay small; only complaint submissions may carry a photo. */
const MAX_JSON_BYTES = 16 * 1024;
const MAX_UPLOAD_BYTES = 1024 * 1024;
const IMAGE_CACHE = 'public, max-age=86400, immutable';

export interface RouteDependencies {
  readonly store: IssueStore;
  readonly ai: AiTriageClient;
  readonly adminPasscode: string;
  readonly sessionSecret: string;
  readonly isProduction: boolean;
  readonly now: () => number;
}

interface RouteContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly deps: RouteDependencies;
  readonly id: string;
}

interface Route {
  readonly method: 'GET' | 'POST' | 'PATCH';
  readonly pattern: RegExp;
  readonly handle: (ctx: RouteContext) => Promise<void>;
}

/**
 * Reads and validates a JSON body, turning the first schema problem into a 400.
 *
 * @param req - Incoming request.
 * @param schema - Zod schema for the body.
 * @param maxBytes - Body size ceiling.
 * @returns Validated body.
 */
async function parseBody<T>(
  req: IncomingMessage,
  schema: ZodType<T>,
  maxBytes: number,
): Promise<T> {
  const parsed = schema.safeParse(await readJsonBody(req, maxBytes));
  if (!parsed.success) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      parsed.error.issues.map((issue) => issue.message).join(' '),
    );
  }
  return parsed.data;
}

/**
 * Reads a complaint and rejects photos whose bytes do not match their declared type.
 *
 * @param req - Incoming request.
 * @returns Validated complaint.
 */
async function parseComplaint(req: IncomingMessage): Promise<CreateIssueInput> {
  const input = await parseBody(req, createIssueSchema, MAX_UPLOAD_BYTES);
  if (input.imageDataUrl && !hasValidImageMagicBytes(input.imageDataUrl)) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      'Uploaded image failed binary signature validation.',
    );
  }
  return input;
}

const isAdmin = ({ req, deps }: RouteContext): boolean =>
  verifySessionToken(readCookie(req, SESSION_COOKIE_NAME), deps.sessionSecret);

/** Every API endpoint. The id group in a pattern is passed to the handler as ctx.id. */
const ROUTES: readonly Route[] = [
  {
    method: 'GET',
    pattern: /^\/healthz$/,
    handle: ({ res }) => {
      sendJson(res, HTTP_STATUS.ok, { status: 'ok', service: 'civicresolve' });
      return Promise.resolve();
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/issues$/,
    handle: async ({ res, deps }) => {
      const issues = filterAndSortIssues(await deps.store.list(), {});
      sendJson(res, HTTP_STATUS.ok, { issues, analytics: computeAnalytics(issues, deps.now()) });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/issues\/([A-Z0-9-]+)$/,
    handle: async ({ res, deps, id }) => {
      const issue = await deps.store.getById(id);
      if (!issue) throw new HttpError(HTTP_STATUS.notFound, 'Civic issue not found.');
      sendJson(res, HTTP_STATUS.ok, { issue });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/issues\/([A-Z0-9-]+)\/image$/,
    handle: async ({ res, deps, id }) => {
      const stored = await deps.store.getImage(id);
      const image = stored ? decodeImageDataUrl(stored) : undefined;
      if (!image) throw new HttpError(HTTP_STATUS.notFound, 'Image not found.');
      sendBinary(res, {
        bytes: image.bytes,
        contentType: image.mimeType,
        cacheControl: IMAGE_CACHE,
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/triage$/,
    handle: async ({ req, res, deps }) => {
      const triage = await deps.ai.analyze(await parseComplaint(req));
      sendJson(res, HTTP_STATUS.ok, { triage });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/issues$/,
    handle: async ({ req, res, deps }) => {
      const input = await parseComplaint(req);
      const triage = await deps.ai.analyze(input);
      const issue = await deps.store.create(input, triage);
      sendJson(res, HTTP_STATUS.created, { issue, triage });
    },
  },
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
      res.setHeader(
        'Set-Cookie',
        buildSessionCookie(createSessionToken(deps.sessionSecret), deps.isProduction),
      );
      sendJson(res, HTTP_STATUS.ok, { authenticated: true });
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
      const issue = await ctx.deps.store.update(ctx.id, input);
      if (!issue) throw new HttpError(HTTP_STATUS.notFound, 'Civic issue not found.');
      sendJson(ctx.res, HTTP_STATUS.ok, { issue });
    },
  },
];

export interface MatchedRoute {
  readonly handle: (ctx: RouteContext) => Promise<void>;
  readonly id: string;
}

/**
 * Finds the handler for a request and extracts its id path segment.
 *
 * @param method - HTTP method.
 * @param pathname - URL pathname.
 * @returns Matching handler and id, or undefined.
 */
export function matchRoute(method: string, pathname: string): MatchedRoute | undefined {
  for (const route of ROUTES) {
    const match = route.method === method ? route.pattern.exec(pathname) : null;
    if (match) return { handle: route.handle, id: match[1] ?? '' };
  }
  return undefined;
}
