import { useMemo, useState, type ReactElement } from 'react';
import { CATEGORY_LABELS } from '../domain/departments.js';
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

export interface IssueTrackerProps {
  readonly issues: readonly CivicIssue[];
  readonly analytics: IssueAnalytics;
}

const STATUS_LABELS: Readonly<Record<IssueStatus, string>> = {
  reported: 'Reported',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

/**
 * Renders the public Issue Tracking Dashboard with search, filters, status timelines, and table view.
 *
 * @param props - Current civic issues list and aggregated analytics.
 * @returns IssueTracker element.
 */
export function IssueTracker({ issues, analytics }: IssueTrackerProps): ReactElement {
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
                {prio.toUpperCase()}
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

      <p aria-live="polite" className="issue-id">
        Showing {visibleIssues.length} of {analytics.total} grievances ({analytics.resolved}{' '}
        resolved).
      </p>

      {showTable ? (
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Department</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">SLA</th>
              </tr>
            </thead>
            <tbody>
              {visibleIssues.map((issue) => (
                <tr key={issue.id}>
                  <td>{issue.id}</td>
                  <td>{issue.title}</td>
                  <td>{issue.department}</td>
                  <td>{issue.priority.toUpperCase()}</td>
                  <td>{STATUS_LABELS[issue.status]}</td>
                  <td>{issue.slaHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="issue-list">
          {visibleIssues.map((issue) => (
            <article key={issue.id} className="issue-card">
              <div className="issue-header">
                <div>
                  <span className="issue-id">{issue.id}</span>
                  <h3>{issue.title}</h3>
                  <p>{issue.location}</p>
                </div>
                <div className="badge-row">
                  <span className={`badge badge-${issue.priority}`}>{issue.priority}</span>
                  <span className={`badge badge-${issue.status}`}>
                    {STATUS_LABELS[issue.status]}
                  </span>
                  <span className="badge badge-low">{CATEGORY_LABELS[issue.category]}</span>
                </div>
              </div>
              <p>{issue.aiSummary}</p>
              <p className="issue-id">
                Department: {issue.department} · SLA: {issue.slaHours}h · Urgency:{' '}
                {issue.urgencyScore}/100
              </p>
              {issue.imageDataUrl && (
                <img
                  src={issue.imageDataUrl}
                  alt={`Citizen evidence for ${issue.title}`}
                  className="issue-thumb"
                />
              )}
              <ol className="timeline" aria-label={`Status history for ${issue.id}`}>
                {issue.timeline.map((event) => (
                  <li key={`${event.timestamp}-${event.status}`}>
                    <strong>{STATUS_LABELS[event.status]}</strong> ({event.actor}): {event.note}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
