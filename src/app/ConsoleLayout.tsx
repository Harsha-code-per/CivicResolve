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

interface Drawer {
  readonly open: boolean;
  readonly toggle: () => void;
  readonly close: () => void;
}

/**
 * Open/closed state for the mobile navigation drawer; Escape closes it.
 *
 * @returns Drawer state and actions.
 */
function useDrawer(): Drawer {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return {
    open,
    toggle: () => {
      setOpen((value) => !value);
    },
    close: () => {
      setOpen(false);
    },
  };
}

/**
 * Console top bar: drawer button (small screens), breadcrumb, theme and "New report".
 *
 * @param props - Route, theme controls and drawer state.
 * @returns Header element.
 */
function TopBar({
  route,
  theme,
  onToggleTheme,
  drawer,
}: Omit<ConsoleLayoutProps, 'children'> & { readonly drawer: Drawer }): ReactElement {
  return (
    <header className="console-top">
      <button
        type="button"
        className="icon-btn menu-btn"
        aria-expanded={drawer.open}
        aria-controls="console-sidebar"
        onClick={drawer.toggle}
      >
        <Icon name={drawer.open ? 'close' : 'menu'} />
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
  );
}

/**
 * The console frame: collapsible sidebar, top bar and the main region. Focus moves
 * to the main region on every section change so screen readers hear the new page.
 *
 * @param props - Route, theme and page content.
 * @returns Console layout.
 */
export function ConsoleLayout({ children, ...bar }: ConsoleLayoutProps): ReactElement {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const drawer = useDrawer();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [bar.route]);

  return (
    <div className="console" data-collapsed={collapsed} data-drawer={drawer.open}>
      <a href="#console-main" className="skip-link">
        Skip to content
      </a>
      <aside id="console-sidebar" className="sidebar" aria-label="Console navigation">
        <Sidebar
          route={bar.route}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onNavigate={drawer.close}
        />
      </aside>
      <button
        type="button"
        className="scrim"
        tabIndex={-1}
        aria-hidden="true"
        onClick={drawer.close}
      />
      <div className="console-body">
        <TopBar {...bar} drawer={drawer} />
        <main id="console-main" ref={mainRef} tabIndex={-1} className="console-main">
          {children}
        </main>
      </div>
    </div>
  );
}
