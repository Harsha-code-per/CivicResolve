import type { ReactElement } from 'react';
import { CATEGORY_LABELS } from '../../domain/departments.js';
import { FIELD_LIMITS } from '../../domain/limits.js';
import { ISSUE_CATEGORIES, type IssueCategory } from '../../domain/types.js';
import { ACCEPTED_IMAGE_TYPES } from '../../lib/image.js';
import { Icon } from '../Icon.js';
import { SelectField, toOptions, type SelectOption } from '../SelectField.js';
import type { ReportDraftState } from './useReportDraft.js';

/**
 * Optional photo picker styled as a drop zone, with a preview of the downscaled image.
 *
 * @param props - Reset key, current image and file callback.
 * @returns Photo field.
 */
export function PhotoField({
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

const CATEGORY_OPTIONS: SelectOption<IssueCategory | ''>[] = [
  { value: '', label: 'Let Gemini detect it' },
  ...toOptions(ISSUE_CATEGORIES, (category) => CATEGORY_LABELS[category]),
];

/**
 * Page heading and a one-line explanation of what Gemini does with the report.
 *
 * @returns Header element.
 */
export function ReportHeader(): ReactElement {
  return (
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
  );
}

/**
 * The free-text description, with a hint about mentioning hazards.
 *
 * @param props - Current text and change callback.
 * @returns Field element.
 */
function DescriptionField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="field">
      <label htmlFor="issue-description">What is wrong?</label>
      <textarea
        id="issue-description"
        rows={4}
        required
        minLength={FIELD_LIMITS.description.min}
        maxLength={FIELD_LIMITS.description.max}
        aria-describedby="issue-description-hint"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder="What is wrong, since when, and who is affected?"
      />
      <span id="issue-description-hint" className="hint">
        At least {FIELD_LIMITS.description.min} characters. Mention hazards such as exposed wires or
        flooding so urgent issues are prioritised.
      </span>
    </div>
  );
}

/**
 * Title, location, optional category and description inputs.
 *
 * @param props - Current draft and field updater.
 * @returns Fields fragment.
 */
export function ReportFields({
  draft,
  update,
}: Pick<ReportDraftState, 'draft' | 'update'>): ReactElement {
  return (
    <>
      <div className="field">
        <label htmlFor="issue-title">Issue title</label>
        <input
          id="issue-title"
          required
          minLength={FIELD_LIMITS.title.min}
          maxLength={FIELD_LIMITS.title.max}
          value={draft.title}
          onChange={(e) => {
            update('title', e.target.value);
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
            update('location', e.target.value);
          }}
          placeholder="e.g., Avinashi Road, Neelambur, Coimbatore"
        />
      </div>
      <SelectField
        id="issue-category"
        label="Category (optional, Gemini detects it)"
        value={draft.category}
        options={CATEGORY_OPTIONS}
        onChange={(category) => {
          update('category', category);
        }}
      />
      <DescriptionField
        value={draft.description}
        onChange={(description) => {
          update('description', description);
        }}
      />
    </>
  );
}
