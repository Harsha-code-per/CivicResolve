import type { ReactElement } from 'react';
import { useAuth } from '../auth/AuthProvider.js';
import { Icon, Logo } from '../ui/Icon.js';
import { CONSOLE_ROUTES, hrefFor, type ConsoleRoute } from './routes.js';

export interface SidebarProps {
  readonly route: ConsoleRoute;
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
  readonly onNavigate: () => void;
}

/**
 * Signed-in user's chip with a sign-out button, or a hint to sign in.
 *
 * @returns Account area for the sidebar footer.
 */
function Account(): ReactElement | null {
  const auth = useAuth();
  if (auth.status !== 'ready') return null;
  if (!auth.user) {
    return (
      <a className="nav-item" href={hrefFor('mine')}>
        <Icon name="user" />
        <span className="nav-label">Sign in</span>
      </a>
    );
  }
  return (
    <div className="account">
      <span className="avatar" aria-hidden="true">
        {auth.user.name.slice(0, 1)}
      </span>
      <span className="nav-label account-name">
        {auth.user.name}
        <small>{auth.user.isGuest ? 'Guest account' : auth.user.email}</small>
      </span>
      <button
        type="button"
        className="icon-btn"
        onClick={() => void auth.signOut()}
        title="Sign out"
      >
        <Icon name="logout" />
        <span className="sr-only">Sign out</span>
      </button>
    </div>
  );
}

/**
 * Collapsible console sidebar. On desktop it folds to an icon rail (labels stay as
 * accessible names); on small screens it becomes a slide-over drawer.
 *
 * @param props - Active route, collapsed state and callbacks.
 * @returns Sidebar element.
 */
export function Sidebar({
  route,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps): ReactElement {
  return (
    <div className="sidebar-inner">
      <a className="sidebar-brand" href={hrefFor('home')}>
        <Logo />
        <span className="nav-label brand-name">CivicResolve</span>
      </a>
      <nav aria-label="Console">
        <ul className="nav-list">
          {CONSOLE_ROUTES.map((entry) => (
            <li key={entry.id}>
              <a
                className="nav-item"
                href={hrefFor(entry.id)}
                aria-current={route === entry.id ? 'page' : undefined}
                title={collapsed ? entry.label : undefined}
                onClick={onNavigate}
              >
                <Icon name={entry.icon} />
                <span className="nav-label">{entry.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-foot">
        <Account />
        <button
          type="button"
          className="nav-item collapse-btn"
          aria-expanded={!collapsed}
          aria-controls="console-sidebar"
          onClick={onToggleCollapsed}
        >
          <Icon name="collapse" />
          <span className="nav-label">Collapse sidebar</span>
        </button>
      </div>
    </div>
  );
}
