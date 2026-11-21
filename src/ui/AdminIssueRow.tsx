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
import { asIs, PRIORITY_LABELS, STATUS_LABELS } from './labels.js';
import { SelectField, toOptions } from './SelectField.js';

export interface AdminIssueRowProps {
  readonly issue: CivicIssue;
  readonly onUpdated: (issue: CivicIssue) => void;
  readonly onError: (msg: string) => void;
}

const STATUS_OPTIONS = toOptions(ISSUE_STATUSES, (status) => STATUS_LABELS[status]);
const PRIORITY_OPTIONS = toOptions(ISSUE_PRIORITIES, (priority) => PRIORITY_LABELS[priority]);
const DEPARTMENT_OPTIONS = toOptions(MUNICIPAL_DEPARTMENTS, asIs);

/**
 * The issue's reference, title, location and current priority.
 *
 * @param props - Issue record.
 * @returns Header element.
 */
function RowHeader({ issue }: { readonly issue: CivicIssue }): ReactElement {
  return (
    <div className="issue-header">
      <div>
        <span className="issue-id">{issue.id}</span>
        <h3>{issue.title}</h3>
        <p>{issue.location}</p>
      </div>
      <span className={`chip chip-${issue.priority}`}>{PRIORITY_LABELS[issue.priority]}</span>
    </div>
  );
}

/**
 * The required audit note recorded with every admin change.
 *
 * @param props - Input id, current text and change callback.
 * @returns Field element.
 */
function AuditNote({
  id,
  value,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="field">
      <label htmlFor={id}>Audit note (required)</label>
      <input
        id={id}
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder="e.g., Crew dispatched to repair site"
      />
    </div>
  );
}

/**
 * One editable issue in the admin queue: status, priority, department and a required
 * audit note.
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
      <RowHeader issue={issue} />

      <div className="admin-fields">
        <SelectField
          id={`status-${issue.id}`}
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
        <SelectField
          id={`priority-${issue.id}`}
          label="Priority"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={setPriority}
        />
        <SelectField
          id={`dept-${issue.id}`}
          label="Department"
          value={department}
          options={DEPARTMENT_OPTIONS}
          onChange={setDepartment}
        />
      </div>

      <AuditNote id={`note-${issue.id}`} value={note} onChange={setNote} />

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : `Save update for ${issue.id}`}
      </button>
    </form>
  );
}
