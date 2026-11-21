import { IMAGE_DATA_URL_PATTERN } from '../../src/domain/schemas.js';

export interface DecodedImage {
  readonly mimeType: string;
  readonly base64: string;
  readonly bytes: Buffer;
}

/** 24 base64 characters decode to 18 bytes, enough to recognise every supported format. */
const SIGNATURE_BASE64_CHARS = 24;

const startsWith = (bytes: Buffer, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value);

const asciiAt = (bytes: Buffer, from: number, to: number): string =>
  bytes.subarray(from, to).toString('ascii');

/** Magic-byte checks per declared format, so a renamed script cannot pose as a photo. */
type ImageKind = 'png' | 'jpeg' | 'webp';

const SIGNATURE_CHECKS: Readonly<Record<ImageKind, (bytes: Buffer) => boolean>> = {
  png: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpeg: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  webp: (bytes) => asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 12) === 'WEBP',
};

/**
 * Validates that a base64 image data URL really contains PNG, JPEG or WebP bytes.
 *
 * @param dataUrl - Data URL string from a citizen upload.
 * @returns True when the decoded header matches the declared image type.
 */
export function hasValidImageMagicBytes(dataUrl: string): boolean {
  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
  const kind = match?.[1];
  const base64 = match?.[2];
  if (!kind || !base64) return false;
  const header = Buffer.from(base64.slice(0, SIGNATURE_BASE64_CHARS), 'base64');
  // The pattern only admits png, jpeg or webp, so a check always exists.
  return SIGNATURE_CHECKS[kind as ImageKind](header);
}

/**
 * Splits a validated data URL into its MIME type, base64 payload and raw bytes.
 *
 * @param dataUrl - Data URL string.
 * @returns Decoded image, or undefined when the string is not a supported image data URL.
 */
export function decodeImageDataUrl(dataUrl: string): DecodedImage | undefined {
  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
  const kind = match?.[1];
  const base64 = match?.[2];
  if (!kind || !base64) return undefined;
  return { mimeType: `image/${kind}`, base64, bytes: Buffer.from(base64, 'base64') };
}
