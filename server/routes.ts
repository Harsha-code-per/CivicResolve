import { adminRoutes } from './routes/admin.js';
import type { Route, RouteContext } from './routes/context.js';
import { publicRoutes } from './routes/public.js';

export type { RouteDependencies } from './routes/context.js';

/** Every API endpoint. The id group in a pattern is passed to the handler as ctx.id. */
const ROUTES: readonly Route[] = [...publicRoutes(), ...adminRoutes()];

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
