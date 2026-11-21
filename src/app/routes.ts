import type { IconName } from '../ui/Icon.js';

/** Console sections, in sidebar order. */
export const CONSOLE_ROUTES = [
  { id: 'dashboard', label: 'Overview', icon: 'grid' },
  { id: 'report', label: 'Report an issue', icon: 'plus' },
  { id: 'track', label: 'Live tracker', icon: 'list' },
  { id: 'mine', label: 'My reports', icon: 'user' },
  { id: 'admin', label: 'Admin console', icon: 'shield' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type ConsoleRoute = (typeof CONSOLE_ROUTES)[number]['id'];
export type AppRoute = 'home' | ConsoleRoute;

const CONSOLE_IDS: readonly string[] = CONSOLE_ROUTES.map((route) => route.id);
const LABELS = Object.fromEntries(CONSOLE_ROUTES.map((route) => [route.id, route.label])) as Record<
  ConsoleRoute,
  string
>;

/**
 * Reads the route from a location hash such as "#/report".
 *
 * @param hash - window.location.hash.
 * @returns Route id; anything unknown is the landing page.
 */
export function parseRoute(hash: string): AppRoute {
  const id = hash.replace(/^#\/?/, '');
  return CONSOLE_IDS.includes(id) ? (id as ConsoleRoute) : 'home';
}

/**
 * Builds the link for a route.
 *
 * @param route - Route id.
 * @returns Hash href.
 */
export function hrefFor(route: AppRoute): string {
  return route === 'home' ? '#/' : `#/${route}`;
}

/**
 * Human label for a console route.
 *
 * @param route - Console route id.
 * @returns Sidebar label.
 */
export function labelFor(route: ConsoleRoute): string {
  return LABELS[route];
}
