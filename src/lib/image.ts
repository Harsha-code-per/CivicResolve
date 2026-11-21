/** Longest edge after downscaling: plenty for Gemini and for a crew to see the damage. */
export const MAX_IMAGE_EDGE = 1280;
const JPEG_QUALITY = 0.8;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * Downscales a photo in the browser and re-encodes it as JPEG.
 *
 * Phone photos are often 4–8 MB; this keeps uploads around 150–300 KB, which is
 * faster on mobile data, cheaper for Gemini, and fits a Firestore document. Re-encoding
 * also strips EXIF metadata such as the GPS position of the citizen's home.
 *
 * @param file - Image chosen by the citizen.
 * @returns JPEG data URL no larger than MAX_IMAGE_EDGE on its longest side.
 */
export async function downscaleImage(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot process images.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
