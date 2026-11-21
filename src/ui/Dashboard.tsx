import type { ReactElement } from 'react';
import { hrefFor } from '../app/routes.js';
import { describeSla } from '../domain/sla.js';
import type { CivicIssue, IssueAnalytics } from '../domain/types.js';
import { Icon } from './Icon.js';
import { PRIORITY_LABELS, STATUS_LABELS } from './labels.js';
import { ResolutionProgress } from './ResolutionProgress.js';

export interface DashboardProps {
  readonly issues: readonly CivicIssue[];
  readonly analytics: IssueAnalytics;
  readonly nowMs: number;
  readonly loading: boolean;
}

const RECENT_COUNT = 5;

/**
 * Console overview: headline numbers, resolution progress and the latest reports.
 *
 * @param props - Issues, analytics, current time and loading flag.
 * @returns Dashboard page.
 */
export function Dashboard({ issues, analytics, nowMs, loading }: DashboardProps): ReactElement {
  const kpis = [
    { label: 'Total reports', value: analytics.total },
    { label: 'Critical open', value: analytics.criticalOpen },
    { label: 'In progress', value: analytics.inProgress },
    { label: 'Resolution rate', value: `${String(analytics.resolutionRate)}%` },
  ];
  return (
    <section aria-labelledby="dash-title" className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Overview</p>
          <h1 id="dash-title" className="page-title">
            City resolution overview
          </h1>
        </div>
      </header>
      <div className="kpi-grid" aria-busy={loading}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className="kpi">
            <h2 className="kpi-label">{kpi.label}</h2>
            <p className="kpi-value">{loading ? '…' : kpi.value}</p>
          </article>
        ))}
      </div>
      <div className="dash-grid">
        <ResolutionProgress analytics={analytics} />
        <section className="card" aria-labelledby="recent-title">
          <div className="card-head">
            <h2 id="recent-title">Latest reports</h2>
            <a className="link" href={hrefFor('track')}>
              View all
              <Icon name="arrow" />
            </a>
          </div>
          <ul className="recent">
            {issues.slice(0, RECENT_COUNT).map((issue) => (
              <li key={issue.id}>
                <span className={`dot dot-${issue.status}`} aria-hidden="true" />
                <span className="recent-main">
                  <strong>{issue.title}</strong>
                  <small>
                    {issue.id} · {STATUS_LABELS[issue.status]} · {describeSla(issue, nowMs)}
                  </small>
                </span>
                <span className={`chip chip-${issue.priority}`}>
                  {PRIORITY_LABELS[issue.priority]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
