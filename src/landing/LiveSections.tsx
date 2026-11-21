import type { ReactElement } from 'react';
import { hrefFor } from '../app/routes.js';
import type { IssueAnalytics } from '../domain/types.js';
import { Icon } from '../ui/Icon.js';

interface LiveProps {
  readonly analytics: IssueAnalytics;
  readonly loading: boolean;
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
 * Four headline numbers read live from the issue store.
 *
 * @param props - Analytics and loading flag.
 * @returns Stat strip.
 */
export function LiveNumbers({ analytics, loading }: LiveProps): ReactElement {
  const stats = [
    { label: 'Reports filed', value: metric(loading, analytics.total) },
    { label: 'Critical hazards open', value: metric(loading, analytics.criticalOpen) },
    { label: 'Being fixed now', value: metric(loading, analytics.inProgress) },
    { label: 'Resolution rate', value: metric(loading, `${String(analytics.resolutionRate)}%`) },
  ];
  return (
    <section className="stat-strip" aria-label="Live numbers" aria-busy={loading}>
      {stats.map((stat) => (
        <div key={stat.label} className="stat">
          <span className="stat-value">{stat.value}</span>
          <span className="stat-label">{stat.label}</span>
        </div>
      ))}
    </section>
  );
}

/**
 * The live Reported → In progress → Resolved pipeline.
 *
 * @param props - Analytics and loading flag.
 * @returns Pipeline section.
 */
export function LivePipeline({ analytics, loading }: LiveProps): ReactElement {
  const pipeline = [
    { key: 'reported', label: 'Reported', value: analytics.reported },
    { key: 'in_progress', label: 'In progress', value: analytics.inProgress },
    { key: 'resolved', label: 'Resolved', value: analytics.resolved },
  ];
  return (
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
  );
}

/**
 * Closing call to action.
 *
 * @returns CTA band.
 */
export function CtaBand(): ReactElement {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <h2 id="cta-title" className="section-title">
        Seen something broken today?
      </h2>
      <a className="btn btn-primary btn-lg" href={hrefFor('report')}>
        Report it now
        <Icon name="arrow" />
      </a>
    </section>
  );
}
