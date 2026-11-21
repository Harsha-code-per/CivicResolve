import { computeAnalytics } from '../../src/domain/analytics.js';
import { filterAndSortIssues } from '../../src/domain/workflow.js';
import { HTTP_STATUS, HttpError, sendBinary, sendJson } from '../lib/http.js';
import { decodeImageDataUrl } from '../lib/images.js';
import { found, identify, parseComplaint, requireIdentity, type Route } from './context.js';

const IMAGE_CACHE = 'public, max-age=86400, immutable';

/** Health, public tracker data, triage and filing a complaint. */
const ROUTES: readonly Route[] = [
  {
    method: 'GET',
    // Cloud Run's front end reserves /healthz, so /api/health is the public probe.
    pattern: /^\/(?:healthz|api\/health)$/,
    handle: ({ res }) => {
      sendJson(res, HTTP_STATUS.ok, { status: 'ok', service: 'civicresolve' });
      return Promise.resolve();
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/config$/,
    handle: ({ res, deps }) => {
      sendJson(res, HTTP_STATUS.ok, { firebase: deps.firebase ?? null });
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
      sendJson(res, HTTP_STATUS.ok, { issue: found(await deps.store.getById(id)) });
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
    handle: async (ctx) => {
      // With sign-in configured every report is tied to a verified (Google or guest) account.
      const reporter = ctx.deps.verifyIdentity ? await requireIdentity(ctx) : await identify(ctx);
      const input = await parseComplaint(ctx.req);
      const triage = await ctx.deps.ai.analyze(input);
      const issue = await ctx.deps.store.create(input, triage, reporter?.uid);
      sendJson(ctx.res, HTTP_STATUS.created, { issue, triage });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/me\/issues$/,
    handle: async (ctx) => {
      const { uid } = await requireIdentity(ctx);
      sendJson(ctx.res, HTTP_STATUS.ok, { issues: await ctx.deps.store.listByReporter(uid) });
    },
  },
];

/**
 * Lists this module's endpoints for the route table.
 *
 * @returns Routes.
 */
export function publicRoutes(): readonly Route[] {
  return ROUTES;
}
