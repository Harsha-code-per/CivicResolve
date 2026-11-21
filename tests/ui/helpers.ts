import { vi } from 'vitest';
import { computeAnalytics } from '../../src/domain/analytics.js';
import { triageDeterministic } from '../../src/domain/priority.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import type { CivicIssue } from '../../src/domain/types.js';

interface FakeReply {
  readonly status?: number;
  readonly body: unknown;
}

type Handler = (body: unknown) => FakeReply;

export const seedIssues = (): CivicIssue[] => createSeedIssues();

export const sampleTriage = triageDeterministic({
  title: 'Severe waterlogging blocking road',
  description: 'Blocked storm drain is causing knee-deep flooding across both lanes.',
  location: 'Peelamedu',
});

/**
 * Replaces fetch with a router keyed by "METHOD /path". Unknown routes return 404.
 */
export function mockFetch(routes: Record<string, Handler>) {
  const spy = vi.fn((input: string | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const handler = routes[key];
    const reply = handler
      ? handler(init?.body ? JSON.parse(String(init.body)) : undefined)
      : { status: 404, body: { error: `No route for ${key}` } };
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 }),
    );
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** Routes the App needs on start-up. */
export function baseRoutes(issues = seedIssues(), authenticated = false): Record<string, Handler> {
  return {
    'GET /api/issues': () => ({ body: { issues, analytics: computeAnalytics(issues, 0) } }),
    'GET /api/admin/session': () => ({ body: { authenticated } }),
  };
}
