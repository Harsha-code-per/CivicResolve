import type { ReactElement } from 'react';
import { CATEGORY_LABELS } from '../domain/departments.js';
import type { TriageResult } from '../domain/types.js';
import { Icon } from './Icon.js';

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
    <aside className="card triage-card" aria-live="polite" aria-labelledby="triage-heading">
      <h2 id="triage-heading" className="triage-title">
        <Icon name="spark" />
        Gemini triage
      </h2>
      {triage ? (
        <div>
          <div className="badge-row">
            <span className={`chip chip-${triage.priority}`}>Priority: {triage.priority}</span>
            <span className="chip chip-neutral">Urgency {triage.urgencyScore}/100</span>
            <span className="chip chip-neutral">SLA {triage.slaHours}h</span>
          </div>
          <meter
            className="urgency"
            min={0}
            max={100}
            low={35}
            high={80}
            optimum={0}
            value={triage.urgencyScore}
            aria-label="Urgency score"
          >
            {triage.urgencyScore}
          </meter>
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
          Fill in the report and choose <strong>Preview AI triage</strong> to see the category,
          urgency and department Gemini picks before you file.
        </p>
      )}
    </aside>
  );
}
