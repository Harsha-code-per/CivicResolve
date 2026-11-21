/**
 * Field limits live once here and feed both the zod schemas and the form inputs.
 * Kept free of zod so the browser bundle does not ship the validator.
 */
export const FIELD_LIMITS = {
  title: { min: 5, max: 120 },
  description: { min: 15, max: 2000 },
  location: { min: 3, max: 200 },
  note: { min: 3, max: 400 },
  passcode: { min: 4, max: 128 },
} as const;
