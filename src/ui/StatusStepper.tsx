import type { ReactElement } from 'react';
import { ISSUE_STATUSES, type IssueStatus } from '../domain/types.js';
import { STATUS_LABELS } from './labels.js';

/**
 * Three-step progress indicator: Reported → In Progress → Resolved.
 *
 * @param props - Current status.
 * @returns Ordered list with the current step marked.
 */
export function StatusStepper({ status }: { readonly status: IssueStatus }): ReactElement {
  const current = ISSUE_STATUSES.indexOf(status);
  return (
    <ol className="stepper" aria-label="Progress toward resolution">
      {ISSUE_STATUSES.map((step, index) => (
        <li
          key={step}
          className={index <= current ? 'step-done' : 'step-todo'}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="step-dot" aria-hidden="true" />
          {STATUS_LABELS[step]}
        </li>
      ))}
    </ol>
  );
}
