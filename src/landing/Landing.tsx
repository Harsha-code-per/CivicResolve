import type { ReactElement } from 'react';
import { hrefFor } from '../app/routes.js';
import type { Theme } from '../app/hooks.js';
import type { IssueAnalytics } from '../domain/types.js';
import { Icon, Logo } from '../ui/Icon.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { CityScene } from './CityScene.js';
import { GeminiSection, HowItWorks } from './Sections.js';

export interface LandingProps {
  readonly analytics: IssueAnalytics;
  readonly loading: boolean;
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
}

/**
 * Formats a live metric, showing an ellipsis while the first load is in flight.
 *
 * @param loading - Whether data is still loading.
 * @param value - Metric value.
 * @returns Display string.
 */
const metric = (loading: boolean, value: string | number): string =>
  loading ? '…' : String(value);

/**
 * Public landing page: cinematic hero with a 3D city, live numbers, how it works,
 * how Gemini is kept honest, and the live resolution pipeline.
 *
 * @param props - Live analytics, loading flag and theme controls.
 * @returns Landing page.
 */
export function Landing({ analytics, loading, theme, onToggleTheme }: LandingProps): ReactElement {
  const stats = [
    { label: 'Reports filed', value: metric(loading, analytics.total) },
    { label: 'Critical hazards open', value: metric(loading, analytics.criticalOpen) },
    { label: 'Being fixed now', value: metric(loading, analytics.inProgress) },
    { label: 'Resolution rate', value: metric(loading, `${String(analytics.resolutionRate)}%`) },
  ];
  const pipeline = [
    { key: 'reported', label: 'Reported', value: analytics.reported },
    { key: 'in_progress', label: 'In progress', value: analytics.inProgress },
    { key: 'resolved', label: 'Resolved', value: analytics.resolved },
  ];

  return (
    <div className="landing">
      <a href="#landing-main" className="skip-link">
        Skip to content
      </a>
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

      <main id="landing-main" tabIndex={-1}>
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
              photo. Gemini sends it to the right department at the right urgency, and you follow
              every step until it is fixed.
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

        <section className="stat-strip" aria-label="Live numbers" aria-busy={loading}>
          {stats.map((stat) => (
            <div key={stat.label} className="stat">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </section>

        <HowItWorks />
        <GeminiSection />

        <section id="pipeline" className="land-section" aria-labelledby="pipeline-title">
          <p className="kicker">Live pipeline</p>
          <h2 id="pipeline-title" className="section-title">
            Every complaint, in the open.
          </h2>
          <ol className="pipeline">
            {pipeline.map((stage) => (
              <li key={stage.key} className={`pipe pipe-${stage.key}`}>
                <span className="pipe-count">{metric(loading, stage.value)}</span>
                <span className="pipe-label">{stage.label}</span>
              </li>
            ))}
          </ol>
          <a className="btn btn-ghost" href={hrefFor('track')}>
            Open the live tracker
            <Icon name="arrow" />
          </a>
        </section>

        <section className="cta-band" aria-labelledby="cta-title">
          <h2 id="cta-title" className="section-title">
            Seen something broken today?
          </h2>
          <a className="btn btn-primary btn-lg" href={hrefFor('report')}>
            Report it now
            <Icon name="arrow" />
          </a>
        </section>
      </main>

      <footer className="land-foot">
        <span>CivicResolve · Citizen grievance management</span>
        <span>Google Gemini · Firebase Auth · Cloud Firestore · Cloud Run</span>
      </footer>
    </div>
  );
}
