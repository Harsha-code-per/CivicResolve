import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { CATEGORY_LABELS } from '../domain/departments.js';
import {
  ISSUE_CATEGORIES,
  type CivicIssue,
  type IssueCategory,
  type TriageResult,
} from '../domain/types.js';
import { previewTriage, submitIssue } from '../lib/api.js';
import { TriageInspector } from './TriageInspector.js';

export interface ReportFormProps {
  readonly onCreated: (issue: CivicIssue) => void;
}

/**
 * Reads a user-selected image file into a base64 data URL.
 *
 * @param file - Selected File object.
 * @returns Promise resolving to a data URL string.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('Could not read the selected image file.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Renders the accessible Citizen Issue Reporting workspace with live Gemini AI triage preview.
 *
 * @param props - Callback invoked when a new issue is persisted.
 * @returns ReportForm element.
 */
export function ReportForm({ onCreated }: ReportFormProps): ReactElement {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<IssueCategory | ''>('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const reportError = (message: string): void => {
    setError(message);
    queueMicrotask(() => errorRef.current?.focus());
  };

  const payload = () => ({
    title,
    description,
    location,
    ...(category ? { category } : {}),
    ...(imageDataUrl ? { imageDataUrl } : {}),
  });

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageDataUrl(undefined);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reportError('Please upload a PNG, JPEG, or WebP photo.');
      return;
    }
    try {
      setError(null);
      setImageDataUrl(await readFileAsDataUrl(file));
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Image upload failed.');
    }
  };

  const handlePreview = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      setTriage(await previewTriage(payload()));
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'AI triage preview failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccessId(null);
    setBusy(true);
    try {
      const created = await submitIssue(payload());
      setTriage(created.triage);
      setSuccessId(created.issue.id);
      setTitle('');
      setDescription('');
      setLocation('');
      setCategory('');
      setImageDataUrl(undefined);
      onCreated(created.issue);
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Could not submit issue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="report-heading" className="section-grid">
      <form className="panel" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <h2 id="report-heading">Report a Civic Issue</h2>
        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="alert">
            {error}
          </div>
        )}
        {successId && (
          <div role="status" aria-live="polite" className="alert alert-success">
            Complaint {successId} submitted and routed automatically.
          </div>
        )}
        <div className="field">
          <label htmlFor="issue-title">Issue Title</label>
          <input
            id="issue-title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            placeholder="e.g., Deep pothole outside Gandhipuram bus bay"
          />
        </div>
        <div className="field">
          <label htmlFor="issue-location">Location / Landmark</label>
          <input
            id="issue-location"
            required
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
            }}
            placeholder="e.g., Avinashi Road, Neelambur, Coimbatore"
          />
        </div>
        <div className="field">
          <label htmlFor="issue-category">Category (Optional — AI auto-classifies)</label>
          <select
            id="issue-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as IssueCategory | '');
            }}
          >
            <option value="">Let Gemini AI detect automatically</option>
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
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            placeholder="Describe the hazard, duration, and impact on commuters or residents..."
          />
        </div>
        <div className="field">
          <label htmlFor="issue-photo">Photo Evidence (Optional PNG/JPEG/WebP)</label>
          <input
            id="issue-photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void handleImageChange(e)}
          />
        </div>
        <div className="cta-row">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void handlePreview()}
          >
            Preview AI Triage
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Analyzing...' : 'Submit Grievance'}
          </button>
        </div>
      </form>
      <TriageInspector triage={triage} />
    </section>
  );
}
