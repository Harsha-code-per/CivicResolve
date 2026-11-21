import { useState } from 'react';
import type { CreateIssueInput } from '../../domain/schemas.js';
import type { CivicIssue, IssueCategory, TriageResult } from '../../domain/types.js';
import { previewTriage, submitIssue } from '../../lib/api.js';
import { ACCEPTED_IMAGE_TYPES, downscaleImage } from '../../lib/image.js';

interface ReportDraft {
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly category: IssueCategory | '';
}

export interface ReportDraftState {
  readonly draft: ReportDraft;
  readonly imageDataUrl: string | undefined;
  readonly triage: TriageResult | null;
  readonly error: string | null;
  readonly successId: string | null;
  readonly busy: boolean;
  readonly update: (field: keyof ReportDraft, value: string) => void;
  readonly attachImage: (file: File | undefined) => Promise<void>;
  readonly preview: () => Promise<void>;
  readonly submit: () => Promise<void>;
}

const EMPTY_DRAFT: ReportDraft = { title: '', description: '', location: '', category: '' };

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * Holds the report form's draft, photo, triage preview and submission state.
 *
 * @param onCreated - Called with the stored issue after a successful submission.
 * @returns Draft state and the actions the form can take.
 */
export function useReportDraft(onCreated: (issue: CivicIssue) => void): ReportDraftState {
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const payload = (): CreateIssueInput => ({
    title: draft.title,
    description: draft.description,
    location: draft.location,
    ...(draft.category ? { category: draft.category } : {}),
    ...(imageDataUrl ? { imageDataUrl } : {}),
  });

  const run = async (task: () => Promise<void>, fallback: string): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await task();
    } catch (err) {
      setError(messageOf(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  return {
    draft,
    imageDataUrl,
    triage,
    error,
    successId,
    busy,
    update: (field: keyof ReportDraft, value: string) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    attachImage: (file: File | undefined) =>
      run(async () => {
        if (file && !(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
          throw new Error('Please upload a PNG, JPEG, or WebP photo.');
        }
        setImageDataUrl(file ? await downscaleImage(file) : undefined);
      }, 'Image upload failed.'),
    preview: () =>
      run(async () => {
        setTriage(await previewTriage(payload()));
      }, 'AI triage preview failed.'),
    submit: () =>
      run(async () => {
        setSuccessId(null);
        const created = await submitIssue(payload());
        setTriage(created.triage);
        setSuccessId(created.issue.id);
        setDraft(EMPTY_DRAFT);
        setImageDataUrl(undefined);
        onCreated(created.issue);
      }, 'Could not submit issue.'),
  };
}
