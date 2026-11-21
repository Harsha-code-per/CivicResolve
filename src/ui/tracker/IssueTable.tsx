import type { ReactElement } from 'react';
import { describeSla } from '../../domain/sla.js';
import type { CivicIssue } from '../../domain/types.js';
import { PRIORITY_LABELS, STATUS_LABELS } from '../labels.js';

export interface IssueTableProps {
  readonly issues: readonly CivicIssue[];
  readonly nowMs: number;
}

/**
 * Compact, screen-reader-friendly table alternative to the issue cards.
 *
 * @param props - Issues to list and the current time for SLA text.
 * @returns IssueTable element.
 */
export function IssueTable({ issues, nowMs }: IssueTableProps): ReactElement {
  return (
    // Focusable so keyboard users can scroll the table horizontally on small screens.
    <div className="table-scroll" role="region" aria-label="Civic issues table" tabIndex={0}>
      <table className="data-table">
        <caption className="sr-only">Civic issues with status and SLA</caption>
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
          {issues.map((issue) => (
            <tr key={issue.id}>
              <th scope="row">{issue.id}</th>
              <td>{issue.title}</td>
              <td>{issue.department}</td>
              <td>{PRIORITY_LABELS[issue.priority]}</td>
              <td>{STATUS_LABELS[issue.status]}</td>
              <td>{describeSla(issue, nowMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
