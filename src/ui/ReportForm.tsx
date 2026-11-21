import { useEffect, useRef, type ReactElement, type SyntheticEvent } from 'react';
import { CATEGORY_LABELS } from '../domain/departments.js';
import { FIELD_LIMITS } from '../domain/limits.js';
import { ISSUE_CATEGORIES, type CivicIssue } from '../domain/types.js';
import { ACCEPTED_IMAGE_TYPES } from '../lib/image.js';
import { useReportDraft } from './report/useReportDraft.js';
import { TriageInspector } from './TriageInspector.js';

export interface ReportFormProps {
  readonly onCreated: (issue: CivicIssue) => void;
}

/**
 * Citizen issue reporting form with a live Gemini triage preview beside it.
 *
 * @param props - Callback invoked when a new issue is stored.
 * @returns ReportForm element.
 */
export function ReportForm({ onCreated }: ReportFormProps): ReactElement {
  const form = useReportDraft(onCreated);
  const { draft } = form;
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (form.error) errorRef.current?.focus();
  }, [form.error]);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void form.submit();
  };

  return (
    <section aria-labelledby="report-heading" className="section-grid">
      <form className="panel" onSubmit={handleSubmit} noValidate aria-busy={form.busy}>
        <h2 id="report-heading">Report a Civic Issue</h2>
        <p className="muted">
          Describe the problem in your own words. Gemini picks the category, priority and
          department; you can review its triage before submitting.
        </p>
        {form.error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="alert">
            {form.error}
          </div>
        )}
        {form.successId && (
          <div role="status" className="alert alert-success">
            Complaint {form.successId} submitted and routed. Track it under Track Issues.
          </div>
        )}
        <div className="field">
          <label htmlFor="issue-title">Issue Title</label>
          <input
            id="issue-title"
            required
            minLength={FIELD_LIMITS.title.min}
            maxLength={FIELD_LIMITS.title.max}
            value={draft.title}
            onChange={(e) => {
              form.update('title', e.target.value);
            }}
            placeholder="e.g., Deep pothole outside Gandhipuram bus bay"
          />
        </div>
        <div className="field">
          <label htmlFor="issue-location">Location / Landmark</label>
          <input
            id="issue-location"
            required
            autoComplete="street-address"
            minLength={FIELD_LIMITS.location.min}
            maxLength={FIELD_LIMITS.location.max}
            value={draft.location}
            onChange={(e) => {
              form.update('location', e.target.value);
            }}
            placeholder="e.g., Avinashi Road, Neelambur, Coimbatore"
          />
        </div>
        <div className="field">
          <label htmlFor="issue-category">Category (optional, AI auto-classifies)</label>
          <select
            id="issue-category"
            value={draft.category}
            onChange={(e) => {
              form.update('category', e.target.value);
            }}
          >
            <option value="">Let Gemini detect it</option>
            {ISSUE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="issue-description">Detailed Description</label>
          <textarea
            id="issue-description"
            rows={4}
            required
            minLength={FIELD_LIMITS.description.min}
            maxLength={FIELD_LIMITS.description.max}
            aria-describedby="issue-description-hint"
            value={draft.description}
            onChange={(e) => {
              form.update('description', e.target.value);
            }}
            placeholder="What is wrong, since when, and who is affected?"
          />
          <span id="issue-description-hint" className="hint">
            At least {FIELD_LIMITS.description.min} characters. Mention hazards such as exposed
            wires or flooding so urgent issues are prioritised.
          </span>
        </div>
        <div className="field">
          <label htmlFor="issue-photo">Photo evidence (optional PNG, JPEG or WebP)</label>
          <input
            key={form.successId ?? 'draft'}
            id="issue-photo"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={(e) => void form.attachImage(e.target.files?.[0])}
          />
          {form.imageDataUrl && (
            <img src={form.imageDataUrl} alt="Selected evidence preview" className="issue-thumb" />
          )}
        </div>
        <div className="cta-row">
          <button
            type="button"
            className="btn"
            disabled={form.busy}
            onClick={() => void form.preview()}
          >
            Preview AI Triage
          </button>
          <button type="submit" className="btn btn-primary" disabled={form.busy}>
            {form.busy ? 'Analyzing…' : 'Submit Grievance'}
          </button>
        </div>
      </form>
      <TriageInspector triage={form.triage} />
    </section>
  );
}
