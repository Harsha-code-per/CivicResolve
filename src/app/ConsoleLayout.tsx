import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Icon } from '../ui/Icon.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { useSidebarCollapsed, type Theme } from './hooks.js';
import { hrefFor, labelFor, type ConsoleRoute } from './routes.js';
import { Sidebar } from './Sidebar.js';

export interface ConsoleLayoutProps {
  readonly route: ConsoleRoute;
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
  readonly children: ReactNode;
}

/**
 * The console frame: collapsible sidebar, top bar and the main region. Focus moves
 * to the main region on every section change so screen readers hear the new page.
 *
 * @param props - Route, theme and page content.
 * @returns Console layout.
 */
export function ConsoleLayout({
  route,
  theme,
  onToggleTheme,
  children,
}: ConsoleLayoutProps): ReactElement {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <div className="console" data-collapsed={collapsed} data-drawer={drawerOpen}>
      <a href="#console-main" className="skip-link">
        Skip to content
      </a>
      <aside id="console-sidebar" className="sidebar" aria-label="Console navigation">
        <Sidebar
          route={route}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onNavigate={() => {
            setDrawerOpen(false);
          }}
        />
      </aside>
      <button
        type="button"
        className="scrim"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          setDrawerOpen(false);
        }}
      />
      <div className="console-body">
        <header className="console-top">
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={drawerOpen}
            aria-controls="console-sidebar"
            onClick={() => {
              setDrawerOpen((open) => !open);
            }}
          >
            <Icon name={drawerOpen ? 'close' : 'menu'} />
            <span className="sr-only">Menu</span>
          </button>
          <p className="crumbs">
            <a href={hrefFor('home')}>CivicResolve</a>
            <span aria-hidden="true">/</span>
            <span>{labelFor(route)}</span>
          </p>
          <div className="top-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <a className="btn btn-primary btn-sm" href={hrefFor('report')}>
              <Icon name="plus" />
              New report
            </a>
          </div>
        </header>
        <main id="console-main" ref={mainRef} tabIndex={-1} className="console-main">
          {children}
        </main>
      </div>
    </div>
  );
}
