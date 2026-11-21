import { z } from 'zod';
import {
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MUNICIPAL_DEPARTMENTS,
} from './types.js';

const MAX_IMAGE_DATA_URL_LENGTH = 1_500_000;

export const createIssueSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters.').max(120),
  description: z
    .string()
    .trim()
    .min(15, 'Description must be at least 15 characters.')
    .max(2000),
  location: z.string().trim().min(3, 'Location must be at least 3 characters.').max(200),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  imageDataUrl: z
    .string()
    .max(MAX_IMAGE_DATA_URL_LENGTH, 'Image exceeds maximum allowed size.')
    .regex(
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
      'Image must be a valid PNG, JPEG, or WebP upload.',
    )
    .optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const triagePreviewSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().min(2).max(200),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  imageDataUrl: z
    .string()
    .max(MAX_IMAGE_DATA_URL_LENGTH)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});

export type TriagePreviewInput = z.infer<typeof triagePreviewSchema>;

export const adminUpdateIssueSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  department: z.enum(MUNICIPAL_DEPARTMENTS).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  note: z.string().trim().min(3, 'Audit note must be at least 3 characters.').max(400),
});

export type AdminUpdateIssueInput = z.infer<typeof adminUpdateIssueSchema>;

export const adminLoginSchema = z.object({
  passcode: z.string().min(4).max(128),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const aiTriageOutputSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  priority: z.enum(ISSUE_PRIORITIES),
  department: z.enum(MUNICIPAL_DEPARTMENTS),
  summary: z.string().trim().min(10).max(240),
  rationale: z.string().trim().min(10).max(360),
});

export type AiTriageOutput = z.infer<typeof aiTriageOutputSchema>;
