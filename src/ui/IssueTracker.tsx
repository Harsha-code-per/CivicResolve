import { useMemo, useState, type ReactElement } from 'react';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MUNICIPAL_DEPARTMENTS,
  type CivicIssue,
  type IssueAnalytics,
  type IssuePriority,
  type IssueStatus,
  type MunicipalDepartment,
} from '../domain/types.js';
import { filterAndSortIssues } from '../domain/workflow.js';
import { PRIORITY_LABELS, STATUS_LABELS } from './labels.js';
import { ResolutionProgress } from './ResolutionProgress.js';
import { IssueCard } from './tracker/IssueCard.js';
import { IssueTable } from './tracker/IssueTable.js';

export interface IssueTrackerProps {
  readonly issues: readonly CivicIssue[];
  readonly analytics: IssueAnalytics;
  readonly nowMs: number;
}

/**
 * Renders the public Issue Tracking Dashboard with search, filters, status timelines, and table view.
 *
 * @param props - Civic issues, aggregated analytics and the current time.
 * @returns IssueTracker element.
 */
export function IssueTracker({ issues, analytics, nowMs }: IssueTrackerProps): ReactElement {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<IssueStatus | 'all'>('all');
  const [priority, setPriority] = useState<IssuePriority | 'all'>('all');
  const [department, setDepartment] = useState<MunicipalDepartment | 'all'>('all');
  const [showTable, setShowTable] = useState(false);

  const visibleIssues = useMemo(
    () => filterAndSortIssues(issues, { query, status, priority, department }),
    [issues, query, status, priority, department],
  );

  return (
    <section aria-labelledby="tracker-heading">
      <div className="issue-header">
        <h2 id="tracker-heading">Public Issue Tracking Dashboard</h2>
        <button
          type="button"
          className="btn"
          aria-pressed={showTable}
          onClick={() => {
            setShowTable((prev) => !prev);
          }}
        >
          {showTable ? 'Switch to Card View' : 'Switch to Accessible Table'}
        </button>
      </div>

      <div className="filters-bar" role="search" aria-label="Filter civic issues">
        <div className="field">
          <label htmlFor="filter-query">Search ID, title, or location</label>
          <input
            id="filter-query"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="e.g., pothole, CR-2026-1001"
          />
        </div>
        <div className="field">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as IssueStatus | 'all');
            }}
          >
            <option value="all">All statuses</option>
            {ISSUE_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as IssuePriority | 'all');
            }}
          >
            <option value="all">All priorities</option>
            {ISSUE_PRIORITIES.map((prio) => (
              <option key={prio} value={prio}>
                {PRIORITY_LABELS[prio]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-dept">Department</label>
          <select
            id="filter-dept"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value as MunicipalDepartment | 'all');
            }}
          >
            <option value="all">All departments</option>
            {MUNICIPAL_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ResolutionProgress analytics={analytics} />

      <p aria-live="polite" className="issue-meta">
        Showing {visibleIssues.length} of {analytics.total} grievances ({analytics.resolved}{' '}
        resolved).
      </p>

      {showTable ? (
        <IssueTable issues={visibleIssues} nowMs={nowMs} />
      ) : (
        <div className="issue-list">
          {visibleIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} nowMs={nowMs} />
          ))}
        </div>
      )}
    </section>
  );
}
