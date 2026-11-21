import type { ReactElement } from 'react';
import type { IssueAnalytics } from '../domain/types.js';

export interface ResolutionProgressProps {
  readonly analytics: IssueAnalytics;
}

/**
 * Visualises progress toward resolution: the status pipeline, SLA health and each
 * department's open versus resolved workload. Native progress elements keep it
 * accessible and free of chart libraries.
 *
 * @param props - Aggregated analytics.
 * @returns ResolutionProgress element.
 */
export function ResolutionProgress({ analytics }: ResolutionProgressProps): ReactElement {
  const total = Math.max(analytics.total, 1);
  const pipeline = [
    { label: 'Reported', value: analytics.reported },
    { label: 'In Progress', value: analytics.inProgress },
    { label: 'Resolved', value: analytics.resolved },
  ];
  const median = analytics.medianResolutionHours;

  return (
    <section className="panel progress-panel" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Progress toward resolution</h2>
      <dl className="stat-row">
        <div>
          <dt>Resolved</dt>
          <dd>{analytics.resolutionRate}%</dd>
        </div>
        <div>
          <dt>Open past SLA</dt>
          <dd>{analytics.overdueOpen}</dd>
        </div>
        <div>
          <dt>Median time to resolve</dt>
          <dd>{median === null ? 'No data yet' : `${String(median)}h`}</dd>
        </div>
      </dl>
      <h3>Status pipeline</h3>
      <ul className="bar-list">
        {pipeline.map((stage) => (
          <li key={stage.label}>
            <span>
              {stage.label}: {stage.value}
            </span>
            <progress max={total} value={stage.value} aria-label={`${stage.label} issues`}>
              {stage.value}
            </progress>
          </li>
        ))}
      </ul>
      <h3>Department workload</h3>
      <ul className="bar-list">
        {analytics.departmentProgress.map((row) => {
          const owned = row.open + row.resolved;
          return (
            <li key={row.department}>
              <span>
                {row.department}: {row.resolved} of {owned} resolved
              </span>
              <progress
                max={Math.max(owned, 1)}
                value={row.resolved}
                aria-label={`${row.department} resolved share`}
              >
                {row.resolved}
              </progress>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
