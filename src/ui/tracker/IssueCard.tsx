import type { ReactElement } from 'react';
import { CATEGORY_LABELS } from '../../domain/departments.js';
import { computeSlaState, describeSla } from '../../domain/sla.js';
import type { CivicIssue } from '../../domain/types.js';
import { PRIORITY_LABELS, STATUS_LABELS } from '../labels.js';

export interface IssueCardProps {
  readonly issue: CivicIssue;
  readonly nowMs: number;
}

/**
 * One grievance with its triage, SLA countdown, photo and full status history.
 *
 * @param props - Issue and the current time for the SLA countdown.
 * @returns IssueCard element.
 */
export function IssueCard({ issue, nowMs }: IssueCardProps): ReactElement {
  const breached = computeSlaState(issue, nowMs).breached;
  return (
    <article className="issue-card" aria-labelledby={`issue-${issue.id}`}>
      <div className="issue-header">
        <div>
          <span className="issue-id">{issue.id}</span>
          <h3 id={`issue-${issue.id}`}>{issue.title}</h3>
          <p>{issue.location}</p>
        </div>
        <div className="badge-row">
          <span className={`badge badge-${issue.priority}`}>
            {PRIORITY_LABELS[issue.priority]} priority
          </span>
          <span className={`badge badge-${issue.status}`}>{STATUS_LABELS[issue.status]}</span>
          <span className={`badge ${breached ? 'badge-critical' : 'badge-neutral'}`}>
            {describeSla(issue, nowMs)}
          </span>
        </div>
      </div>
      <p>{issue.aiSummary}</p>
      <p className="issue-meta">
        {CATEGORY_LABELS[issue.category]} · {issue.department} · SLA {issue.slaHours}h · Urgency{' '}
        {issue.urgencyScore}/100 · Triaged by {issue.triageSource === 'gemini' ? 'Gemini' : 'rules'}
      </p>
      {issue.hasImage && (
        <img
          src={`/api/issues/${issue.id}/image`}
          alt={`Citizen evidence: ${issue.title}`}
          className="issue-thumb"
          loading="lazy"
          decoding="async"
        />
      )}
      <ol className="timeline" aria-label={`Status history for ${issue.id}`}>
        {issue.timeline.map((event) => (
          <li key={`${event.timestamp}-${event.status}-${event.note}`}>
            <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time>{' '}
            <strong>{STATUS_LABELS[event.status]}</strong> ({event.actor}): {event.note}
          </li>
        ))}
      </ol>
    </article>
  );
}
