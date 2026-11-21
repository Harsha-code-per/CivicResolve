import { useState, type ReactElement, type SyntheticEvent } from 'react';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MUNICIPAL_DEPARTMENTS,
  type CivicIssue,
  type IssuePriority,
  type IssueStatus,
  type MunicipalDepartment,
} from '../domain/types.js';
import { updateIssueAsAdmin } from '../lib/api.js';
import { PRIORITY_LABELS, STATUS_LABELS } from './labels.js';

export interface AdminIssueRowProps {
  readonly issue: CivicIssue;
  readonly onUpdated: (issue: CivicIssue) => void;
  readonly onError: (msg: string) => void;
}

/**
 * Renders an individual editable grievance card inside the Admin Command Center.
 *
 * @param props - Issue record and update/error callbacks.
 * @returns AdminIssueRow element.
 */
export function AdminIssueRow({ issue, onUpdated, onError }: AdminIssueRowProps): ReactElement {
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [priority, setPriority] = useState<IssuePriority>(issue.priority);
  const [department, setDepartment] = useState<MunicipalDepartment>(issue.department);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await updateIssueAsAdmin(issue.id, { status, priority, department, note });
      setNote('');
      onUpdated(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update issue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card issue-card" onSubmit={(e) => void handleSave(e)}>
      <div className="issue-header">
        <div>
          <span className="issue-id">{issue.id}</span>
          <h3>{issue.title}</h3>
          <p>{issue.location}</p>
        </div>
        <span className={`chip chip-${issue.priority}`}>{PRIORITY_LABELS[issue.priority]}</span>
      </div>

      <div className="admin-fields">
        <div className="field">
          <label htmlFor={`status-${issue.id}`}>Status</label>
          <select
            id={`status-${issue.id}`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as IssueStatus);
            }}
          >
            {ISSUE_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`priority-${issue.id}`}>Priority</label>
          <select
            id={`priority-${issue.id}`}
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as IssuePriority);
            }}
          >
            {ISSUE_PRIORITIES.map((prio) => (
              <option key={prio} value={prio}>
                {PRIORITY_LABELS[prio]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`dept-${issue.id}`}>Department</label>
          <select
            id={`dept-${issue.id}`}
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value as MunicipalDepartment);
            }}
          >
            {MUNICIPAL_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`note-${issue.id}`}>Audit note (required)</label>
        <input
          id={`note-${issue.id}`}
          required
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
          placeholder="e.g., Crew dispatched to repair site"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : `Save update for ${issue.id}`}
      </button>
    </form>
  );
}
