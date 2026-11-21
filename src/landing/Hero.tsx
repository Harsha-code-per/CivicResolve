import type { ReactElement } from 'react';
import { hrefFor } from '../app/routes.js';
import type { Theme } from '../app/hooks.js';
import { Icon, Logo } from '../ui/Icon.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { CityScene } from './CityScene.js';

/**
 * Sticky landing navigation: brand, section links, theme toggle and console link.
 *
 * @param props - Theme and toggle.
 * @returns Header element.
 */
export function LandingNav({
  theme,
  onToggleTheme,
}: {
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
}): ReactElement {
  return (
    <header className="land-nav">
      <a className="land-brand" href={hrefFor('home')}>
        <Logo />
        <span>CivicResolve</span>
      </a>
      <nav aria-label="Site">
        <ul className="land-links">
          <li>
            <a href="#how">How it works</a>
          </li>
          <li>
            <a href="#gemini">Gemini, kept honest</a>
          </li>
          <li>
            <a href="#pipeline">Live pipeline</a>
          </li>
        </ul>
      </nav>
      <div className="top-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <a className="btn btn-primary btn-sm" href={hrefFor('dashboard')}>
          Open console
          <Icon name="arrow" />
        </a>
      </div>
    </header>
  );
}

/**
 * The hero: headline, calls to action and the 3D city with floating triage cards.
 *
 * @returns Hero section.
 */
export function Hero(): ReactElement {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="live-dot" aria-hidden="true" />
          Civic grievances, triaged by Google Gemini
        </p>
        <h1 id="hero-title" className="hero-title">
          Report it. Route it. <em>See it resolved.</em>
        </h1>
        <p className="hero-lead">
          Potholes, overflowing bins, dark streetlights, burst pipes. Tell the city once, with a
          photo. Gemini sends it to the right department at the right urgency, and you follow every
          step until it is fixed.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary btn-lg" href={hrefFor('report')}>
            Report an issue
            <Icon name="arrow" />
          </a>
          <a className="btn btn-ghost btn-lg" href={hrefFor('track')}>
            Explore the live tracker
          </a>
        </div>
      </div>
      <div className="hero-visual">
        <CityScene />
        <div className="float-card float-a" aria-hidden="true">
          <span className="chip chip-critical">Critical</span>
          <strong>Exposed live wire near school</strong>
          <span>Street Lighting &amp; Electrical · SLA 4h</span>
        </div>
        <div className="float-card float-b" aria-hidden="true">
          <Icon name="spark" />
          <span>Gemini triage · 1.8 s</span>
        </div>
        <div className="float-card float-c" aria-hidden="true">
          <span className="chip chip-resolved">Resolved</span>
          <strong>Pothole, Avinashi Road</strong>
        </div>
      </div>
    </section>
  );
}
