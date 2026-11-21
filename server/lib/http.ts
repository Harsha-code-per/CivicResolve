import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** Every status code the API uses, named once. */
export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  unsupportedMediaType: 415,
  tooManyRequests: 429,
  internalError: 500,
} as const;

const HTML_TYPE = 'text/html; charset=utf-8';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': HTML_TYPE,
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

/**
 * Sends a structured JSON response with proper Content-Type and no-store cache headers for APIs.
 *
 * @param res - Node HTTP ServerResponse.
 * @param statusCode - HTTP status code.
 * @param payload - Serializable JSON body.
 */
export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

/**
 * Reads and parses a JSON request body while enforcing a strict maximum byte ceiling.
 *
 * @param req - Incoming HTTP request.
 * @param maxBytes - Maximum allowed payload size in bytes.
 * @returns Parsed JSON value.
 */
export async function readJsonBody(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const contentType = String(req.headers['content-type']).toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new HttpError(HTTP_STATUS.unsupportedMediaType, 'Content-Type must be application/json.');
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    // Without setEncoding, request chunks are always Buffers.
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > maxBytes) {
      throw new HttpError(
        HTTP_STATUS.payloadTooLarge,
        'Request payload exceeds maximum allowed size.',
      );
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(HTTP_STATUS.badRequest, 'Request body is not valid JSON.');
  }
}

/**
 * Resolves the client IP for rate limiting.
 *
 * Cloud Run's front end appends the real client address as the last X-Forwarded-For
 * entry; anything to its left was sent by the client and could be spoofed to dodge
 * the limiter, so only the rightmost hop is trusted.
 *
 * @param req - Incoming HTTP request.
 * @returns Client IP identifier.
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const lastHop = typeof forwarded === 'string' ? forwarded.split(',').at(-1)?.trim() : undefined;
  return lastHop ?? req.socket.remoteAddress ?? 'unknown';
}

/**
 * Sends binary content with an explicit type and cache policy.
 *
 * @param res - Node HTTP ServerResponse.
 * @param body - Bytes and headers to send.
 */
export function sendBinary(
  res: ServerResponse,
  body: { readonly bytes: Buffer; readonly contentType: string; readonly cacheControl: string },
): void {
  res.statusCode = HTTP_STATUS.ok;
  res.setHeader('Content-Type', body.contentType);
  res.setHeader('Cache-Control', body.cacheControl);
  res.end(body.bytes);
}

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE = 'no-cache';

/**
 * Reads a file, returning undefined instead of throwing when it is missing.
 *
 * @param path - Absolute file path.
 * @returns File bytes or undefined.
 */
async function tryRead(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch {
    return undefined;
  }
}

/**
 * Serves built Vite assets with path-traversal protection and an SPA fallback.
 *
 * Hashed files under /assets/ are cached for a year; everything else revalidates.
 *
 * @param staticDir - Absolute path to dist/client.
 * @param pathname - Requested URL pathname.
 * @param res - Node HTTP ServerResponse.
 * @returns True if a file was served.
 */
export async function serveStaticAsset(
  staticDir: string,
  pathname: string,
  res: ServerResponse,
): Promise<boolean> {
  const root = resolve(staticDir);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = resolve(root, relative);
  if (!candidate.startsWith(`${root}${sep}`)) return false;

  const file = await tryRead(candidate);
  if (file) {
    sendBinary(res, {
      bytes: file,
      contentType: MIME_TYPES[extname(candidate)] ?? 'application/octet-stream',
      cacheControl: pathname.startsWith('/assets/') ? IMMUTABLE_CACHE : REVALIDATE_CACHE,
    });
    return true;
  }
  return extname(relative) ? false : serveSpaShell(root, res);
}

/**
 * Serves index.html for client-side routes such as /tracker.
 *
 * @param root - Absolute static root.
 * @param res - Node HTTP ServerResponse.
 * @returns True if the shell was served.
 */
async function serveSpaShell(root: string, res: ServerResponse): Promise<boolean> {
  const indexHtml = await tryRead(resolve(root, 'index.html'));
  if (!indexHtml) return false;
  sendBinary(res, {
    bytes: indexHtml,
    contentType: HTML_TYPE,
    cacheControl: REVALIDATE_CACHE,
  });
  return true;
}
