import { useEffect, useRef, type ReactElement, type SyntheticEvent } from 'react';
import { useAuth } from '../auth/AuthProvider.js';
import type { CivicIssue } from '../domain/types.js';
import { Icon } from './Icon.js';
import { PhotoField, ReportFields, ReportHeader } from './report/ReportFields.js';
import { useReportDraft } from './report/useReportDraft.js';
import { SignInCard } from './SignInCard.js';
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
      <ReportHeader />
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
          <ReportFields draft={draft} update={form.update} />
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
