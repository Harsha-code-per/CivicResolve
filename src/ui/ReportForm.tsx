import { useEffect, useRef, type ReactElement, type SyntheticEvent } from 'react';
import { CATEGORY_LABELS } from '../domain/departments.js';
import { FIELD_LIMITS } from '../domain/limits.js';
import { ISSUE_CATEGORIES, type CivicIssue } from '../domain/types.js';
import { ACCEPTED_IMAGE_TYPES } from '../lib/image.js';
import { useAuth } from '../auth/AuthProvider.js';
import { Icon } from './Icon.js';
import { useReportDraft } from './report/useReportDraft.js';
import { SignInCard } from './SignInCard.js';
import { TriageInspector } from './TriageInspector.js';

/**
 * Optional photo picker styled as a drop zone, with a preview of the downscaled image.
 *
 * @param props - Reset key, current image and file callback.
 * @returns Photo field.
 */
function PhotoField({
  resetKey,
  imageDataUrl,
  onFile,
}: {
  readonly resetKey: string;
  readonly imageDataUrl: string | undefined;
  readonly onFile: (file: File | undefined) => void;
}): ReactElement {
  return (
    <div className="field">
      <label htmlFor="issue-photo" className="drop">
        <Icon name="camera" />
        <span>
          <strong>Add a photo</strong> (optional PNG, JPEG or WebP)
        </span>
      </label>
      <input
        className="file-input"
        key={resetKey}
        id="issue-photo"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
        }}
      />
      {imageDataUrl && (
        <img src={imageDataUrl} alt="Selected evidence preview" className="issue-thumb" />
      )}
    </div>
  );
}

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
  const auth = useAuth();
  const form = useReportDraft(onCreated, auth.getIdToken);
  const needsSignIn = auth.status === 'ready' && !auth.user;
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
    <section aria-labelledby="report-heading" className="page">
      <header className="page-head">
        <div>
          <p className="kicker">New report</p>
          <h1 id="report-heading" className="page-title">
            Report a civic issue
          </h1>
          <p className="muted page-lead">
            Describe the problem in your own words. Gemini picks the category, priority and
            department, and you can check its triage before you file.
          </p>
        </div>
      </header>
      <div className="report-grid">
        <form className="card form-card" onSubmit={handleSubmit} noValidate aria-busy={form.busy}>
          {form.error && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="alert">
              {form.error}
            </div>
          )}
          {form.successId && (
            <div role="status" className="alert alert-success">
              Complaint {form.successId} submitted and routed. Follow it under My reports.
            </div>
          )}
          <div className="field">
            <label htmlFor="issue-title">Issue title</label>
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
            <label htmlFor="issue-location">Location or landmark</label>
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
            <label htmlFor="issue-category">Category (optional, Gemini detects it)</label>
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
            <label htmlFor="issue-description">What is wrong?</label>
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
          <PhotoField
            resetKey={form.successId ?? 'draft'}
            imageDataUrl={form.imageDataUrl}
            onFile={(file) => void form.attachImage(file)}
          />
          <div className="cta-row form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={form.busy}
              onClick={() => void form.preview()}
            >
              <Icon name="spark" />
              Preview AI triage
            </button>
            {!needsSignIn && (
              <button type="submit" className="btn btn-primary" disabled={form.busy}>
                {form.busy ? 'Analyzing…' : 'Submit report'}
              </button>
            )}
          </div>
          {needsSignIn && (
            <SignInCard reason="Filing a report links it to your account so you can follow it in My reports. Guest accounts take one click." />
          )}
        </form>
        <TriageInspector triage={form.triage} />
      </div>
    </section>
  );
}
