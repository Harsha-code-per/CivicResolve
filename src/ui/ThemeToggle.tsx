import type { ReactElement } from 'react';
import type { Theme } from '../app/hooks.js';
import { Icon } from './Icon.js';

/**
 * Light/dark switch. A toggle button whose name stays "Dark mode" and whose
 * pressed state says whether it is on.
 *
 * @param props - Current theme and toggle callback.
 * @returns Button element.
 */
export function ThemeToggle({
  theme,
  onToggle,
}: {
  readonly theme: Theme;
  readonly onToggle: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={theme === 'dark'}
      onClick={onToggle}
      title="Toggle dark mode"
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      <span className="sr-only">Dark mode</span>
    </button>
  );
}
