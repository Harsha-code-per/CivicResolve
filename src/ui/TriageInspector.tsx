import type { ReactElement } from 'react';
import { CATEGORY_LABELS } from '../domain/departments.js';
import type { TriageResult } from '../domain/types.js';

export interface TriageInspectorProps {
  readonly triage: TriageResult | null;
}

/**
 * Displays live Gemini AI triage classification, urgency score, SLA, and department routing.
 *
 * @param props - Current TriageResult or null when awaiting preview.
 * @returns TriageInspector aside element.
 */
export function TriageInspector({ triage }: TriageInspectorProps): ReactElement {
  return (
    <aside className="panel" aria-live="polite" aria-labelledby="triage-heading">
      <h2 id="triage-heading">Gemini AI Triage Inspector</h2>
      {triage ? (
        <div>
          <div className="badge-row">
            <span className={`badge badge-${triage.priority}`}>Priority: {triage.priority}</span>
            <span className="badge badge-reported">Urgency {triage.urgencyScore}/100</span>
            <span className="badge badge-low">SLA {triage.slaHours}h</span>
          </div>
          <p>
            <strong>Category:</strong> {CATEGORY_LABELS[triage.category]}
          </p>
          <p>
            <strong>Recommended Department:</strong> {triage.department}
          </p>
          <p>
            <strong>Summary:</strong> {triage.summary}
          </p>
          <p>
            <strong>Rationale:</strong> {triage.rationale}
          </p>
          <p className="issue-id">
            Engine: {triage.source}
            {triage.model ? ` (${triage.model})` : ''}
          </p>
        </div>
      ) : (
        <p>
          Fill out the report and select <strong>Preview AI Triage</strong> to inspect Gemini
          category detection, urgency scoring, and department recommendation before submitting.
        </p>
      )}
    </aside>
  );
}
