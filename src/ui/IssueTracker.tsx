import { useMemo, useState, type ReactElement } from 'react';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MUNICIPAL_DEPARTMENTS,
  type CivicIssue,
  type IssueAnalytics,
  type IssueFilters,
} from '../domain/types.js';
import { filterAndSortIssues } from '../domain/workflow.js';
import { asIs, PRIORITY_LABELS, STATUS_LABELS } from './labels.js';
import { ResolutionProgress } from './ResolutionProgress.js';
import { SelectField, toOptions, type SelectOption } from './SelectField.js';
import { IssueCard } from './tracker/IssueCard.js';
import { IssueTable } from './tracker/IssueTable.js';

export interface IssueTrackerProps {
  readonly issues: readonly CivicIssue[];
  readonly analytics: IssueAnalytics;
  readonly nowMs: number;
}

type Facet<T extends string> = T | 'all';
type Filters = Required<IssueFilters>;

const NO_FILTERS: Filters = { query: '', status: 'all', priority: 'all', department: 'all' };

/**
 * Prepends an "All …" option to a facet's options.
 *
 * @param allLabel - Label for the unfiltered choice.
 * @param options - Facet options.
 * @returns Options including "all".
 */
function withAll<T extends string>(
  allLabel: string,
  options: SelectOption<T>[],
): SelectOption<Facet<T>>[] {
  return [{ value: 'all', label: allLabel }, ...options];
}

const STATUS_OPTIONS = withAll(
  'All statuses',
  toOptions(ISSUE_STATUSES, (status) => STATUS_LABELS[status]),
);
const PRIORITY_OPTIONS = withAll(
  'All priorities',
  toOptions(ISSUE_PRIORITIES, (priority) => PRIORITY_LABELS[priority]),
);
const DEPARTMENT_OPTIONS = withAll('All departments', toOptions(MUNICIPAL_DEPARTMENTS, asIs));

/**
 * Free-text search plus status, priority and department facets.
 *
 * @param props - Current filters and change callback.
 * @returns Search region.
 */
function TrackerFilters({
  filters,
  onChange,
}: {
  readonly filters: Filters;
  readonly onChange: (filters: Filters) => void;
}): ReactElement {
  const set = (patch: Partial<Filters>): void => {
    onChange({ ...filters, ...patch });
  };
  return (
    <div className="card filters-bar" role="search" aria-label="Filter civic issues">
      <div className="field">
        <label htmlFor="filter-query">Search ID, title, or location</label>
        <input
          id="filter-query"
          value={filters.query}
          onChange={(e) => {
            set({ query: e.target.value });
          }}
          placeholder="e.g., pothole, CR-2026-1001"
        />
      </div>
      <SelectField
        id="filter-status"
        label="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(status) => {
          set({ status });
        }}
      />
      <SelectField
        id="filter-priority"
        label="Priority"
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(priority) => {
          set({ priority });
        }}
      />
      <SelectField
        id="filter-dept"
        label="Department"
        value={filters.department}
        options={DEPARTMENT_OPTIONS}
        onChange={(department) => {
          set({ department });
        }}
      />
    </div>
  );
}

/**
 * Public tracker: search and facet filters, resolution progress, and cards or a table.
 *
 * @param props - Civic issues, aggregated analytics and the current time.
 * @returns IssueTracker element.
 */
export function IssueTracker({ issues, analytics, nowMs }: IssueTrackerProps): ReactElement {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showTable, setShowTable] = useState(false);

  const visibleIssues = useMemo(() => filterAndSortIssues(issues, filters), [issues, filters]);

  return (
    <section aria-labelledby="tracker-heading" className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Public record</p>
          <h1 id="tracker-heading" className="page-title">
            Live issue tracker
          </h1>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          aria-pressed={showTable}
          onClick={() => {
            setShowTable((prev) => !prev);
          }}
        >
          {showTable ? 'Show as cards' : 'Show as table'}
        </button>
      </header>

      <TrackerFilters filters={filters} onChange={setFilters} />

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
