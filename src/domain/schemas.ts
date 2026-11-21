import { z } from 'zod';
import {
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MUNICIPAL_DEPARTMENTS,
} from './types.js';
import { FIELD_LIMITS } from './limits.js';

/** Client photos are downscaled to ~1024px JPEG; this cap keeps a record inside Firestore's 1 MiB limit. */
const MAX_IMAGE_DATA_URL_LENGTH = 900_000;
export const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

/**
 * Builds a trimmed string schema with friendly length messages.
 *
 * @param label - Human-readable field name used in error messages.
 * @param limits - Inclusive minimum and maximum length.
 * @returns Zod string schema.
 */
function boundedText(label: string, limits: { readonly min: number; readonly max: number }) {
  return z
    .string()
    .trim()
    .min(limits.min, `${label} must be at least ${String(limits.min)} characters.`)
    .max(limits.max, `${label} must be at most ${String(limits.max)} characters.`);
}

export const createIssueSchema = z.object({
  title: boundedText('Title', FIELD_LIMITS.title),
  description: boundedText('Description', FIELD_LIMITS.description),
  location: boundedText('Location', FIELD_LIMITS.location),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  imageDataUrl: z
    .string()
    .max(MAX_IMAGE_DATA_URL_LENGTH, 'Image exceeds maximum allowed size.')
    .regex(IMAGE_DATA_URL_PATTERN, 'Image must be a valid PNG, JPEG, or WebP upload.')
    .optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

/** A preview runs the same validation as a submission, so what Gemini sees is what gets filed. */
export type TriagePreviewInput = CreateIssueInput;

export const adminUpdateIssueSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  department: z.enum(MUNICIPAL_DEPARTMENTS).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  note: boundedText('Audit note', FIELD_LIMITS.note),
});

export type AdminUpdateIssueInput = z.infer<typeof adminUpdateIssueSchema>;

export const adminLoginSchema = z.object({
  passcode: z.string().min(FIELD_LIMITS.passcode.min).max(FIELD_LIMITS.passcode.max),
});

export const aiTriageOutputSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  priority: z.enum(ISSUE_PRIORITIES),
  department: z.enum(MUNICIPAL_DEPARTMENTS),
  summary: z.string().trim().min(10).max(240),
  rationale: z.string().trim().min(10).max(360),
});
